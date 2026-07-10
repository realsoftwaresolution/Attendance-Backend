const Joi = require('joi');

exports.createAdvanceSchema = Joi.object({

    EmpMstId: Joi.number()
        .integer()
        .positive()
        .required(),

    CompanyMstId: Joi.number()
        .integer()
        .positive()
        .required(),

    DepartmentMstId: Joi.number()
        .integer()
        .positive()
        .required(),

    DesignationMstId: Joi.number()
        .integer()
        .positive()
        .required(),

    AdvanceDate: Joi.date()
        .required(),

    AdvanceType: Joi.string()
        .max(30)
        .required(),

    AdvanceAmount: Joi.number()
        .precision(2)
        .positive()
        .required(),

    Remarks: Joi.string()
        .max(500)
        .allow('', null)

});

exports.advanceBulkImportSchema = Joi.object({
    EmpCode: Joi.alternatives().try(Joi.string(), Joi.number()).required().messages({
        'any.required': 'Employee Code is required'
    }),
    EmpMstId: Joi.number().integer().positive().required(),
    CompanyMstId: Joi.number().integer().positive().required(),
    DepartmentMstId: Joi.number().integer().positive().required(),
    DesignationMstId: Joi.number().integer().positive().required(),
    AdvanceDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required().messages({
        'string.pattern.base': 'Advance Date must be a valid date format (YYYY-MM-DD)',
        'any.required': 'Advance Date is required'
    }),
    AdvanceType: Joi.string().max(30).required(),
    AdvanceAmount: Joi.number().precision(2).positive().required().messages({
        'any.required': 'Advance Amount is required',
        'number.positive': 'Advance Amount must be greater than zero'
    }),
    Remarks: Joi.string().max(500).allow('', null)
});