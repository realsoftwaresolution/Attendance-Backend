const SalaryHelper = require("../SalaryHelper");
const ESICCalculator = require("./ESICCalculator");
const PFCalculator = require("./PFCalculator");
const PTCalculator = require("./PTCalculator");

class TaxManager {
    static async calculate(context) {

        await PFCalculator.calculate(context);
        await ESICCalculator.calculate(context);
        await PTCalculator.calculate(context);

        this.applyDeductions(context);
    }

    static applyDeductions(context) {

        context.totalStatutoryDeductions =
            Number(context.employeeEPF || 0) +
            Number(context.employeeESIC || 0) +
            Number(context.employeePT || 0);

        context.bankSalaryAfterTax =
            SalaryHelper.roundMoney(
                Math.max(
                    0,
                    context.bankPayableSalary -
                    context.totalStatutoryDeductions
                )
            );
    }
}


module.exports = TaxManager;