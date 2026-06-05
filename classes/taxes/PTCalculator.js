const { Op } = require('sequelize');
const db = require('../../config/dbConnection');
const SalaryHelper = require('../SalaryHelper');

class PTCalculator {

    static async calculate(context) {

        const { employee, month } = context;

        if (!employee.IsPTApplicable) {
            context.taxMessages.push(
                'PT skipped: PT not applicable.'
            );
            return;
        }

        if (
            employee.PTEffectiveMonth &&
            month < employee.PTEffectiveMonth
        ) {
            context.taxMessages.push(
                `PT skipped: Effective from ${employee.PTEffectiveMonth}.`
            );
            return;
        }

        const salaryMonthDate = `${month}-01`;

        const bankSalary =
            Number(context.bankPayableSalary || 0);

        if (bankSalary <= 0) {
            context.taxMessages.push(
                'PT skipped: Bank salary is zero.'
            );
            return;
        }

        const ptMaster = await db.PTDet.findOne({
            where: {
                CompanyMstId: employee.CompanyMstId,
                FromDate: { [Op.lte]: salaryMonthDate },
                [Op.and]: [
                    {
                        [Op.or]: [
                            { ToDate: null },
                            { ToDate: { [Op.gte]: salaryMonthDate } }
                        ]
                    },
                    { FromAmt: { [Op.lte]: bankSalary } },
                    { ToAmt: { [Op.gte]: bankSalary } }
                ]
            },
            order: [
                ['FromDate', 'DESC'],
                ['Srno', 'ASC']
            ]
        });


        if (!ptMaster) {
            context.taxMessages.push(
                'PT skipped: No matching PT slab found.'
            );
            return;
        }

        const employeePT =
            Number(ptMaster.TaxRate || 0);

        context.ptApplicable = true;
        context.ptCode = ptMaster.PTCode;
        context.employeePT = SalaryHelper.roundMoney(employeePT);
        /* ---------------- PT Configuration Snapshot ---------------- */
        context.ptTaxRate = Number(ptMaster.TaxRate || 0);
        context.ptFromAmt = Number(ptMaster.FromAmt || 0);
        context.ptToAmt = Number(ptMaster.ToAmt || 0);
        
        context.taxMessages.push(`PT calculated using code ${ptMaster.PTCode}.`);
    }
}

module.exports = PTCalculator;