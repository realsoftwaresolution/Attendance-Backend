const { Op, Sequelize } = require("sequelize");
const db = require("../config/dbConnection");
const moment = require("moment");

exports.getDailyMetrics = async (req, res, next) => {
    try {
        const { CompanyMstId, DepartmentMstId } = req.query;

        // Base filters for EmployeeMst
        const empFilters = {};
        if (CompanyMstId) empFilters.CompanyMstId = CompanyMstId;
        if (DepartmentMstId) empFilters.DepartmentMstId = DepartmentMstId;

        // 1. Get Employee Stats
        const totalActive = await db.EmployeeMst.count({
            where: { ...empFilters, Active: true }
        });

        const deactive = await db.EmployeeMst.count({
            where: { ...empFilters, Active: false }
        });

        // 2. Get Present & Selfie Punches from PunchLogs for Today
        const today = moment().format("YYYY-MM-DD");
        const startOfDay = moment().startOf('day').toDate();
        const endOfDay = moment().endOf('day').toDate();

        let presentQuery = `
            SELECT COUNT(DISTINCT pl.EmpCode) as count
            FROM PunchLogs pl
        `;
        let selfieQuery = `
            SELECT COUNT(DISTINCT pl.EmpCode) as count
            FROM PunchLogs pl
        `;
        
        const conditions = [`pl.punchTime >= :startOfDay`, `pl.punchTime <= :endOfDay`];
        const replacements = { startOfDay, endOfDay };

        if (CompanyMstId || DepartmentMstId) {
            presentQuery += ` INNER JOIN EmployeeMst e ON pl.EmpCode = e.EmpCode `;
            selfieQuery += ` INNER JOIN EmployeeMst e ON pl.EmpCode = e.EmpCode `;
            if (CompanyMstId) {
                conditions.push(`e.CompanyMstId = :CompanyMstId`);
                replacements.CompanyMstId = CompanyMstId;
            }
            if (DepartmentMstId) {
                conditions.push(`e.DepartmentMstId = :DepartmentMstId`);
                replacements.DepartmentMstId = DepartmentMstId;
            }
        }

        presentQuery += ` WHERE ${conditions.join(' AND ')}`;
        
        // Add FACE_BIOMETRIC condition for selfie query
        const selfieConditions = [...conditions, `pl.punchSource = 'FACE_BIOMETRIC'`];
        selfieQuery += ` WHERE ${selfieConditions.join(' AND ')}`;

        const [presentResult] = await db.sequelize.query(presentQuery, { replacements, type: Sequelize.QueryTypes.SELECT });
        const [selfieResult] = await db.sequelize.query(selfieQuery, { replacements, type: Sequelize.QueryTypes.SELECT });

        const present = presentResult ? parseInt(presentResult.count || 0) : 0;
        const selfiePunch = selfieResult ? parseInt(selfieResult.count || 0) : 0;

        // Approximations for Option B
        const absent = Math.max(0, totalActive - present);
        const late = 0; // Cannot calculate live without shift logic
        const leave = 0;
        const weekOff = 0;

        // Percentages
        const safeActive = totalActive > 0 ? totalActive : 1; // Prevent division by zero
        const presentPercentage = ((present / safeActive) * 100).toFixed(2);
        const absentPercentage = ((absent / safeActive) * 100).toFixed(2);
        const latePercentage = "0.00";

        return res.status(200).json({
            success: true,
            data: {
                activeStaff: totalActive,
                presentStaff: present,
                lateArrive: late,
                absentEmp: absent,
                deactiveEmp: deactive,
                weekOffEmp: weekOff,
                selfiePunch: selfiePunch,
                leaveEmp: leave,
                percentages: {
                    present: parseFloat(presentPercentage),
                    late: parseFloat(latePercentage),
                    absent: parseFloat(absentPercentage)
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

exports.getMonthlyTrends = async (req, res, next) => {
    try {
        const { month, CompanyMstId, DepartmentMstId } = req.query; // YYYY-MM
        const statusFilter = req.query.statusFilter || 'Present'; // Present, Absent, Late

        if (!month) {
            return res.status(400).json({ success: false, message: "Month parameter (YYYY-MM) is required." });
        }

        const startDate = moment(month, "YYYY-MM").startOf('month').format("YYYY-MM-DD");
        const endDate = moment(month, "YYYY-MM").endOf('month').format("YYYY-MM-DD");

        let query = `
            SELECT 
                d.attendanceDate as date,
                COUNT(d.SummaryId) as count
            FROM DailyAttendanceSummary d
        `;

        const conditions = [`d.attendanceDate >= :startDate`, `d.attendanceDate <= :endDate`];
        const replacements = { startDate, endDate };

        if (statusFilter === 'Late') {
            conditions.push(`d.Status IN ('Late In', 'Late & Early Out')`);
        } else if (statusFilter === 'Present') {
            conditions.push(`d.Status IN ('Present', 'Late In', 'Early Out', 'Late & Early Out', 'Half Day')`);
        } else {
            conditions.push(`d.Status = :statusFilter`);
            replacements.statusFilter = statusFilter;
        }

        if (CompanyMstId || DepartmentMstId) {
            query += ` INNER JOIN EmployeeMst e ON d.EmpMstId = e.EmpMstId `;
            if (CompanyMstId) {
                conditions.push(`e.CompanyMstId = :CompanyMstId`);
                replacements.CompanyMstId = CompanyMstId;
            }
            if (DepartmentMstId) {
                conditions.push(`e.DepartmentMstId = :DepartmentMstId`);
                replacements.DepartmentMstId = DepartmentMstId;
            }
        }

        query += ` WHERE ${conditions.join(' AND ')} GROUP BY d.attendanceDate ORDER BY d.attendanceDate ASC`;

        const results = await db.sequelize.query(query, { replacements, type: Sequelize.QueryTypes.SELECT });

        // Fill missing days with 0
        const daysInMonth = moment(month, "YYYY-MM").daysInMonth();
        const trendData = [];
        const resultDict = {};
        
        results.forEach(r => {
            resultDict[r.date] = parseInt(r.count);
        });

        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = moment(month, "YYYY-MM").date(i).format("YYYY-MM-DD");
            trendData.push({
                date: dateStr,
                count: resultDict[dateStr] || 0
            });
        }

        return res.status(200).json({
            success: true,
            data: trendData
        });
    } catch (error) {
        next(error);
    }
};


// --- Helper Functions ---
const timeToMins = (t) => {
    if (!t) return 0;
    const parts = t.split(':');
    if (parts.length !== 2) return 0;
    return (parseInt(parts[0], 10) * 60) + parseInt(parts[1], 10);
};

const minsToTime = (m) => {
    const isNegative = m < 0;
    m = Math.abs(m);
    const hrs = Math.floor(m / 60).toString().padStart(2, '0');
    const mins = (m % 60).toString().padStart(2, '0');
    return `${isNegative ? '-' : ''}${hrs}:${mins}`;
};

exports.getEmployeeDashboard = async (req, res, next) => {
    try {
        if (req.user.UserType !== 'Employee') {
            return res.status(403).json({ success: false, message: "Access denied. Only Employees can access this dashboard." });
        }

        const empMstId = req.user.EmpMstId;
        const monthFilter = req.query.Month || moment().format("YYYY-MM"); 

        const startOfMonth = moment(monthFilter, "YYYY-MM").startOf("month").format("YYYY-MM-DD");
        const endOfMonth = moment(monthFilter, "YYYY-MM").endOf("month").format("YYYY-MM-DD");

        // 1. Fetch Daily Summary Data for the given month
        const summaryRecords = await db.DailyAttendanceSummary.findAll({
            where: {
                EmpMstId: empMstId,
                attendanceDate: {
                    [Op.between]: [startOfMonth, endOfMonth]
                }
            }
        });

        let totalWorkedMins = 0;
        let totalOvertimeMins = 0;
        let daysPresentCount = 0;

        summaryRecords.forEach(record => {
            // Worked Hours: FinalTotalHours - OTHours + OTGapMinutes
            const finalMins = timeToMins(record.FinalTotalHours);
            const otMins = timeToMins(record.OTHours);
            const otGapMins = timeToMins(record.OTGapMinutes);

            totalWorkedMins += (finalMins - otMins + otGapMins);

            // Overtime Hours: OTHours - OTGapMinutes (with floor of 0)
            const calculatedOtMins = Math.max(0, otMins - otGapMins);
            totalOvertimeMins += calculatedOtMins;

            // Day Present Count: exclude Absent and Invalid Logs
            if (record.Status && record.Status !== "Absent" && record.Status !== "Invalid Logs" && record.Status !== "Invalid Log") {
                daysPresentCount++;
            }
        });

        // 2. Fetch Net Salary
        let netSalary = 0;
        const salaryRecord = await db.SalaryDet.findOne({
            where: {
                EmpMstId: empMstId,
                SalaryMonth: monthFilter
            }
        });

        if (salaryRecord) {
            netSalary = parseFloat(salaryRecord.NetPayableSalary) || 0;
        }

        res.status(200).json({
            success: true,
            data: {
                Month: monthFilter,
                WorkedHours: minsToTime(totalWorkedMins),
                OvertimeHours: minsToTime(totalOvertimeMins),
                DaysPresent: daysPresentCount,
                NetSalary: netSalary
            }
        });
    } catch (error) {
        next(error);
    }
};
