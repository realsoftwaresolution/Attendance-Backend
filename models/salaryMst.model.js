const { DataTypes } = require('sequelize');

module.exports = salaryMstModel;

function salaryMstModel(sequelize) {
    const attributes = {
        SalaryMstId: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
        BranchName: { type: DataTypes.STRING(255), allowNull: true },
        FirmName: { type: DataTypes.STRING(255), allowNull: true },
        Department: { type: DataTypes.STRING(255), allowNull: true },
        DepartmentCode: { type: DataTypes.STRING(50), allowNull: true },
        DepositDate: { type: DataTypes.STRING(50), allowNull: true },
        Month: { type: DataTypes.STRING(50), allowNull: true },
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

    return sequelize.define('SalaryMst', attributes, {
        tableName: 'SalaryMst', // Explicitly set the table name
        timestamps: false,
    });
}  