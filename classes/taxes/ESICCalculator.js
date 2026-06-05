const { Op } = require('sequelize');
const db = require('../../config/dbConnection');
const SalaryHelper = require('../SalaryHelper');

class ESICCalculator {

    static async calculate(context) {

        const { employee, month } = context;

        /* ------------------------- ESIC Applicable ------------------------- */

        if (!employee.IsESICApplicable) {
            context.taxMessages.push(
                'ESIC skipped: ESIC not applicable for employee.'
            );
            return;
        }

        if (
            employee.ESICEffectiveMonth &&
            month < employee.ESICEffectiveMonth
        ) {
            context.taxMessages.push(
                `ESIC skipped: Effective from ${employee.ESICEffectiveMonth}.`
            );
            return;
        }

        const salaryMonthDate = `${month}-01`;

        const bankSalary =
            Number(context.bankPayableSalary || 0);

        if (bankSalary <= 0) {
            context.taxMessages.push(
                'ESIC skipped: Bank salary is zero.'
            );
            return;
        }

        /* -------------------------- Find ESIC Slab -------------------------- */

        const esicMaster = await db.ESICDet.findOne({
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

        if (!esicMaster) {
            context.taxMessages.push(
                'ESIC skipped: No matching ESIC slab found.'
            );
            return;
        }

        /* ------------------------- Wage Calculation ------------------------- */

        const esicWages = Math.min(
            bankSalary,
            Number(
                esicMaster.CutOffAmt || bankSalary
            )
        );

        /* ------------------------ Employee Portion ------------------------- */

        const employeeESIC =
            esicWages *
            (
                Number(esicMaster.EPF || 0) / 100
            );

        /* ------------------------ Employer Portion ------------------------- */

        const employerESIC =
            esicWages *
            (
                Number(esicMaster.EPS || 0) / 100
            );

        /* ------------------------- Update Context ------------------------- */

        context.esicApplicable = true;
        context.esicCode = esicMaster.ESICCode;
        context.esicWages = SalaryHelper.roundMoney(esicWages);
        context.employeeESIC = SalaryHelper.roundMoney(employeeESIC);
        context.employerESIC = SalaryHelper.roundMoney(employerESIC);
        context.taxMessages.push(`ESIC calculated using code ${esicMaster.ESICCode}.`);

        /* ---------------- ESIC Configuration Snapshot ---------------- */
        context.esicCutOffAmt = Number(esicMaster.CutOffAmt || 0);
        context.esicEmployeePercentage = Number(esicMaster.EPF || 0);
        context.esicEmployerPercentage = Number(esicMaster.EPS || 0);
        context.esicFromAmt = Number(esicMaster.FromAmt || 0);
        context.esicToAmt = Number(esicMaster.ToAmt || 0);
    }
}

module.exports = ESICCalculator;