const Joi = require('joi');

const datePattern = Joi.string()
    .pattern(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/)
    .required()
    .messages({
        'string.pattern.base': 'Date must be in YYYY-MM-DD format.'
    });

const slabSchema = Joi.object({
    FromAmt: Joi.number().precision(2).required(),
    ToAmt: Joi.number().precision(2).required(),

    EPF: Joi.number().precision(2).required(),
    EPS: Joi.number().precision(2).required(),

    EPFAB: Joi.number().precision(2).default(0),
    Acc02: Joi.number().precision(2).default(0),
    Acc21: Joi.number().precision(2).default(0),
    Acc22: Joi.number().precision(2).default(0),

    CutOffAmt: Joi.number().precision(2).default(0),

    EPSCutOffAge: Joi.number().integer().allow(null)
});

module.exports = Joi.object({
    CompanyMstId: Joi.number().integer().required(),
    BranchMstId: Joi.number().integer().required(),

    FromDate: datePattern,

    Slabs: Joi.array()
        .items(slabSchema)
        .min(1)
        .required()
});