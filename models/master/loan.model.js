const { DataTypes } = require('sequelize');
const { toDefaultValue } = require('sequelize/lib/utils');

const LoanMst = (sequelize) => {
    return sequelize.define('LoanMst', {
        LoanMstId: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        LoanDate: { type: DataTypes.DATE, allowNull: false },
        EmpMstId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        LoanAmount: { type: DataTypes.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
        MonthlyInstallment: { type: DataTypes.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
        StartingDate: { type: DataTypes.DATEONLY, allowNull: false },
        TotalInstallments: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
        DeductFromBank: { type: DataTypes.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
        DeductFromCash: { type: DataTypes.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
        Remark: { type: DataTypes.TEXT, allowNull: true },
        IsClosed: { type: DataTypes.BOOLEAN, defaultValue: false },
        CloseRemark: { type: DataTypes.TEXT, allowNull: true },
        Sflag: DataTypes.CHAR(1),
        LogID: DataTypes.INTEGER,
        PcID: DataTypes.STRING(20),
        SortId: { type: DataTypes.INTEGER, defaultValue: 1 },
        Active: { type: DataTypes.BOOLEAN, defaultValue: true },
    }, {
        tableName: 'LoanMst',
        timestamps: true,
    });
};

module.exports = LoanMst;