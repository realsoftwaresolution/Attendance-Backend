const { QueryTypes } = require('sequelize');
const db = require('../config/dbConnection');
const SalaryHelper = require('./SalaryHelper');
const moment = require('moment-timezone');

class LoanManager {

    static async calculate(context) {

        const { employee } = context;

        const salaryMonthEndDate = moment(
            context.month,
            'YYYY-MM'
        ).endOf('month').format('YYYY-MM-DD');

        const [result] = await db.sequelize.query(`
    SELECT
        ISNULL(SUM(DeductFromBank), 0) AS LoanDeductionBank,
        ISNULL(SUM(DeductFromCash), 0) AS LoanDeductionCash
    FROM LoanMst
    WHERE
        EmpMstId = :EmpMstId
        AND Active = 1
        AND IsClosed = 0
        AND StartingDate <= :salaryMonthEndDate
`, {
            replacements: {
                EmpMstId: employee.EmpMstId,
                salaryMonthEndDate
            },
            type: QueryTypes.SELECT
        });

        const loanDeductionBank = Number(result?.LoanDeductionBank || 0);
        const loanDeductionCash = Number(result?.LoanDeductionCash || 0);

        context.loanDeductionBank = SalaryHelper.roundMoney(loanDeductionBank);
        context.loanDeductionCash = SalaryHelper.roundMoney(loanDeductionCash);

        context.bankSalaryAfterLoan = SalaryHelper.roundMoney(
            Number(context.bankPayableSalary || 0) - loanDeductionBank
        );

        context.cashSalaryAfterLoan = SalaryHelper.roundMoney(
            Number(context.cashSalaryAfterAdvance || 0) - loanDeductionCash
        );
    }
}

module.exports = LoanManager;
