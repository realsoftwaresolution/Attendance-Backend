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

        context.cashSalaryAfterAdvance =
            SalaryHelper.roundMoney(
                Number(context.cashPayableSalary || 0)
                - outstandingAdvance
            );

        context.netPayableSalary =
            SalaryHelper.roundMoney(
                Number(context.bankSalaryAfterTax || 0)
                + Number(context.cashSalaryAfterAdvance || 0)
            );
    }
}

module.exports = AdvanceManager;