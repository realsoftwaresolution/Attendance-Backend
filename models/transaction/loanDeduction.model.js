const { DataTypes } = require('sequelize');

const LoanDeduction = (sequelize) => {
    return sequelize.define('LoanDeduction', {
        LoanDeductionId: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        LoanMstId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        EmpMstId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        DeductionMonth: {
            type: DataTypes.STRING(7),
            allowNull: false
        },
        DeductedAmount: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: false,
            defaultValue: 0
        },
        DeductedFromBank: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: false,
            defaultValue: 0
        },
        DeductedFromCash: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: false,
            defaultValue: 0
        },
        Remark: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        Active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        tableName: 'LoanDeduction',
        timestamps: true,
    });
};

module.exports = LoanDeduction;
