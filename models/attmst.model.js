const { DataTypes } = require('sequelize');

module.exports = attMstModel;

function attMstModel(sequelize) {
    const attributes = {
        AttMstId: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
        AttDate: {
            type: DataTypes.STRING(30),
            allowNull: false,
        },
        EmpId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        Department: {
            type: DataTypes.STRING,
            allowNull: false
        },
        InTime1: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        OutTime1: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        InTime2: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        OutTime2: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        InTime3: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        OutTime3: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        InTime4: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        OutTime4: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        InTime5: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        OutTime5: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        InTime6: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        OutTime6: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        InTime7: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        OutTime7: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        InTime8: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        OutTime8: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        InTime9: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        OutTime9: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        WorkHours: {
            type: DataTypes.STRING,
            allowNull: true
        },
        WorkH: {
            type: DataTypes.STRING,
            allowNull: true
        },
        OTHours: {
            type: DataTypes.STRING,
            allowNull: true
        },
        Work: { type: DataTypes.STRING, allowNull: true },
        Holiday: { type: DataTypes.STRING, allowNull: true },
        OffType: { type: DataTypes.STRING, allowNull: true },
        SWork: { type: DataTypes.STRING, allowNull: true },
        LunchBreak: { type: DataTypes.STRING, allowNull: true },
        LastOutTime: { type: DataTypes.STRING, allowNull: true },
        TotalSalary: {type: DataTypes.DECIMAL(18,2), allowNull: true},
        OTSalary: {type: DataTypes.DECIMAL(18,2), allowNull: true},
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

    return sequelize.define('AttMst', attributes, {
        tableName: 'AttMst', // Explicitly set the table name
        timestamps: false,
    });
}  