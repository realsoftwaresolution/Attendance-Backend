const { DataTypes } = require('sequelize');

module.exports = attendanceMstModel;

function attendanceMstModel(sequelize) {
    const attributes = {
        AttendanceMstId: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
        EmpId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        Department: {
            type: DataTypes.STRING,
            allowNull: false
        },
        Shift: {
            type: DataTypes.STRING,
            allowNull: false
        },
        InTime: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        OutTime: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        IsPresent: {
            type: DataTypes.BOOLEAN,
            allowNull: true
        },
        IsHalfDay: {
            type: DataTypes.BOOLEAN,
            allowNull: true
        },
        Date: {
            type:DataTypes.STRING(30),
            allowNull: false,
        },
        Overtime: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        onLeave: {
            type: DataTypes.BOOLEAN,
            allowNull: true
        },
        TotalHours: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true
        },
        Sflag: { type: DataTypes.CHAR(1), allowNull: true },
        SDate: { type: DataTypes.STRING, allowNull: true },
        LogID: { type: DataTypes.INTEGER, allowNull: true },
        PcID: { type: DataTypes.STRING(20), allowNull: true },
        Ever: { type: DataTypes.INTEGER, allowNull: true },
        CompanyCode: { type: DataTypes.INTEGER, allowNull: true },
        SortId: { type: DataTypes.INTEGER, allowNull: true },
        Active: { type: DataTypes.BOOLEAN, allowNull: true },
        IsDelete: { type: DataTypes.BOOLEAN, allowNull: true },
    };

    // const options = {
    //     defaultScope: {
    //         // exclude password and Token by default
    //         attributes: { exclude: ['Password', 'Token'] }
    //     },
    //     scopes: {
    //         // include hash with this scope
    //         withHash: { attributes: {exclude: ['Token']}, },
    //         withToken: { attributes: {exclude: ['Password']}, },
    //         withAll: { attributes: {}, }

    //     }
    // };

    return sequelize.define('AttendanceMst', attributes, {
        tableName: 'AttendanceMst', // Explicitly set the table name
        timestamps: false,
    });
}  