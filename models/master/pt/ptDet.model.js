const { DataTypes } = require('sequelize');

const PTDet = (sequelize) => {
    return sequelize.define('PTDet', {
        /* --------------------------- Primary Key --------------------------- */
        PTDetId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },

        /* --------------------------- Foreign Key --------------------------- */
        PTCode: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        /* --------------------------- Data Fields --------------------------- */
        Srno: {
            type: DataTypes.INTEGER,
            allowNull: true
        },

        BranchMstId: { type: DataTypes.INTEGER, allowNull: false },

        FromDate: {
             type: DataTypes.DATEONLY,
            allowNull: true
        },

        ToDate: {
             type: DataTypes.DATEONLY,
            allowNull: true
        },

        FromAmt: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: true
        },

        ToAmt: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: true
        },

        TaxRate: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: true
        },

        CompanyMstId: { type: DataTypes.INTEGER, allowNull: false },
        Active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            allowNull: false
        },
    }, {
        tableName: 'PTDet',
        timestamps: true,
    });
};

module.exports = PTDet;