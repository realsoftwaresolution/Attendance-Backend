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

        EffectiveMonth: {
            type: DataTypes.STRING(7),
            allowNull: false
        },

        CashSalary: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: false,
            defaultValue: 0
        },

        BankSalary: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: false,
            defaultValue: 0
        },

        TotalSalary: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: false
        },

        SalaryType: {
            type: DataTypes.STRING(30),
            allowNull: false,
            defaultValue: 'Fixed'
        },

        /* ------------------------------ Bank Details ------------------------------ */
        EmpBankFullName: {
            type: DataTypes.STRING,
            allowNull: true
        },

        EmpBankName: {
            type: DataTypes.STRING,
            allowNull: true
        },

        EmpBankACNo: {
            type: DataTypes.STRING(50),
            allowNull: true
        },

        EmpBankIFSCode: {
            type: DataTypes.STRING(20),
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