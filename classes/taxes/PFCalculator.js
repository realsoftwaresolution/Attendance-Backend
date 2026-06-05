const moment = require('moment-timezone');
const { Op } = require('sequelize');
const SalaryHelper = require('../SalaryHelper');
const db = require('../../config/dbConnection');

class PFCalculator {

    static async calculate(context) {

        const { employee, month } = context;

        /* ---------------------------- PF Applicable ---------------------------- */

        if (!employee.IsPFApplicable) {
            context.taxMessages.push(
                'PF skipped: PF not applicable for employee.'
            );
            return;
        }

        if (
            employee.PFEffectiveMonth &&
            month < employee.PFEffectiveMonth
        ) {
            context.taxMessages.push(
                `PF skipped: Effective from ${employee.PFEffectiveMonth}.`
            );
            return;
        }

        const salaryMonthDate = `${month}-01`;

        const bankSalary = Number(context.bankPayableSalary || 0);

        if (bankSalary <= 0) {
            context.taxMessages.push(
                'PF skipped: Bank salary is zero.'
            );
            return;
        }

        /* ----------------------------- Find PF Slab ----------------------------- */
        const pfMaster = await db.PFDet.findOne({
            where: {
                CompanyMstId: employee.CompanyMstId,
                FromDate: { [Op.lte]: salaryMonthDate },
                [Op.and]: [
                    {
                        [Op.or]: [
                            { ToDate: { [Op.gte]: salaryMonthDate } },
                            { ToDate: null }
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

        if (!pfMaster) {
            context.taxMessages.push(
                'PF skipped: No matching PF slab found.'
            );
            return;
        }

        /* ---------------------------- Employee Age ---------------------------- */

        let employeeAge = null;

        if (employee.DateOfBirth) {

            employeeAge = moment(salaryMonthDate)
                .startOf('month')
                .diff(moment(employee.DateOfBirth), 'years');
        }

        const epsApplicable =
            employee.IsEPSApplicable &&
            employeeAge !== null &&
            employeeAge <
            Number(pfMaster.EPSCutOffAge || 999);

        /* ---------------------------- Wage Amounts ---------------------------- */

        const epfWages = Math.min(
            bankSalary,
            Number(
                pfMaster.CutOffAmt || bankSalary
            )
        );

        const epsWages = bankSalary;



        /* -------------------------- Employee Portion -------------------------- */

        const employeeEPF =
            epfWages * (Number(pfMaster.EPF || 0) / 100);

        const employeeEPS =
            epsApplicable
                ? (epsWages * (Number(pfMaster.EPS || 0) / 100))
                : 0;

        /* -------------------------- Employer Portion -------------------------- */

        const employerEPF =
            epfWages * (Number(pfMaster.EPFAB || 0) / 100);

        const employerAcc02 =
            epfWages *
            (
                Number(pfMaster.Acc02 || 0) / 100
            );

        const employerAcc21 =
            epfWages *
            (
                Number(pfMaster.Acc21 || 0) / 100
            );

        const employerAcc22 =
            epfWages *
            (
                Number(pfMaster.Acc22 || 0) / 100
            );

        /* ---------------------------- Update Context ---------------------------- */

        context.pfApplicable = true;

        context.pfCode = pfMaster.PFCode;
        context.employeeAge = employeeAge;
        context.epsApplicable = epsApplicable;

        context.epfWages = SalaryHelper.roundMoney(epfWages);
        context.epsWages = SalaryHelper.roundMoney(epsWages);
        context.employeeEPF = SalaryHelper.roundMoney(employeeEPF);
        context.employeeEPS = SalaryHelper.roundMoney(employeeEPS);
        context.employerEPF = SalaryHelper.roundMoney(employerEPF);
        context.employerAcc02 = SalaryHelper.roundMoney(employerAcc02);
        context.employerAcc21 = SalaryHelper.roundMoney(employerAcc21);
        context.employerAcc22 = SalaryHelper.roundMoney(employerAcc22);

        /* ---------------- PF Configuration Snapshot ---------------- */
        context.pfCutOffAmt = Number(pfMaster.CutOffAmt || 0);
        context.pfEPFPercentage = Number(pfMaster.EPF || 0);
        context.pfEPSPercentage = Number(pfMaster.EPS || 0);
        context.pfEmployerEPFPercentage = Number(pfMaster.EPFAB || 0);
        context.pfEmployerAcc02Percentage = Number(pfMaster.Acc02 || 0);
        context.pfEmployerAcc21Percentage = Number(pfMaster.Acc21 || 0);
        context.pfEmployerAcc22Percentage = Number(pfMaster.Acc22 || 0);
        context.pfEPSCutOffAge = Number(pfMaster.EPSCutOffAge || 0);
        context.pfFromAmt = Number(pfMaster.FromAmt || 0);
        context.pfToAmt = Number(pfMaster.ToAmt || 0);
    }
}

module.exports = PFCalculator;