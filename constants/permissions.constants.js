const MAIN_MENU = Object.freeze({
  MASTER: "Master",
  TRANSACTION: "Transaction",
  REPORT: "Report",
  UTILITY: "Utility",
});

const FORMS = Object.freeze({
  // Master Module
  EMPLOYEE: "FrmEmployee",
  DEPARTMENT: "FrmDepartment",
  COMPANY: "FrmCompany",
  HOUR_CATEGORY: "FrmHourCategory",
  DESIGNATION: "FrmDesignation",
  HOLIDAY: "FrmHoliday",
  ADVANCED_ENTRY: "FrmAdvancedEntry",
  COUNTER: "FrmCounter",

  PF_MASTER: "FrmPFMst",
  PT_MASTER: "FrmPTMst",
  ESIC_MASTER: "FrmESICMst",

  // Transaction Module
  ATTENDANCE: "FrmAttendance",
  SHIFT_ENTRY: "FrmShiftEntry",
  HOUR_CALCULATION: "FrmHourCalculation",
  SALARY_CALCULATION: "FrmSalaryCalculation",

  // Utility Module
  BACKUP: "FrmBackup",
  MASTER_SETTINGS: "FrmMasterSettings",
  IMPORT_DATA: "FrmImportData",
  FORM_16: "FrmForm16",
  USER_MASTER: "FrmUserMaster",
});

const REPORT_TYPES = Object.freeze({
  IN_OUT: "In Out",
  SALARY: "Salary",
  INVALID_LOGS: "Invalid Logs",
});

const REPORT_FORMS = Object.freeze({
  DAILY_IN_OUT: "RptDailyInOut",
  DEPARTMENT_WISE_IN_OUT: "RptDepartmentWiseInOut",
  EMPLOYEE_WISE_IN_OUT: "RptEmployeeWiseInOut",

  SALARY_SLIP: "RptSalarySlip",
  SALARY_DETAIL: "RptSalaryDetail",
  SALARY_SUMMARY: "RptSalarySummary",

  INVALID_LOGS_REPORT: "RptInvalidLogs",
});

const SUB_REPORTS = [
  {
    name: "Daily In/Out Report",
    form: REPORT_FORMS.DAILY_IN_OUT,
    type: REPORT_TYPES.IN_OUT,
  },
  {
    name: "Department-Wise In/Out Report",
    form: REPORT_FORMS.DEPARTMENT_WISE_IN_OUT,
    type: REPORT_TYPES.IN_OUT,
  },
  {
    name: "Employee-Wise In/Out Report",
    form: REPORT_FORMS.EMPLOYEE_WISE_IN_OUT,
    type: REPORT_TYPES.IN_OUT,
  },

  {
    name: "Salary Slip",
    form: REPORT_FORMS.SALARY_SLIP,
    type: REPORT_TYPES.SALARY,
  },
  {
    name: "Salary Detail",
    form: REPORT_FORMS.SALARY_DETAIL,
    type: REPORT_TYPES.SALARY,
  },
  {
    name: "Salary Summary",
    form: REPORT_FORMS.SALARY_SUMMARY,
    type: REPORT_TYPES.SALARY,
  },
  {
    name: "Invalid Punch Logs Report",
    form: REPORT_FORMS.INVALID_LOGS_REPORT,
    type: REPORT_TYPES.INVALID_LOGS,
  },
];

module.exports = {
  MAIN_MENU,
  FORMS,
  REPORT_TYPES,
  SUB_REPORTS,
  REPORT_FORMS,
};
