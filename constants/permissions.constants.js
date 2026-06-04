const MAIN_MENU = Object.freeze({
    MASTER: 'Master',
    TRANSACTION: 'Transaction',
    REPORT: 'Report',
    UTILITY: 'Utility'
});

const FORMS = Object.freeze({
    // Master Module
    EMPLOYEE: 'FrmEmployee',
    DEPARTMENT: 'FrmDepartment',
    COMPANY: 'FrmCompany',
    HOUR_CATEGORY: 'FrmHourCategory',
    DESIGNATION: 'FrmDesignation',
    HOLIDAY: 'FrmHoliday',
    ADVANCED_ENTRY: 'FrmAdvancedEntry',
    COUNTER: 'FrmCounter',

    PF_MASTER: 'FrmPFMst',
    PT_MASTER: 'FrmPTMst',
    ESIC_MASTER: 'FrmESICMst',

    // Transaction Module
    ATTENDANCE: 'FrmAttendance',
    SHIFT_ENTRY: 'FrmShiftEntry',
    HOUR_CALCULATION: 'FrmHourCalculation',
    SALARY_CALCULATION: 'FrmSalaryCalculation',

    // Utility Module
    BACKUP: 'FrmBackup',
    MASTER_SETTINGS: 'FrmMasterSettings',
    IMPORT_DATA: 'FrmImportData',
    FORM_16: 'FrmForm16',
    USER_MASTER: 'FrmUserMaster'
});

const REPORT_TYPES = Object.freeze({
    DAILY: 'DAILY',
    MONTHLY: 'MONTHLY',
    SALARY: 'SALARY'
});

const SUB_REPORTS = [
    { name: 'Date Wise', form: 'RptDateWise', type: REPORT_TYPES.DAILY },
    { name: 'Employee Wise', form: 'RptEmployeeWise', type: REPORT_TYPES.DAILY },
    { name: 'Department Wise', form: 'RptDepartmentWise', type: REPORT_TYPES.DAILY },

    { name: 'Employee Wise', form: 'RptEmployeeWiseMonthly', type: REPORT_TYPES.MONTHLY },
    { name: 'Department Wise', form: 'RptDepartmentWiseMonthly', type: REPORT_TYPES.MONTHLY },
    { name: 'Hour Calculation', form: 'RptHourCalculation', type: REPORT_TYPES.MONTHLY },

    { name: 'DepCode', form: 'RptDeptCode', type: REPORT_TYPES.SALARY },
    { name: 'EmpCode', form: 'RptEmpCode', type: REPORT_TYPES.SALARY },
    { name: 'Year', form: 'RptYear', type: REPORT_TYPES.SALARY },
    { name: 'Month', form: 'RptMonth', type: REPORT_TYPES.SALARY }
];

module.exports = {
    MAIN_MENU,
    FORMS,
    REPORT_TYPES,
    SUB_REPORTS
};