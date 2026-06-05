const { DataTypes } = require('sequelize');

module.exports = salaryMst;

function salaryMst(sequelize) {
    const attributes = {

        SalaryMstId: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },

        CompanyMstId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        DepartmentMstId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        SalaryMonth: {
            type: DataTypes.STRING(7),
            allowNull: false
        },

        Sflag: {
            type: DataTypes.CHAR(1),
            allowNull: true
        },

        LogID: {
            type: DataTypes.INTEGER,
            allowNull: true
        },

        PcID: {
            type: DataTypes.STRING(20),
            allowNull: true
        },

        SortId: {
            type: DataTypes.INTEGER,
            defaultValue: 1
        },

        Active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    };

    return sequelize.define('SalaryMst', attributes, {
        tableName: 'SalaryMst',
        timestamps: true
    });
}