const Joi = require('joi');

const designationSchema = Joi.object({
    code: Joi.string().max(30).required().messages({
        'any.required': 'Code is required'
    }),
    designation: Joi.string().required().messages({
        'any.required': 'Designation name is required'
    }),
    companyCode: Joi.number().integer().required(),
    sortId: Joi.number().integer().optional()
});

module.exports = { designationSchema };