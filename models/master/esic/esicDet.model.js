const { DataTypes } = require('sequelize');

const ESICDet = (sequelize) => {
    return sequelize.define('ESICDet', {
        /* --------------------------- Primary Key --------------------------- */
        ESICDetId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },

        /* --------------------------- Foreign Key --------------------------- */
        ESICCode: {
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

        CutOffAmt: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: true
        },
        Active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            allowNull: false
        },
    }, {
        tableName: 'ESICDet',
        timestamps: true,
    });
};

module.exports = ESICDet;