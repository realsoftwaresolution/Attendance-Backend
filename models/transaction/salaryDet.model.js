const { DataTypes } = require('sequelize');

module.exports = salaryDet;

function salaryDet(sequelize) {
    const attributes = {
        SalaryDetId: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        SalaryMstId: { type: DataTypes.INTEGER, allowNull: false },
        SalaryMonth: { type: DataTypes.STRING(7), allowNull: false },

        /* ---------------- Employee Details ---------------- */
        EmpMstId: { type: DataTypes.INTEGER, allowNull: false },
        EmpCode: { type: DataTypes.INTEGER, allowNull: false },
        EmpFullName: { type: DataTypes.STRING(255), allowNull: false },
        DepartmentMstId: { type: DataTypes.INTEGER, allowNull: false },
        DesignationMstId: { type: DataTypes.INTEGER, allowNull: false },
        CompanyMstId: { type: DataTypes.INTEGER, allowNull: false },
        EmpPhoneNo: { type: DataTypes.STRING(20), allowNull: true },
        EmpPANNo: { type: DataTypes.STRING(50), allowNull: true },
        EmpESINo: { type: DataTypes.STRING(100), allowNull: true },
        EmpAddress: { type: DataTypes.TEXT, allowNull: true },
        DateOfJoining: { type: DataTypes.DATEONLY, allowNull: true },
        EmpGrp: { type: DataTypes.STRING(20), allowNull: true },
        EmpBankFullName: { type: DataTypes.STRING(255), allowNull: true },
        EmpBankName: { type: DataTypes.STRING(255), allowNull: true },
        EmpBankACNo: { type: DataTypes.STRING(100), allowNull: true },
        EmpBankIFSCode: { type: DataTypes.STRING(50), allowNull: true },
        UANNo: { type: DataTypes.STRING(100), allowNull: true },
        PFNo: { type: DataTypes.STRING(100), allowNull: true },
        ESINo: { type: DataTypes.STRING(100), allowNull: true },
        PTRemarks: { type: DataTypes.STRING(500), allowNull: true },
        DateOfBirth: { type: DataTypes.DATEONLY, allowNull: true },
        CompanyName: { type: DataTypes.STRING(255), allowNull: true },
        Department: { type: DataTypes.STRING(255), allowNull: true },
        Designation: { type: DataTypes.STRING(255), allowNull: true },
        SalaryType: { type: DataTypes.STRING(20), allowNull: true },

        /* ---------------- Salary Calculations ---------------- */
        BaseSalary: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
        TotalPresentDays: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
        TotalNormalPresentDays: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
        TotalHalfDays: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
        TotalAbsentDays: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
        PaidHolidayCount: { type: DataTypes.INTEGER, defaultValue: 0 },
        UnpaidHolidayCount: { type: DataTypes.INTEGER, defaultValue: 0 },
        PaidSundayCount: { type: DataTypes.INTEGER, defaultValue: 0 },
        UnpaidSundayCount: { type: DataTypes.INTEGER, defaultValue: 0 },
        SalaryDivisorDays: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
        SalaryPayableDays: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
        SalaryExpectedMinutes: { type: DataTypes.INTEGER, defaultValue: 0 },
        SalaryPayableMinutes: { type: DataTypes.INTEGER, defaultValue: 0 },
        SalaryPerDayRate: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
        SalaryPerMinuteRate: { type: DataTypes.DECIMAL(18, 4), defaultValue: 0 },
        GrossSalary: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
        BankPayableSalary: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
        CashPayableSalary: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },

        /* ---------------- PF, ESIC, PT ---------------- */
        PFApplicable: { type: DataTypes.BOOLEAN, defaultValue: false },
        PFCode: { type: DataTypes.INTEGER, allowNull: true },
        EmployeeAge: { type: DataTypes.INTEGER, allowNull: true },
        EPSApplicable: { type: DataTypes.BOOLEAN, defaultValue: false },
        EPFWages: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
        EPSWages: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
        EmployeeEPF: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
        EmployeeEPS: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
        EmployerEPF: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
        EmployerAcc02: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
        EmployerAcc21: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
        EmployerAcc22: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
        PFCutOffAmt: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
        PFEPFPercentage: { type: DataTypes.DECIMAL(10, 4), defaultValue: 0 },
        PFEPSPercentage: { type: DataTypes.DECIMAL(10, 4), defaultValue: 0 },
        PFEmployerEPFPercentage: { type: DataTypes.DECIMAL(10, 4), defaultValue: 0 },
        PFEmployerAcc02Percentage: { type: DataTypes.DECIMAL(10, 4), defaultValue: 0 },
        PFEmployerAcc21Percentage: { type: DataTypes.DECIMAL(10, 4), defaultValue: 0 },
        PFEmployerAcc22Percentage: { type: DataTypes.DECIMAL(10, 4), defaultValue: 0 },
        PFEPSCutOffAge: { type: DataTypes.INTEGER, defaultValue: 0 },
        PFFromAmt: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
        PFToAmt: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
        ESICApplicable: { type: DataTypes.BOOLEAN, defaultValue: false },
        ESICCode: { type: DataTypes.INTEGER, allowNull: true },
        ESICWages: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
        EmployeeESIC: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
        EmployerESIC: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
        ESICCutOffAmt: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
        ESICEmployeePercentage: { type: DataTypes.DECIMAL(10, 4), defaultValue: 0 },
        ESICEmployerPercentage: { type: DataTypes.DECIMAL(10, 4), defaultValue: 0 },
        ESICFromAmt: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
        ESICToAmt: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
        PTApplicable: { type: DataTypes.BOOLEAN, defaultValue: false },
        PTCode: { type: DataTypes.INTEGER, allowNull: true },
        EmployeePT: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
        PTTaxRate: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
        PTFromAmt: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
        PTToAmt: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },

        /* ---------------- Final Fields ---------------- */
        TotalStatutoryDeductions: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
        BankSalaryAfterTax: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
        TotalOutstandingAdvance: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
        CashSalaryAfterAdvance: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
        NetPayableSalary: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0 },
        SalaryCalculationMethod: { type: DataTypes.STRING(20), allowNull: true },
        Message: { type: DataTypes.STRING(1000), allowNull: true },
        TaxMessages: { type: DataTypes.TEXT, allowNull: true },
        Active: { type: DataTypes.BOOLEAN, defaultValue: true }
    };

    return sequelize.define('SalaryDet', attributes, {
        tableName: 'SalaryDet', timestamps: true, indexes: [
            {
                unique: true,
                fields: ['SalaryMonth', 'EmpMstId']
            }
        ]
    });
}