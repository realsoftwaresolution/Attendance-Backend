const Joi = require('joi');

const employeeRegistrationSchema = Joi.object({
    EmpCode: Joi.number().integer().positive().required().messages({
        'number.base': 'Employee Code must be a valid number',
        'any.required': 'Employee Code is required'
    }),
    EmpFullName: Joi.string().max(255).required().messages({
        'string.empty': 'Employee Full Name cannot be empty',
        'any.required': 'Employee Full Name is required'
    }),
    EmpType: Joi.string().max(10).required().valid('Permanent', 'Contract', 'Intern').messages({
        'any.only': 'Employee Type must be either Permanent, Contract, or Intern'
    }),

    // Normalization Foreign Keys
    BranchMstId: Joi.number().integer().positive().required(),
    DepartmentMstId: Joi.number().integer().positive().required(),
    DesignationMstId: Joi.number().integer().positive().required(),
    CompanyMstId: Joi.number().integer().positive().required(),

    // Personal & Salary Configurations
    EmpSalary: Joi.number().precision(2).positive().allow(0, null),
    EmpSalaryType: Joi.string().max(30).allow('', null),
    SalaryFromDate: Joi.string().isoDate().optional().messages({
        'string.isoDate': 'SalaryFromDate must be a valid ISO Date format (YYYY-MM-DD)'
    }),
    EmpPhoneNo: Joi.string().max(20).pattern(/^[0-9+\s-]+$/).allow('', null).messages({
        'string.pattern.base': 'Employee Phone Number contains invalid characters'
    }),
    EmpPANNo: Joi.string()
        .uppercase()
        .pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
        .allow('', null)
        .messages({
            'string.pattern.base': 'Invalid PAN Card format. Must match standard layout (e.g., ABCDE1234F)'
        }),
    EmpESINo: Joi.string()
        .pattern(/^[0-9]{17}$/)
        .allow('', null)
        .messages({
            'string.pattern.base': 'Invalid ESI Number format. Must be a continuous 17-digit numerical identifier'
        }),
    EmpAddress: Joi.string().max(500).allow('', null),
    DateOfJoining: Joi.string().isoDate().required().messages({
        'string.isoDate': 'Date of Joining must be a valid ISO Date format (YYYY-MM-DD)'
    }),
    EmpGrp: Joi.string().max(30).allow('', null),

    EmpBankFullName: Joi.string().max(255).allow('', null),
    EmpBankName: Joi.string().max(255).allow('', null),
    EmpBankACNo: Joi.string().max(50).allow('', null),
    EmpBankIFSCode: Joi.string().max(30).uppercase().alphanum().allow('', null),

    SortId: Joi.number().integer().default(1),
    Active: Joi.boolean().default(true),
    IsDelete: Joi.boolean().default(false)
});

module.exports = { employeeRegistrationSchema };