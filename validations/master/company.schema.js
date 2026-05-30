const Joi = require('joi');

const companySchema = Joi.object({
    code: Joi.string().max(30).required(),
    companyName: Joi.string().required(),
    ownerName: Joi.string().required(),
    partnerName: Joi.string().allow('', null),
    designation: Joi.string().required(),
    corporateCode: Joi.string().allow('', null),
    address: Joi.string().required(),
    panNo: Joi.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/).messages({
        "string.pattern.base": "Please enter a valid PAN number (e.g., ABCDE1234F)"
    }),
    tanNo: Joi.string().regex(/^[A-Z]{4}[0-9]{5}[A-Z]{1}$/).allow('', null),
    sortId: Joi.number().integer().optional()
});

module.exports = { companySchema };