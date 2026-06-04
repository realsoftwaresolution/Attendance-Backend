const { QueryTypes } = require('sequelize');
const moment = require('moment-timezone');
const db = require('../../config/dbConnection');

async function getDailyHoursCalculation(req, res, next) {
    const { departmentId, month } = req.query;

    if (!departmentId || !month) {
        return res.status(400).json({ success: false, message: "DepartmentId and month are required." });
    }

    const start = moment(month, 'YYYY-MM').startOf('month').format('YYYY-MM-DD');
    const end = moment(month, 'YYYY-MM').endOf('month').format('YYYY-MM-DD');

    const query = `
    WITH DateSeries AS (
        SELECT CAST(:start AS DATE) AS CalendarDate
        UNION ALL
        SELECT DATEADD(day, 1, CalendarDate)
        FROM DateSeries
        WHERE CalendarDate < :end
    )
    SELECT 
        ds.CalendarDate AS attendanceDate,

        em.EmpMstId,
        em.EmpCode,
        em.EmpFullName,

        em.CompanyMstId,
        cm.CompanyName,

        em.DepartmentMstId,
        dm.Department,

        em.DesignationMstId,
        desm.Designation,

        ISNULL(das.Status, 'Absent') AS Status,
        ISNULL(das.WorkHours, '00:00') AS WorkHours,
        ISNULL(das.OTHours, '00:00') AS OTHours,
        ISNULL(das.FinalTotalHours, '00:00') AS FinalTotalHours,
        ISNULL(das.LunchBreak, '00:00') AS LunchBreak,
        ISNULL(das.WorkGapMinutes, '00:00') AS WorkGapMinutes,
        ISNULL(das.OTGapMinutes, '00:00') AS OTGapMinutes

    FROM DateSeries ds
    CROSS JOIN EmployeeMst em

    LEFT JOIN CompanyMst cm
        ON cm.CompanyMstId = em.CompanyMstId

    LEFT JOIN DepartmentMst dm
        ON dm.DepartmentMstId = em.DepartmentMstId

    LEFT JOIN DesignationMst desm
        ON desm.DesignationMstId = em.DesignationMstId

    LEFT JOIN DailyAttendanceSummary das
        ON em.EmpMstId = das.EmpMstId
        AND ds.CalendarDate = das.attendanceDate

    WHERE em.DepartmentMstId = :departmentId
      AND em.Active = 1

    ORDER BY em.EmpCode, ds.CalendarDate ASC
    OPTION (MAXRECURSION 0);
`;

    const data = await db.sequelize.query(query, {
        replacements: { departmentId, start, end },
        type: QueryTypes.SELECT
    });

    res.json({ success: true, count: data.length, data });
}

module.exports = { getDailyHoursCalculation }