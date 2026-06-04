const Joi = require('joi');

const masterSettingMstSchema = Joi.object({
    DepartmentMstId: Joi.number().integer().required(),
    CompanyMstId: Joi.number().integer().required(),

    ApplyHolidayOnSalaryCalculation: Joi.boolean().default(false),
    ApplyHalfDayOnSalaryCalculation: Joi.boolean().default(false),
    ApplyLateOnSalaryCalculation: Joi.boolean().default(false),
    AllowLunchBreak: Joi.boolean().default(false),

    SalaryCalculateOnCalendarDay: Joi.boolean().default(false),
    SalaryCalculateOnCalendarDayWithoutSunday: Joi.boolean().default(false),
    SalaryCalculateOnWorkingDay: Joi.boolean().default(false),

    WorkingDays: Joi.number().integer().allow(null),

    HoursCategoryMstId: Joi.number().integer().required(),

    SalaryCalculateOnDay: Joi.boolean().default(false),
    SalaryCalculateOnHours: Joi.boolean().default(false),
    SalaryCalculateOnPerPc: Joi.boolean().default(false),

    ApplySundayAsPresentDay: Joi.boolean().default(false),
    MarkSundayAbsentIfPreviousDayAbsent: Joi.boolean().default(false),
    MarkSundayAbsentIfNextDayAbsent: Joi.boolean().default(false),
    MarkSundayAbsentIfBothDaysAbsent: Joi.boolean().default(false),

    ApplySundayInOvertime: Joi.boolean().default(false),
    ApplySundayInAbsentDay: Joi.boolean().default(false),

});


module.exports = { masterSettingMstSchema }