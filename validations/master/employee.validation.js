const Joi = require('joi');

const employeeRegistrationSchema = Joi.object({
    /* --------------------------- Employee Details --------------------------- */
    
    Username: Joi.string().max(30).optional().allow(''),
    Password: Joi.string().optional().allow(''),

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
        .valid('Working', 'Fixed', 'None')
        .required()
        .messages({
            'any.only': 'Salary Type must be Working, Fixed, or None',
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
        .allow('', null)
        .optional()
        .messages({
            'string.pattern.base':
                'Invalid PAN Card format. Example: ABCDE1234F'
        }),

    AadharCardNo: Joi.string()
        .max(20)
        .allow('', null)
        .optional(),

    EmpAddress: Joi.string()
        .max(500)
        .required()
        .messages({
            'any.required': 'Employee Address is required'
        }),

    DateOfJoining: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .required()
        .messages({
            'string.pattern.base':
                'Date of Joining must be a valid date format (YYYY-MM-DD)',
            'any.required': 'Date of Joining is required'
        }),

    DateOfResign: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .allow('', null)
        .optional()
        .messages({
            'string.pattern.base':
                'Date of Resign must be a valid date format (YYYY-MM-DD)'
        }),

    DateOfBirth: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .allow('', null)
        .optional()
        .messages({
            'string.pattern.base':
                'Date of Birth must be a valid date format (YYYY-MM-DD)'
        }),

    EmpGrp: Joi.string()
    .max(30)
    .allow('', null)
    .optional(),

    /* ----------------------------- Bank Details ------------------------------ */

    EmpBankFullName: Joi.string()
        .max(255)
        .allow('', null)
        .optional(),

    EmpBankName: Joi.string()
        .max(255)
        .allow('', null)
        .optional(),

    EmpBankACNo: Joi.string()
        .max(50)
        .allow('', null)
        .optional(),

    EmpBankIFSCode: Joi.string()
        .max(30)
        .uppercase()
        .alphanum()
        .allow('', null)
        .optional(),
        
    EmpBankAddress: Joi.string()
        .max(500)
        .allow('', null)
        .optional(),

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
        .default(false),

    BiometricVector: Joi.string()
        .allow('', null)
        .optional()

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