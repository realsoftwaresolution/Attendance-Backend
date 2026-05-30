const { Op } = require("sequelize");
const AttendanceEngine = require("../classes/AttendanceEngine");
const { AppError } = require("../utils/AppError");
const db = require("../config/dbConnection");
const { generateDailyAttendanceData } = require("./hoursCalculation.service");

async function payRollCalAndSaveSummary({ month, departmentId, date }) {
    const { employees, dailyRecords } = await generateDailyAttendanceData({ month, departmentId, date });
    const enrichedRecords = [];

    for (const record of dailyRecords) {

        const salaryRecord = await db.EmployeeSalaryHistory.findOne({
            where: {
                EmpMstId: record.EmpMstId,
                FromDate: { [Op.lte]: record.Date },
                [Op.or]: [
                    { ToDate: { [Op.gte]: record.Date } },
                    { ToDate: null }
                ],
                Active: true
            }
        });

        const baseMonthlySalary = salaryRecord ? parseFloat(salaryRecord.SalaryAmount) : 0;
        const monthlyTargetHours = record.MonthlyTargetHours || 0;
        const monthlyTargetMinutes = monthlyTargetHours * 60;

        // 2. Financial Calculations
        const hourlyWageRate = monthlyTargetHours > 0 ? (baseMonthlySalary / monthlyTargetHours) : 0;
        const perMinuteWageRate = monthlyTargetMinutes > 0 ? (baseMonthlySalary / monthlyTargetMinutes) : 0;

        const finalTotalMinutes = AttendanceEngine.parseHHMMToMinutes(record.FinalTotalHours);
        const otMinutes = AttendanceEngine.parseHHMMToMinutes(record.OTHours);
        const otGapMinutes = AttendanceEngine.parseHHMMToMinutes(record.OTGapMinutes || "00:00");

        // Calculate earnings
        const FinalDailyWagesEarned = finalTotalMinutes * perMinuteWageRate;

        // Ensure OT doesn't go negative if gaps > actual OT
        const netOTMinutes = Math.max(0, otMinutes - otGapMinutes);
        const OnlyDailyOTEarned = netOTMinutes * perMinuteWageRate;

        enrichedRecords.push({
            ...record,
            BaseMonthlySalary: parseFloat(baseMonthlySalary.toFixed(2)),
            HourlyWageRate: parseFloat(hourlyWageRate.toFixed(4)),
            PerMinuteWageRate: parseFloat(perMinuteWageRate.toFixed(4)),
            FinalDailyWagesEarned: parseFloat(FinalDailyWagesEarned.toFixed(2)),
            OnlyDailyOTEarned: parseFloat(OnlyDailyOTEarned.toFixed(2))
        });

    }

    const result = await saveDailyAttendanceSummary(enrichedRecords)
    return result
}

async function saveDailyAttendanceSummary(enrichedRecords) {
    const CHUNK_SIZE = 50;
    const chunks = Array.from({ length: Math.ceil(enrichedRecords.length / CHUNK_SIZE) }, (_, i) =>
        enrichedRecords.slice(i * CHUNK_SIZE, i * CHUNK_SIZE + CHUNK_SIZE)
    );

    await Promise.all(chunks.map(async (chunk) => {
        const t = await db.sequelize.transaction();
        try {
            for (const record of chunk) {
                await db.DailyAttendanceSummary.upsert({
                    EmpMstId: record.EmpMstId,
                    EmpCode: record.EmpCode,
                    attendanceDate: record.Date,
                    ShiftEntryMstId: record.ShiftEntryMstId,
                    Status: record.Status,
                    WorkHours: record.WorkHours,
                    OTHours: record.OTHours,
                    LunchBreak: record.LunchBreak,
                    FinalTotalHours: record.FinalTotalHours,
                    OriginalWorkingHours: record.OriginalWorkingHours,
                    OriginalOTHours: record.OriginalOTHours,
                    BaseMonthlySalary: record.BaseMonthlySalary,
                    HourlyWageRate: record.HourlyWageRate,
                    PerMinuteWageRate: record.PerMinuteWageRate,
                    FinalDailyWagesEarned: record.FinalDailyWagesEarned,
                    DailyOTEarned: record.OnlyDailyOTEarned,
                    WorkGapMinutes: record.WorkGapMinutes,
                    OTGapMinutes: record.OTGapMinutes,
                    IsHoliday: record.IsHoliday,
                    HolidayName: record.HolidayName
                }, {
                    transaction: t,
                    conflictFields: ['EmpMstId', 'attendanceDate']
                });
            }
            await t.commit();
        } catch (error) {
            await t.rollback();
            throw error;
        }
    }));

    return { success: true, savedCount: enrichedRecords.length };
}

module.exports = { payRollCalAndSaveSummary };