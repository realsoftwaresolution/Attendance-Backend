const { QueryTypes } = require('sequelize');
const db = require('../config/dbConnection');
const SalaryHelper = require('./SalaryHelper');
const moment = require('moment-timezone');

class AdvanceManager {

    static async calculate(context) {

        const { employee } = context;

        const salaryMonthEndDate = moment(
            context.month,
            'YYYY-MM'
        ).endOf('month').format('YYYY-MM-DD');

        const [result] = await db.sequelize.query(`
    SELECT
        ISNULL(SUM(AdvanceAmount), 0) AS OutstandingAdvance
    FROM AdvanceMst
    WHERE
        EmpMstId = :EmpMstId
        AND Active = 1
        AND IsClosed = 0
        AND AdvanceDate <= :salaryMonthEndDate
`, {
            replacements: {
                EmpMstId: employee.EmpMstId,
                salaryMonthEndDate
            },
            type: QueryTypes.SELECT
        });

        const outstandingAdvance =
            Number(result?.OutstandingAdvance || 0);

        context.totalOutstandingAdvance =
            SalaryHelper.roundMoney(outstandingAdvance);

        // Default the entire advance deduction to Cash to preserve existing functionality.
        // The user can override these split values on the frontend before saving.
        context.advanceDeductionCash = SalaryHelper.roundMoney(outstandingAdvance);
        context.advanceDeductionBank = 0;

        context.cashSalaryAfterAdvance =
            SalaryHelper.roundMoney(
                Number(context.cashPayableSalary || 0)
                - context.advanceDeductionCash
            );
    }
}

module.exports = AdvanceManager;