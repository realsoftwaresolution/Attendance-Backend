const { DataTypes } = require("sequelize");

const EmployeeSalaryHistory = (sequelize) => {
    return sequelize.define('EmployeeSalaryHistory', {
        SalaryHistoryId: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        EmpMstId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        SalaryAmount: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: false
        },
        SalaryType: {
            type: DataTypes.STRING(30),
            allowNull: false,
            defaultValue: 'Fixed'
        },
        FromDate: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        ToDate: {
            type: DataTypes.DATEONLY,
            allowNull: true
        },
        Active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        tableName: 'EmployeeSalaryHistory',
        timestamps: true
    });
};

module.exports = EmployeeSalaryHistory;