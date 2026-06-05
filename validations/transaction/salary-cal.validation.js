const Joi = require('joi');

const salaryDetValidationSchema = Joi.object({

    /* ---------------- Salary ---------------- */

    SalaryMonth: Joi.string()
        .pattern(/^\d{4}-\d{2}$/)
        .required(),

    /* ---------------- Employee ---------------- */

    EmpMstId: Joi.number()
        .integer()
        .required(),

    EmpCode: Joi.number()
        .integer()
        .allow(null),

    EmpFullName: Joi.string()
        .max(255)
        .allow('', null),

    DepartmentMstId: Joi.number()
        .integer()
        .allow(null),

    DesignationMstId: Joi.number()
        .integer()
        .allow(null),

    CompanyMstId: Joi.number()
        .integer()
        .allow(null),

    EmpPhoneNo: Joi.string()
        .max(20)
        .allow('', null),

    EmpPANNo: Joi.string()
        .max(50)
        .allow('', null),

    EmpESINo: Joi.string()
        .max(100)
        .allow('', null),

    EmpAddress: Joi.string()
        .allow('', null),

    DateOfJoining: Joi.date()
        .allow(null),

    EmpGrp: Joi.string()
        .max(20)
        .allow('', null),

    EmpBankFullName: Joi.string()
        .max(255)
        .allow('', null),

    EmpBankName: Joi.string()
        .max(255)
        .allow('', null),

    EmpBankACNo: Joi.string()
        .max(100)
        .allow('', null),

    EmpBankIFSCode: Joi.string()
        .max(50)
        .allow('', null),

    UANNo: Joi.string()
        .max(100)
        .allow('', null),

    PFNo: Joi.string()
        .max(100)
        .allow('', null),

    ESINo: Joi.string()
        .max(100)
        .allow('', null),

    PTRemarks: Joi.string()
        .max(500)
        .allow('', null),

    DateOfBirth: Joi.date()
        .allow(null),

    CompanyName: Joi.string()
        .max(255)
        .allow('', null),

    Department: Joi.string()
        .max(255)
        .allow('', null),

    Designation: Joi.string()
        .max(255)
        .allow('', null),

    SalaryType: Joi.string()
        .max(20)
        .allow('', null),

    /* ---------------- Salary Calculation ---------------- */

    BaseSalary: Joi.number().required(),

    TotalPresentDays: Joi.number().required(),
    TotalNormalPresentDays: Joi.number().required(),
    TotalHalfDays: Joi.number().required(),
    TotalAbsentDays: Joi.number().required(),

    PaidHolidayCount: Joi.number().required(),
    UnpaidHolidayCount: Joi.number().required(),
    PaidSundayCount: Joi.number().required(),
    UnpaidSundayCount: Joi.number().required(),

    SalaryDivisorDays: Joi.number().required(),
    SalaryPayableDays: Joi.number().required(),

    SalaryExpectedMinutes: Joi.number().required(),
    SalaryPayableMinutes: Joi.number().required(),

    SalaryPerDayRate: Joi.number().required(),
    SalaryPerMinuteRate: Joi.number().required(),

    GrossSalary: Joi.number().required(),

    BankPayableSalary: Joi.number().required(),
    CashPayableSalary: Joi.number().required(),

    /* ---------------- PF ---------------- */

    PFApplicable: Joi.boolean().required(),

    PFCode: Joi.number()
        .integer()
        .allow(null),

    EmployeeAge: Joi.number()
        .integer()
        .allow(null),

    EPSApplicable: Joi.boolean().required(),

    EPFWages: Joi.number().required(),
    EPSWages: Joi.number().required(),

    EmployeeEPF: Joi.number().required(),
    EmployeeEPS: Joi.number().required(),

    EmployerEPF: Joi.number().required(),
    EmployerAcc02: Joi.number().required(),
    EmployerAcc21: Joi.number().required(),
    EmployerAcc22: Joi.number().required(),

    PFCutOffAmt: Joi.number().required(),

    PFEPFPercentage: Joi.number().required(),
    PFEPSPercentage: Joi.number().required(),

    PFEmployerEPFPercentage: Joi.number().required(),
    PFEmployerAcc02Percentage: Joi.number().required(),
    PFEmployerAcc21Percentage: Joi.number().required(),
    PFEmployerAcc22Percentage: Joi.number().required(),

    PFEPSCutOffAge: Joi.number().required(),

    PFFromAmt: Joi.number().required(),
    PFToAmt: Joi.number().required(),

    /* ---------------- ESIC ---------------- */

    ESICApplicable: Joi.boolean().required(),

    ESICCode: Joi.number()
        .integer()
        .allow(null),

    ESICWages: Joi.number().required(),

    EmployeeESIC: Joi.number().required(),
    EmployerESIC: Joi.number().required(),

    ESICCutOffAmt: Joi.number().required(),

    ESICEmployeePercentage: Joi.number().required(),
    ESICEmployerPercentage: Joi.number().required(),

    ESICFromAmt: Joi.number().required(),
    ESICToAmt: Joi.number().required(),

    /* ---------------- PT ---------------- */

    PTApplicable: Joi.boolean().required(),

    PTCode: Joi.number()
        .integer()
        .allow(null),

    EmployeePT: Joi.number().required(),

    PTTaxRate: Joi.number().required(),

    PTFromAmt: Joi.number().required(),
    PTToAmt: Joi.number().required(),

    /* ---------------- Final Salary ---------------- */

    TotalStatutoryDeductions: Joi.number().required(),

    BankSalaryAfterTax: Joi.number().required(),

    TotalOutstandingAdvance: Joi.number().required(),

    CashSalaryAfterAdvance: Joi.number().required(),

    NetPayableSalary: Joi.number().required(),

    SalaryCalculationMethod: Joi.string()
        .max(20)
        .allow('', null),

    Message: Joi.string()
        .max(1000)
        .allow('', null),

    TaxMessages: Joi.array()
        .items(Joi.string())
        .required()

}).unknown(true);

const bulkSalaryDetSchema = Joi.array()
    .items(salaryDetValidationSchema)
    .min(1)
    .required();

exports.saveSalarySchema = Joi.object({

    CompanyMstId: Joi.number()
        .integer()
        .positive()
        .required(),

    DepartmentMstId: Joi.number()
        .integer()
        .positive()
        .required(),

    SalaryMonth: Joi.string()
        .pattern(/^\d{4}-\d{2}$/)
        .required(),

    SalaryDetails: bulkSalaryDetSchema

});