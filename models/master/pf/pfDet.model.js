const { DataTypes } = require('sequelize');

const PFDet = (sequelize) => {
    return sequelize.define('PFDet', {
        /* --------------------------- Primary Key --------------------------- */
        PFDetId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },

        /* --------------------------- Foreign Key --------------------------- */
        PFCode: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        /* --------------------------- Data Fields --------------------------- */
        Srno: {
            type: DataTypes.INTEGER,
            allowNull: true
        },

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

        EPF: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: true
        },

        EPS: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: true
        },

        CompanyMstId: { type: DataTypes.INTEGER, allowNull: false },

        BranchMstId: { type: DataTypes.INTEGER, allowNull: false },

        EPFAB: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: true
        },

        Acc02: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: true
        },

        Acc21: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: true
        },

        Acc22: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: true
        },

        CutOffAmt: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: true
        },

        EPSCutOffAge: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        Active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            allowNull: false
        },
    }, {
        tableName: 'PFDet',
        timestamps: true,
    });
};

module.exports = PFDet;