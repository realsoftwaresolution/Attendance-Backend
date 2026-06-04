const { Op, QueryTypes } = require('sequelize');
const moment = require('moment-timezone');
const db = require('../../config/dbConnection');

async function getMonthlySalaryReport(req, res, next) {
    const { departmentId, companyMstId: companyId, month } = req.query;

    if (!departmentId || !companyId || !month) {
        return res.status(400).json({ success: false, message: "Missing required fields." });
    }

    const start = moment(month, 'YYYY-MM').startOf('month').format('YYYY-MM-DD');
    const end = moment(month, 'YYYY-MM').endOf('month').format('YYYY-MM-DD');

    const totalDaysInMonth = moment(month, 'YYYY-MM').daysInMonth();

    // 1. Get all employees for this dept/company
    const query = `
        SELECT 
            em.*,
            dm.Department,
            cm.CompanyName,
            ds.Designation
        FROM EmployeeMst em
        LEFT JOIN DepartmentMst dm ON em.DepartmentMstId = dm.DepartmentMstId
        LEFT JOIN CompanyMst cm ON em.CompanyMstId = cm.CompanyMstId
        LEFT JOIN DesignationMst ds ON em.DesignationMstId = ds.DesignationMstId
        WHERE em.DepartmentMstId = :departmentId 
          AND em.CompanyMstId = :companyId 
          AND em.Active = 1
        ORDER BY em.SortId ASC;
    `;

    const employees = await db.sequelize.query(query, {
        replacements: { departmentId, companyId },
        type: QueryTypes.SELECT
    });


    const holidayCount = await db.HolidayMst.count({
        where: {
            Date: {
                [Op.between]: [start, end]
            },
            Active: true
        }
    });

    const workingDays = totalDaysInMonth - holidayCount;

    // 2. Get summaries for the month
    const summaries = await db.DailyAttendanceSummary.findAll({
        where: {
            EmpMstId: { [Op.in]: employees.map(e => e.EmpMstId) },
            attendanceDate: { [Op.between]: [start, end] }
        }
    });

    // 3. Process aggregation
    const report = employees.map(emp => {

        const {
            BiometricVectorFront,
            BiometricVectorLeft,
            BiometricVectorRight,
            ProfileImage,
            DocumentPaths,
            createdAt,
            updatedAt,
            PcID, Sflag, LogID, Active,
            ...empData
        } = emp;

        const empSummaries = summaries.filter(s => s.EmpMstId === emp.EmpMstId);

        const presentDays = empSummaries.filter(s => s.Status === 'Present').length;
        const absentDays = empSummaries.filter(s => s.Status === 'Absent').length;
        const halfDays = empSummaries.filter(s => s.Status === 'Half Day').length;
        const lateDays = empSummaries.filter(s => s.Status === 'Late').length;
        const holidays = empSummaries.filter(s => s.IsHoliday === true).length;

        const totalOTSalary = empSummaries.reduce((sum, s) => sum + parseFloat(s.DailyOTEarned || 0), 0);
        const totalWagesEarned = empSummaries.reduce((sum, s) => sum + parseFloat(s.FinalDailyWagesEarned || 0), 0);

        const finalTotalHours = empSummaries.reduce(
            (sum, s) => sum + Number(s.FinalTotalHours || 0),
            0
        );

        const averageBaseSalary =
            empSummaries.length > 0
                ? empSummaries.reduce(
                    (sum, s) => sum + Number(s.BaseMonthlySalary || 0),
                    0
                ) / empSummaries.length
                : 0;

        return {
            ...empData,
            Stats: {
                presentDays,
                absentDays,
                halfDays,
                lateDays,
                holidays,
                workingDays,
                finalTotalHours
            },
            Financials: {
                averageBaseSalary: averageBaseSalary.toFixed(2),
                totalOTSalary: totalOTSalary.toFixed(2),
                netPayableSalary: totalWagesEarned.toFixed(2)
            }
        };
    });

    res.json({ success: true, month, data: report });
}

module.exports = { getMonthlySalaryReport };