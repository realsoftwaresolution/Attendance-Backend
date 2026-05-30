const Joi = require('joi');

const departmentSchema = Joi.object({
    code: Joi.string().max(30).required().messages({
        'any.required': 'Department Code is required'
    }),
    department: Joi.string().required().messages({
        'any.required': 'Department Name is required'
    }),
    monthHours: Joi.string().allow('', null),
    companyCode: Joi.number().integer().required(),
    sortId: Joi.number().integer().optional()
});

module.exports = { departmentSchema };