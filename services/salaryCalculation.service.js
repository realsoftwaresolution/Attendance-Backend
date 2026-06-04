const { Op } = require('sequelize');
const db = require('../config/dbConnection');
const SalaryCalculator = require('../classes/SalaryCalculator');
const moment = require('moment');
const { generateAndSaveDailyAttendanceSummary } = require('./dailyAttendanceSummary.service');

async function calculateDepartmentSalary({ month, departmentId }) {
    if (!month) throw new Error('Month is required. Format: YYYY-MM');
    if (!departmentId) throw new Error('DepartmentId is required.');

    /* -------------------- Refresh attendance summary first -------------------- */
    await generateAndSaveDailyAttendanceSummary({
        month,
        departmentId
    });

    const startDate = moment(month, 'YYYY-MM')
        .startOf('month')
        .format('YYYY-MM-DD');

    const endDate = moment(month, 'YYYY-MM')
        .endOf('month')
        .format('YYYY-MM-DD');

    // 1. Fetch Department Settings
    const [setting] = await db.sequelize.query(`
    SELECT TOP 1
        M.*,
        CAST(H.Hours AS DECIMAL(10,2)) AS PerDayHours
    FROM MasterSettingMst M
    LEFT JOIN HoursCategoryMst H
        ON M.HoursCategoryMstId = H.HoursCategoryMstId
    WHERE M.DepartmentMstId = :departmentId
      AND M.Active = 1
    ORDER BY M.SettingMstId DESC
`, {
        replacements: { departmentId },
        type: db.sequelize.QueryTypes.SELECT
    });



    if (!setting) {
        throw new Error(`No master setting found for department ${departmentId}`);
    }

    // 2. Fetch all active employees in department
    const employees = await db.EmployeeMst.findAll({
        where: { DepartmentMstId: departmentId, Active: true }
    });

    if (employees.length === 0) return { month, departmentId, data: [] };

    const empIds = employees.map(e => e.EmpMstId);

    // 3. BULK FETCH: Get salary history and attendance in two queries instead of N queries
    const [salaryRecords, attendanceRecords] = await Promise.all([
        db.EmployeeSalaryHistory.findAll({
            where: {
                EmpMstId: {
                    [Op.in]: empIds
                },
                EffectiveMonth: {
                    [Op.lte]: month
                }
            },
            order: [
                ['EmpMstId', 'ASC'],
                ['EffectiveMonth', 'DESC']
            ]
        }),
        db.DailyAttendanceSummary.findAll({
            where: {
                EmpMstId: { [Op.in]: empIds },
                attendanceDate: { [Op.between]: [startDate, endDate] }
            }
        })
    ]);

    // 4. Create Maps for O(1) lookup
    const salaryMap = salaryRecords.reduce((map, salary) => {
        if (!map.has(salary.EmpMstId)) {
            map.set(salary.EmpMstId, salary);
        }
        return map;
    }, new Map());
    const attendanceMap = attendanceRecords.reduce((acc, record) => {
        if (!acc[record.EmpMstId]) acc[record.EmpMstId] = [];
        acc[record.EmpMstId].push(record);
        return acc;
    }, {});


    // 5. Calculate
    const calculator = new SalaryCalculator();
    const results = employees.map(employee => {
        const salaryRecord = salaryMap.get(employee.EmpMstId);
        const employeeAttendance = attendanceMap[employee.EmpMstId] || [];

        if (!salaryRecord) {
            return {
                EmpMstId: employee.EmpMstId,
                EmpCode: employee.EmpCode,
                EmpFullName: employee.EmpFullName,
                error: `No salary configured for ${month}`
            };
        }

        const context = calculator.calculate({
            employee,
            setting,
            salaryRecord,
            attendanceRecords: employeeAttendance,
            month
        });

        if (context.isSkipped) {
            return {
                EmpMstId: employee.EmpMstId,
                EmpCode: employee.EmpCode,
                EmpFullName: employee.EmpFullName,
                SalaryType: salaryRecord.SalaryType,
                message: context.message
            };
        }

        return {
            EmpMstId: employee.EmpMstId,
            EmpCode: employee.EmpCode,
            EmpFullName: employee.EmpFullName,
            SalaryType: salaryRecord.SalaryType,
            BaseSalary: context.baseSalary,
            DivisorDays: context.divisorDays,
            PayableDays: context.payableDays,
            TotalMinutesWorked: context.totalMinutesWorked,
            PerDaySalary: context.perDaySalary,
            PerMinuteRate: context.perMinuteRate,
            GrossSalary: context.grossSalary
        };
    });

    return {
        month,
        departmentId,
        totalEmployees: employees.length,
        calculatedEmployees: results.length,
        data: results
    };
}

module.exports = { calculateDepartmentSalary };