const { DataTypes } = require('sequelize');

const ShiftEntryMst = (sequelize) => {

    const sqlServerTime = 'TIME';

    return sequelize.define('ShiftEntryMst', {

        /* ---------------------------- Basic Details ---------------------------- */

        ShiftEntryMstId: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },

        FromDate: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },


        ToDate: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            defaultValue: null
        },

        CompanyMstId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        DepartmentMstId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        ShiftType: {
            type: DataTypes.STRING(20),
            allowNull: false,
            validate: {
                isIn: {
                    args: [['Morning', 'Evening', 'Night']],
                    msg: "ShiftType must be exactly 'Morning', 'Evening', or 'Night'."
                }
            }
        },

        /* ------------------------------ Shift Time ----------------------------- */

        ShiftIn: {
            type: sqlServerTime,
            allowNull: false,
            defaultValue: '00:00:00'
        },

        ShiftOut: {
            type: sqlServerTime,
            allowNull: false,
            defaultValue: '00:00:00'
        },

        /* ---------------------------- Pre Shift OT ---------------------------- */

        IsPreShiftOT: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },

        PreShiftOTIn: {
            type: sqlServerTime,
            allowNull: true
        },

        PreShiftOTOut: {
            type: sqlServerTime,
            allowNull: true
        },

        /* ---------------------------- Post Shift OT ---------------------------- */

        IsPostShiftOT: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },

        PostShiftOTIn: {
            type: sqlServerTime,
            allowNull: true
        },

        PostShiftOTOut: {
            type: sqlServerTime,
            allowNull: true
        },

        /* ------------------------------ Lunch Break ----------------------------- */

        IsLunchBreak: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },

        LunchIn: {
            type: sqlServerTime,
            allowNull: true
        },

        LunchOut: {
            type: sqlServerTime,
            allowNull: true
        },

        /* ------------------------------ Half Day ------------------------------ */

        IsHalfDayRule: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },

        HalfDayHours: {
            type: DataTypes.FLOAT,
            allowNull: true,
            defaultValue: 4
        },

        /* ------------------------------ Grace Time ----------------------------- */

        IsGraceTime: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },

        GraceMinutes: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 0
        },

        MonthlyTargetHours: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: 192.00 // Example: 8 hours * 24 days
        },

        /* ----------------------------- Common Fields ---------------------------- */

        SortId: {
            type: DataTypes.INTEGER,
            defaultValue: 1
        },

        Active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },

        Sflag: {
            type: DataTypes.CHAR(1),
            defaultValue: 'I'
        },

        LogID: {
            type: DataTypes.INTEGER,
            allowNull: true
        },

        PcID: {
            type: DataTypes.STRING(20),
            allowNull: true
        }

    }, {
        tableName: 'ShiftEntryMst',
        timestamps: true
    });
};

module.exports = ShiftEntryMst;