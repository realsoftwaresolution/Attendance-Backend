const Joi = require('joi');

const employeeRegistrationSchema = Joi.object({
    /* --------------------------- Employee Details --------------------------- */

    EmpCode: Joi.number()
        .integer()
        .positive()
        .required()
        .messages({
            'number.base': 'Employee Code must be a valid number',
            'any.required': 'Employee Code is required'
        }),

    EmpFullName: Joi.string()
        .max(255)
        .required()
        .messages({
            'string.empty': 'Employee Full Name cannot be empty',
            'any.required': 'Employee Full Name is required'
        }),

    EmpType: Joi.string()
        .valid('Permanent', 'Contract', 'Intern', 'None')
        .required()
        .messages({
            'any.only':
                'Employee Type must be Permanent, Contract, Intern, or None',
            'any.required': 'Employee Type is required'
        }),

    /* ----------------------- Normalization Foreign Keys ---------------------- */

    BranchMstId: Joi.number().integer().positive().required(),
    DepartmentMstId: Joi.number().integer().positive().required(),
    DesignationMstId: Joi.number().integer().positive().required(),
    CompanyMstId: Joi.number().integer().positive().required(),

    /* -------------------------- Salary Configuration ------------------------- */

    CashSalary: Joi.number()
        .precision(2)
        .min(0)
        .required()
        .messages({
            'any.required': 'Cash Salary is required'
        }),

    BankSalary: Joi.number()
        .precision(2)
        .min(0)
        .required()
        .messages({
            'any.required': 'Bank Salary is required'
        }),

    SalaryType: Joi.string()
        .valid('Working', 'Fixed')
        .required()
        .messages({
            'any.only':
                'Salary Type must be either Working or Fixed',
            'any.required': 'Salary Type is required'
        }),

    EffectiveMonth: Joi.string()
        .pattern(/^\d{4}-(0[1-9]|1[0-2])$/)
        .required()
        .messages({
            'string.pattern.base':
                'Effective Month must be in YYYY-MM format',
            'any.required': 'Effective Month is required'
        }),

    /* ---------------------------- Personal Details --------------------------- */

    EmpPhoneNo: Joi.string()
        .max(20)
        .pattern(/^[0-9+\s-]+$/)
        .required()
        .messages({
            'string.pattern.base':
                'Employee Phone Number contains invalid characters',
            'any.required': 'Employee Phone Number is required'
        }),

    EmpPANNo: Joi.string()
        .uppercase()
        .pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
        .required()
        .messages({
            'string.pattern.base':
                'Invalid PAN Card format. Example: ABCDE1234F',
            'any.required': 'PAN Number is required'
        }),

    EmpAddress: Joi.string()
        .max(500)
        .required()
        .messages({
            'any.required': 'Employee Address is required'
        }),

    DateOfJoining: Joi.string()
        .isoDate()
        .required()
        .messages({
            'string.isoDate':
                'Date of Joining must be a valid ISO Date format (YYYY-MM-DD)',
            'any.required': 'Date of Joining is required'
        }),

    EmpGrp: Joi.string()
        .max(30)
        .required()
        .messages({
            'any.required': 'Employee Group is required'
        }),

    /* ----------------------------- Bank Details ------------------------------ */

    EmpBankFullName: Joi.string()
        .max(255)
        .required()
        .messages({
            'any.required': 'Bank Account Holder Name is required'
        }),

    EmpBankName: Joi.string()
        .max(255)
        .required()
        .messages({
            'any.required': 'Bank Name is required'
        }),

    EmpBankACNo: Joi.string()
        .max(50)
        .required()
        .messages({
            'any.required': 'Bank Account Number is required'
        }),

    EmpBankIFSCode: Joi.string()
        .max(30)
        .uppercase()
        .alphanum()
        .required()
        .messages({
            'any.required': 'IFSC Code is required'
        }),

    /* ----------------------------------- PF ---------------------------------- */

    IsPFApplicable: Joi.boolean().required(),

    IsEPSApplicable: Joi.boolean().required(),

    PFEffectiveMonth: Joi.string()
        .max(7)
        .allow('', null),

    UANNo: Joi.string()
        .max(50)
        .allow('', null),

    PFNo: Joi.string()
        .max(50)
        .allow('', null),

    /* --------------------------------- ESIC ---------------------------------- */

    IsESICApplicable: Joi.boolean().required(),

    ESICEffectiveMonth: Joi.string()
        .max(7)
        .allow('', null),

    ESINo: Joi.string()
        .max(50)
        .allow('', null),

    /* ----------------------------------- PT ---------------------------------- */

    IsPTApplicable: Joi.boolean().required(),

    PTEffectiveMonth: Joi.string()
        .max(7)
        .allow('', null),

    PTRemarks: Joi.string()
        .max(255)
        .allow('', null),

    /* -------------------------------- General -------------------------------- */

    SortId: Joi.number()
        .integer()
        .default(1),

    Active: Joi.boolean()
        .default(true),

    IsDelete: Joi.boolean()
        .default(false)

})
    .when(
        Joi.object({
            IsPFApplicable: Joi.valid(true)
        }).unknown(),
        {
            then: Joi.object({
                PFEffectiveMonth: Joi.string().required(),
                UANNo: Joi.string().required(),
                PFNo: Joi.string().required()
            })
        }
    )
    .when(
        Joi.object({
            IsESICApplicable: Joi.valid(true)
        }).unknown(),
        {
            then: Joi.object({
                ESICEffectiveMonth: Joi.string().required(),
                ESINo: Joi.string()
                    .pattern(/^[0-9]{17}$/)
                    .required()
                    .messages({
                        'string.pattern.base':
                            'Invalid ESI Number format. Must be 17 digits.'
                    })
            })
        }
    )
    .when(
        Joi.object({
            IsPTApplicable: Joi.valid(true)
        }).unknown(),
        {
            then: Joi.object({
                PTEffectiveMonth: Joi.string().required()
            })
        }
    );

module.exports = {
    employeeRegistrationSchema
};