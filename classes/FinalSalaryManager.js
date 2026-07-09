const SalaryHelper = require("./SalaryHelper");

class FinalSalaryManager {

    static calculate(context) {

        context.netPayableSalary =
            SalaryHelper.roundMoney(
                Number(context.bankSalaryAfterTax || 0)
                +
                Number(context.cashSalaryAfterLoan || 0)
            );
    }
}

module.exports = FinalSalaryManager;