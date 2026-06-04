const Joi = require('joi');

const datePattern = Joi.string()
    .pattern(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/)
    .required();

const slabSchema = Joi.object({
    FromAmt: Joi.number().precision(2).required(),
    ToAmt: Joi.number().precision(2).required(),
    TaxRate: Joi.number().precision(2).required()
});

exports.createPTSchema = Joi.object({
    CompanyMstId: Joi.number().integer().required(),
    BranchMstId: Joi.number().integer().required(),
    FromDate: datePattern,
    Slabs: Joi.array()
        .items(slabSchema)
        .min(1)
        .required()
});

exports.updatePTSchema = Joi.object({
    CompanyMstId: Joi.number().integer().required(),
    BranchMstId: Joi.number().integer().required(),
    Slabs: Joi.array()
        .items(slabSchema)
        .min(1)
        .required()
});