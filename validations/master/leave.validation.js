const Joi = require("joi");

const leaveValidationSchema = Joi.object({
    LeaveType: Joi.string()
        .valid("Casual_Leave", "Sick_Leave", "Earned_Leave", "Leave_Without_Pay", "Other")
        .required(),
    DurationType: Joi.string()
        .valid("Full_Day", "Half_Day", "Short_Leave_Hourly")
        .required(),
    StartDate: Joi.when('DurationType', {
        is: 'Full_Day',
        then: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
        otherwise: Joi.forbidden()
    }),
    EndDate: Joi.when('DurationType', {
        is: 'Full_Day',
        then: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
        otherwise: Joi.forbidden()
    }),
    LeaveDate: Joi.when('DurationType', {
        is: Joi.valid('Half_Day', 'Short_Leave_Hourly'),
        then: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
        otherwise: Joi.forbidden()
    }),
    Session: Joi.when('DurationType', {
        is: 'Half_Day',
        then: Joi.string().valid("First_Half", "Second_Half").required(),
        otherwise: Joi.forbidden()
    }),
    HourlyDuration: Joi.when('DurationType', {
        is: 'Short_Leave_Hourly',
        then: Joi.number().positive().required(),
        otherwise: Joi.forbidden()
    }),
    Reason: Joi.string().min(5).max(1000).optional(),
    Status: Joi.string().valid("Pending", "Approved", "Rejected").optional(),
    ApprovalRemarks: Joi.string().max(1000).allow('', null).optional()
});

const leaveUpdateSchema = Joi.object({
    LeaveType: Joi.string()
        .valid("Casual_Leave", "Sick_Leave", "Earned_Leave", "Leave_Without_Pay", "Other")
        .optional(),
    DurationType: Joi.string()
        .valid("Full_Day", "Half_Day", "Short_Leave_Hourly")
        .optional(),
    StartDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
    EndDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
    LeaveDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
    Session: Joi.string().valid("First_Half", "Second_Half").optional(),
    HourlyDuration: Joi.number().positive().optional(),
    Reason: Joi.string().min(5).max(1000).optional(),
    Status: Joi.string().valid("Pending", "Approved", "Rejected").optional(),
    ApprovalRemarks: Joi.string().max(1000).allow('', null).optional()
});

module.exports = {
    leaveValidationSchema,
    leaveUpdateSchema
};
