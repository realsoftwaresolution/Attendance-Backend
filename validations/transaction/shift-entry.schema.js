const Joi = require('joi');

/* -------------------------------------------------------------------------- */
/*                               TIME VALIDATION                              */
/* -------------------------------------------------------------------------- */

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

const timeField = (fieldName, required = false) => {

    let validator = Joi.string()
        .pattern(timeRegex)
        .messages({
            'string.pattern.base':
                `${fieldName} must be valid HH:mm:ss format.`
        });

    if (required) {
        validator = validator.required();
    } else {
        validator = validator.allow(null, '');
    }

    return validator;
};

/* -------------------------------------------------------------------------- */
/*                              SHIFT ENTRY SCHEMA                            */
/* -------------------------------------------------------------------------- */

const shiftEntrySchema = Joi.object({

    /* ----------------------------- Basic Details ---------------------------- */

    FromDate: Joi.string()
        .pattern(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/)
        .required()
        .messages({
            'string.pattern.base':
                'FromDate must be valid YYYY-MM-DD format.',
            'any.required':
                'FromDate is required.'
        }),

    CompanyMstId: Joi.number()
        .integer()
        .positive()
        .required()
        .messages({
            'any.required':
                'CompanyMstId is required.'
        }),

    DepartmentMstId: Joi.number()
        .integer()
        .positive()
        .required()
        .messages({
            'any.required':
                'DepartmentMstId is required.'
        }),


    ShiftType: Joi.string()
        .valid('Morning', 'Evening', 'Night')
        .required()
        .messages({
            'any.only':
                'ShiftType must be exactly Morning, Evening, or Night.',
            'any.required':
                'ShiftType is required.'
        }),

    /* ------------------------------- Shift -------------------------------- */

    ShiftIn: timeField('ShiftIn', true),

    ShiftOut: timeField('ShiftOut', true),

    /* ---------------------------- Pre Shift OT ----------------------------- */

    IsPreShiftOT: Joi.boolean()
        .default(false),

    PreShiftOTIn: timeField('PreShiftOTIn'),

    PreShiftOTOut: timeField('PreShiftOTOut'),

    /* ---------------------------- Post Shift OT ---------------------------- */

    IsPostShiftOT: Joi.boolean()
        .default(false),

    PostShiftOTIn: timeField('PostShiftOTIn'),

    PostShiftOTOut: timeField('PostShiftOTOut'),

    /* ----------------------------- Lunch Break ---------------------------- */

    IsLunchBreak: Joi.boolean()
        .default(false),

    LunchIn: timeField('LunchIn'),

    LunchOut: timeField('LunchOut'),

    /* ----------------------------- Half Day ------------------------------- */

    IsHalfDayRule: Joi.boolean()
        .default(false),

    HalfDayHours: Joi.number()
        .min(0)
        .max(24)
        .default(4)
        .messages({
            'number.base':
                'HalfDayHours must be numeric.',
            'number.max':
                'HalfDayHours cannot exceed 24.'
        }),

    /* ----------------------------- Grace Time ----------------------------- */

    IsGraceTime: Joi.boolean()
        .default(false),

    GraceMinutes: Joi.number()
        .integer()
        .min(0)
        .max(300)
        .default(0)
        .messages({
            'number.base':
                'GraceMinutes must be numeric.',
            'number.min':
                'GraceMinutes cannot be negative.'
        }),

    /* ----------------------------- Common Fields -------------------------- */

    SortId: Joi.number()
        .integer()
        .min(1)
        .default(1),

    Active: Joi.boolean()
        .default(true)

});

module.exports = {
    shiftEntrySchema
};