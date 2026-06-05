const moment = require('moment-timezone');

class SalaryContext {
    constructor({
        employee,
        salaryRecord,
        setting,
        attendanceRecords,
        month
    }) {

        this.employee = employee;
        this.salaryRecord = salaryRecord;
        this.setting = setting;
        this.attendanceRecords = attendanceRecords;
        this.month = month;

        this.attendanceMap = new Map();
        for (const day of attendanceRecords) {
            const date = moment(day.attendanceDate);
            day.dateKey = date.format('YYYY-MM-DD');
            day.isSunday = date.day() === 0;
            day.prevDateKey = date.clone().subtract(1, 'day').format('YYYY-MM-DD');
            day.nextDateKey = date.clone().add(1, 'day').format('YYYY-MM-DD');
            day.isPaidSunday = undefined;
            this.attendanceMap.set(day.dateKey, day);
        }

        /* ---------------- Attendance Summary ---------------- */
        this.totalPresentDays = 0;
        this.totalHalfDays = 0;
        this.totalAbsentDays = 0;
        this.totalNormalPresentDays = 0;

        /* ---------------- Salary Configuration ---------------- */
        this.baseSalary = Number(
            salaryRecord?.TotalSalary || 0
        );

        /* ---------------- Sunday/Holiday Audit ---------------- */
        this.paidSundayCount = 0;
        this.unpaidSundayCount = 0;
        this.paidHolidayCount = 0;
        this.unpaidHolidayCount = 0;

        /* ---------------- Salary Calculation ---------------- */
        this.salaryDivisorDays = 0;
        this.salaryPayableDays = 0;
        this.salaryExpectedMinutes = 0;
        this.salaryPayableMinutes = 0;
        this.salaryPerDayRate = 0;
        this.salaryPerMinuteRate = 0;
        this.grossSalary = 0;

        /* ---------------- Salary Distribution ---------------- */

        this.cashPayableSalary = 0;
        this.bankPayableSalary = 0;

        /* ---------------- PF ---------------- */
        this.pfApplicable = false;
        this.pfCode = null;
        this.employeeAge = null;
        this.epsApplicable = false;
        this.epfWages = 0;
        this.epsWages = 0;
        this.employeeEPF = 0;
        this.employeeEPS = 0;
        this.employerEPF = 0;
        this.employerAcc02 = 0;
        this.employerAcc21 = 0;
        this.employerAcc22 = 0;
        /* ---------------- PF Configuration Snapshot ---------------- */
        this.pfCutOffAmt = 0;
        this.pfEPFPercentage = 0;
        this.pfEPSPercentage = 0;
        this.pfEmployerEPFPercentage = 0;
        this.pfEmployerAcc02Percentage = 0;
        this.pfEmployerAcc21Percentage = 0;
        this.pfEmployerAcc22Percentage = 0;
        this.pfEPSCutOffAge = 0;
        this.pfFromAmt = 0;
        this.pfToAmt = 0;

        /* ---------------- ESIC ---------------- */
        this.esicApplicable = false;
        this.esicCode = null;
        this.esicWages = 0;
        this.employeeESIC = 0;
        this.employerESIC = 0;
        /* ---------------- ESIC Configuration Snapshot ---------------- */
        this.esicCutOffAmt = 0;
        this.esicEmployeePercentage = 0;
        this.esicEmployerPercentage = 0;
        this.esicFromAmt = 0;
        this.esicToAmt = 0;

        /* ---------------- PT ---------------- */
        this.ptApplicable = false;
        this.ptCode = null;
        this.employeePT = 0;
        /* ---------------- PT Configuration Snapshot ---------------- */
        this.ptTaxRate = 0;
        this.ptFromAmt = 0;
        this.ptToAmt = 0;

        /* ---------------- Tax Summary ---------------- */
        this.totalStatutoryDeductions = 0;
        this.bankSalaryAfterTax = 0;

        /* ---------------- Advance ---------------- */
        this.totalOutstandingAdvance = 0;
        this.cashSalaryAfterAdvance = 0;

        /* ---------------- Final Salary ---------------- */
        this.netPayableSalary = 0;

        /* ---------------- Misc ---------------- */
        this.salaryCalculationMethod = null;
        this.taxMessages = [];
        this.message = null;
        this.isSkipped = false;
    }
}

module.exports = SalaryContext;