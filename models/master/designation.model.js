const { DataTypes } = require('sequelize');

const DesignationMst = (sequelize) => {
    return sequelize.define('DesignationMst', {
        DesignationMstId: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        Code: {
            type: DataTypes.STRING(30),
            allowNull: false
        },
        Designation: {
            type: DataTypes.STRING,
            allowNull: false
        },
        Sflag: DataTypes.CHAR(1),
        LogID: DataTypes.INTEGER,
        PcID: DataTypes.STRING(20),
        CompanyCode: DataTypes.INTEGER,
        SortId: {
            type: DataTypes.INTEGER,
            defaultValue: 1
        },
        Active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        IsDelete: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        }
    }, {
        tableName: 'DesignationMst',
        timestamps: true,
    });
};

module.exports = DesignationMst;