const FixedSalaryCalculator = require("./FixedSalaryCalculator");
const SalaryContext = require("./SalaryContext");

class SalaryCalculator {

    calculate({
        employee,
        setting,
        salaryRecord,
        attendanceRecords,
        month
    }) {

        const context = new SalaryContext({
            employee,
            setting,
            salaryRecord,
            attendanceRecords,
            month
        });

        switch (salaryRecord?.SalaryType) {

            case 'Fixed':
                new FixedSalaryCalculator().calculate(context);
                break;

            case 'Working':
                context.message =
                    'Working salary calculation not implemented yet.';
                context.isSkipped = true;
                return context;

            default:
                throw new Error(
                    `Unsupported Salary Type: ${salaryRecord?.SalaryType}`
                );
        }

        return context;
    }
}

module.exports = SalaryCalculator;