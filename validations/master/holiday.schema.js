const Joi = require('joi');

const holidaySchema = Joi.object({
    date: Joi.date().required().messages({
        'date.base': 'Please provide a valid date',
        'any.required': 'Holiday date is required'
    }),
    holiday: Joi.string().min(3).required().messages({
        'string.empty': 'Holiday name cannot be empty',
        'any.required': 'Holiday name is required'
    }),
    companyCode: Joi.number().integer().required(),
    sortId: Joi.number().integer().optional()
});

module.exports = { holidaySchema };