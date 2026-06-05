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
    const employees = await db.sequelize.query(`
    SELECT
        E.*,
        C.CompanyName,
        D.Department,
        DG.Designation
    FROM EmployeeMst E
    LEFT JOIN CompanyMst C ON C.CompanyMstId = E.CompanyMstId
    LEFT JOIN DepartmentMst D ON D.DepartmentMstId = E.DepartmentMstId
    LEFT JOIN DesignationMst DG ON DG.DesignationMstId = E.DesignationMstId
    WHERE E.DepartmentMstId = :departmentId
        AND E.Active = 1
`, {
        replacements: { departmentId },
        type: db.sequelize.QueryTypes.SELECT
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
    const results = await Promise.all(
        employees.map(async employee => {
            const salaryRecord = salaryMap.get(employee.EmpMstId);
            const employeeAttendance = attendanceMap[employee.EmpMstId] || [];

            if (!salaryRecord) {
                return null
            }

            const context = await calculator.calculate({
                employee,
                setting,
                salaryRecord,
                attendanceRecords: employeeAttendance,
                month
            });

            if (context.isSkipped) {
                return null
            }

            return {
                ...employee,
                SalaryType: salaryRecord.SalaryType,
                SalaryMonth: month,
                BaseSalary: context.baseSalary,
                /* ---------------- Attendance Summary ---------------- */
                TotalPresentDays: context.totalPresentDays,
                TotalNormalPresentDays: context.totalNormalPresentDays,
                TotalHalfDays: context.totalHalfDays,
                TotalAbsentDays: context.totalAbsentDays,
                /* ---------------- Holiday / Sunday Audit ---------------- */
                PaidHolidayCount: context.paidHolidayCount,
                UnpaidHolidayCount: context.unpaidHolidayCount,
                PaidSundayCount: context.paidSundayCount,
                UnpaidSundayCount: context.unpaidSundayCount,
                /* ---------------- Salary Calculation ---------------- */
                SalaryDivisorDays: context.salaryDivisorDays,
                SalaryPayableDays: context.salaryPayableDays,
                SalaryExpectedMinutes: context.salaryExpectedMinutes,
                SalaryPayableMinutes: context.salaryPayableMinutes,
                SalaryPerDayRate: context.salaryPerDayRate,
                SalaryPerMinuteRate: context.salaryPerMinuteRate,
                GrossSalary: context.grossSalary,
                /* ---------------- Salary Distribution ---------------- */
                BankPayableSalary: context.bankPayableSalary,
                CashPayableSalary: context.cashPayableSalary,
                /* ---------------- PF Details ---------------- */
                PFApplicable: context.pfApplicable,
                PFCode: context.pfCode,
                EmployeeAge: context.employeeAge,
                EPSApplicable: context.epsApplicable,
                EPFWages: context.epfWages,
                EPSWages: context.epsWages,
                EmployeeEPF: context.employeeEPF,
                EmployeeEPS: context.employeeEPS,
                EmployerEPF: context.employerEPF,
                EmployerAcc02: context.employerAcc02,
                EmployerAcc21: context.employerAcc21,
                EmployerAcc22: context.employerAcc22,
                /* ---------------- PF Configuration ---------------- */
                PFCutOffAmt: context.pfCutOffAmt,
                PFEPFPercentage: context.pfEPFPercentage,
                PFEPSPercentage: context.pfEPSPercentage,
                PFEmployerEPFPercentage: context.pfEmployerEPFPercentage,
                PFEmployerAcc02Percentage: context.pfEmployerAcc02Percentage,
                PFEmployerAcc21Percentage: context.pfEmployerAcc21Percentage,
                PFEmployerAcc22Percentage: context.pfEmployerAcc22Percentage,
                PFEPSCutOffAge: context.pfEPSCutOffAge,
                PFFromAmt: context.pfFromAmt,
                PFToAmt: context.pfToAmt,
                /* ---------------- ESIC Details ---------------- */
                ESICApplicable: context.esicApplicable,
                ESICCode: context.esicCode,
                ESICWages: context.esicWages,
                EmployeeESIC: context.employeeESIC,
                EmployerESIC: context.employerESIC,
                /* ---------------- ESIC Configuration ---------------- */
                ESICCutOffAmt: context.esicCutOffAmt,
                ESICEmployeePercentage: context.esicEmployeePercentage,
                ESICEmployerPercentage: context.esicEmployerPercentage,
                ESICFromAmt: context.esicFromAmt,
                ESICToAmt: context.esicToAmt,
                /* ---------------- PT Details ---------------- */
                PTApplicable: context.ptApplicable,
                PTCode: context.ptCode,
                EmployeePT: context.employeePT,
                /* ---------------- PT Configuration ---------------- */
                PTTaxRate: context.ptTaxRate,
                PTFromAmt: context.ptFromAmt,
                PTToAmt: context.ptToAmt,
                /* ---------------- Tax Summary ---------------- */
                TotalStatutoryDeductions:
                    context.totalStatutoryDeductions,
                BankSalaryAfterTax:
                    context.bankSalaryAfterTax,
                /* ---------------- advanced deduction ---------------- */
                TotalOutstandingAdvance: context.totalOutstandingAdvance,
                CashSalaryAfterAdvance: context.cashSalaryAfterAdvance,
                /* ---------------- final salary ---------------- */
                NetPayableSalary: context.netPayableSalary,

                SalaryCalculationMethod: context.salaryCalculationMethod,
                Message: context.message,
                TaxMessages: context.taxMessages
            };
        }));

    const filteredResults = results.filter(Boolean);

    return {
        month,
        departmentId,
        totalEmployees: employees.length,
        calculatedEmployees: results.length,
        data: filteredResults
    };
}

module.exports = { calculateDepartmentSalary };