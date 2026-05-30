const Joi = require('joi');

const hoursCategorySchema = Joi.object({
    code: Joi.string().max(30).required(),
    hours: Joi.string().required(),
    companyCode: Joi.number().integer().required(),
    sortId: Joi.number().default(1)
});

module.exports = { hoursCategorySchema };