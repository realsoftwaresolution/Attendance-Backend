const { Op } = require("sequelize");
const AttendanceEngine = require("../classes/AttendanceEngine");
const { AppError } = require("../utils/AppError");
const db = require("../config/dbConnection");
const { generateDailyAttendanceData } = require("./hoursCalculation.service");

async function generateAndSaveDailyAttendanceSummary(filters) {
    const { dailyRecords } = await generateDailyAttendanceData(filters);
    return saveDailyAttendanceSummary(dailyRecords);
}

async function saveDailyAttendanceSummary(records) {
    if (!records || records.length === 0) return { success: true, savedCount: 0, records: [] };

    const empMstIds = new Set();
    let minDate = records[0].Date;
    let maxDate = records[0].Date;

    const mappedRecords = records.map(r => {
        empMstIds.add(r.EmpMstId);
        if (r.Date < minDate) minDate = r.Date;
        if (r.Date > maxDate) maxDate = r.Date;
        return { ...r, attendanceDate: r.Date };
    });

    const t = await db.sequelize.transaction();
    try {
        // 1. Wipe old records for these employees in this exact date range
        await db.DailyAttendanceSummary.destroy({
            where: {
                EmpMstId: { [Op.in]: Array.from(empMstIds) },
                attendanceDate: { [Op.between]: [minDate, maxDate] }
            },
            transaction: t
        });

        // 2. Insert fresh records in safe chunks to avoid MSSQL 2100 parameter limits
        const CHUNK_SIZE = 50;
        for (let i = 0; i < mappedRecords.length; i += CHUNK_SIZE) {
            const chunk = mappedRecords.slice(i, i + CHUNK_SIZE);
            await db.DailyAttendanceSummary.bulkCreate(chunk, { transaction: t });
        }

        await t.commit();
        return { success: true, savedCount: mappedRecords.length, records };
    } catch (error) {
        await t.rollback();
        console.error("BULK SYNC ERROR:", error.name, error.message);
        throw new AppError("Failed to sync attendance records: " + error.message, 400);
    }
}

module.exports = { generateAndSaveDailyAttendanceSummary };