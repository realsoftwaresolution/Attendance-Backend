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