const { DataTypes } = require('sequelize');

const AdvanceMst = (sequelize) => {
    return sequelize.define('AdvanceMst', {
        AdvanceMstId: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },

        EmpMstId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        CompanyMstId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        DepartmentMstId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        DesignationMstId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        AdvanceDate: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },

        AdvanceType: {
            type: DataTypes.STRING(30),
            allowNull: false
        },

        AdvanceAmount: {
            type: DataTypes.DECIMAL(18, 2),
            allowNull: false
        },

        Remarks: {
            type: DataTypes.STRING(500),
            allowNull: true
        },

        IsClosed: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },

        ClosedDate: {
            type: DataTypes.DATEONLY,
            allowNull: true
        },

        Active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }

    }, {
        tableName: 'AdvanceMst',
        timestamps: true
    });
};

module.exports = AdvanceMst;