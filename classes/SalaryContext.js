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

        this.baseSalary = Number(
            salaryRecord?.TotalSalary || 0
        );

        this.payableDays = 0;

        this.totalMinutesWorked = 0;

        this.perDaySalary = 0;

        this.perHourSalary = 0;

        this.grossSalary = 0;
    }
}

module.exports = SalaryContext;