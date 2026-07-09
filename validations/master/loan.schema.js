const Joi = require('joi');

const loanSchema = Joi.object({
    LoanDate: Joi.date().iso().required(),
    EmpMstId: Joi.number().integer().required(),
    LoanAmount: Joi.number().precision(2).min(0).required(),
    MonthlyInstallment: Joi.number().precision(2).min(0).required(),
    StartingDate: Joi.date().iso().required(),
    TotalInstallments: Joi.number().integer().min(1).required(),
    DeductFromBank: Joi.number().precision(2).min(0).required(),
    DeductFromCash: Joi.number().precision(2).min(0).required(),
    Remark: Joi.string().allow('', null),
    IsClosed: Joi.boolean().default(false),
    CloseRemark: Joi.string().allow('', null),
    Active: Joi.boolean().default(true)
}).custom((value, helpers) => {
    const monthlyInstallment = parseFloat(value.MonthlyInstallment);
    const deductFromBank = parseFloat(value.DeductFromBank);
    const deductFromCash = parseFloat(value.DeductFromCash);

    if (monthlyInstallment !== (deductFromBank + deductFromCash)) {
        return helpers.message('Monthly Installment must be equal to the sum of Deduct From Bank and Deduct From Cash');
    }

    return value;
});

module.exports = {
    loanSchema
};
