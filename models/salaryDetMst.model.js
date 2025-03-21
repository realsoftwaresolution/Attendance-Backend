const { DataTypes } = require('sequelize');

module.exports = salaryDetMstModel;

function salaryDetMstModel(sequelize) {
    const attributes = {
        SalaryDetMstId: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
        SalaryMstId: { 
            type: DataTypes.BIGINT,
            allowNull: false,
            references: {
                model: 'SalaryMst', // Foreign key reference
                key: 'SalaryMstId'
            },
            onDelete: 'CASCADE' // If SalaryMst is deleted, delete related SalaryDetMst records
        },
        Month: {type: DataTypes.STRING(50), allowNull: true },
        Year: {type: DataTypes.STRING(50), allowNull: true },
        BranchName: { type: DataTypes.STRING(255), allowNull: true },
        FirmName: { type: DataTypes.STRING(255), allowNull: true },
        EmployeeCode: { type: DataTypes.STRING(50), allowNull: true },
        EmployeeName: { type: DataTypes.STRING(255), allowNull: true },
        Department: { type: DataTypes.STRING(255), allowNull: true },
        DepartmentCode: { type: DataTypes.STRING(50), allowNull: true },
        Designation: { type: DataTypes.STRING(255), allowNull: true },
        BankName: { type: DataTypes.STRING(255), allowNull: true },
        IFSCCode: { type: DataTypes.STRING(20), allowNull: true },
        BankAccountNo: { type: DataTypes.STRING(50), allowNull: true },
        WorkingHoursPerDay: { type: DataTypes.STRING(20), allowNull: true },
        TotalHours: { type: DataTypes.INTEGER, allowNull: true },
        TotalWorkingDays: { type: DataTypes.INTEGER, allowNull: true },
        TotalWorkHours: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
        TotalOvertimeHours: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
        PresentDays: { type: DataTypes.INTEGER, allowNull: true },
        AbsentDays: { type: DataTypes.INTEGER, allowNull: true },
        HalfDays: { type: DataTypes.INTEGER, allowNull: true },
        LateDays: { type: DataTypes.INTEGER, allowNull: true },
        WorkingDays: { type: DataTypes.INTEGER, allowNull: true },
        BasicSalary: { type: DataTypes.INTEGER, allowNull: true },
        WorkSalary: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
        OTSalary: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
        SundayOT: { type: DataTypes.INTEGER, allowNull: true },
        TotalSalary: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
        PT: { type: DataTypes.INTEGER, allowNull: true },
        NetSalary: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
        Sflag: { type: DataTypes.CHAR(1), allowNull: true },
        SDate: { type: DataTypes.STRING, allowNull: true },
        LogID: { type: DataTypes.INTEGER, allowNull: true },
        PcID: { type: DataTypes.STRING(20), allowNull: true },
        Ever: { type: DataTypes.INTEGER, allowNull: true },
        CompanyCode: { type: DataTypes.INTEGER, allowNull: true },
        SortId: { type: DataTypes.INTEGER, allowNull: true },
        Active: { type: DataTypes.BOOLEAN, allowNull: true },
        IsDelete: { type: DataTypes.BOOLEAN, allowNull: true },
    };

    // const options = {
    //     defaultScope: {
    //         // exclude password and Token by default
    //         attributes: { exclude: ['Password', 'Token'] }
    //     },
    //     scopes: {
    //         // include hash with this scope
    //         withHash: { attributes: {exclude: ['Token']}, },
    //         withToken: { attributes: {exclude: ['Password']}, },
    //         withAll: { attributes: {}, }

    //     }
    // };

    return sequelize.define('SalaryDetMst', attributes, {
        tableName: 'SalaryDetMst', // Explicitly set the table name
        timestamps: false,
    });
}  