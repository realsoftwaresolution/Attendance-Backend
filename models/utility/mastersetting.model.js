const { DataTypes } = require('sequelize');

const MasterSettingMst = (sequelize) => {
    return sequelize.define('MasterSettingMst', {
        SettingMstId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },

        DepartmentMstId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        CompanyMstId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        /* ---------------- Salary Deduction Settings ---------------- */

        ApplyHolidayOnSalaryCalculation: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },

        ApplyHalfDayOnSalaryCalculation: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },

        ApplyLateOnSalaryCalculation: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },

        AllowLunchBreak: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },

        /* ---------------- monthly, hourly, permin salary cal. helper ---------------- */

        SalaryCalculateOnCalendarDay: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },

        SalaryCalculateOnCalendarDayWithoutSunday: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },

        SalaryCalculateOnWorkingDay: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },

        WorkingDays: {
            type: DataTypes.INTEGER,
            allowNull: true
        },

        HoursCategoryMstId: {
            type: DataTypes.INTEGER,
            allowNull: true
        },

        /* ---------------- original calculation of emp based on this --------------- */

        SalaryCalculateOnDay: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },

        SalaryCalculateOnHours: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },

        SalaryCalculateOnPerPc: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },

        /* ---------------- Sunday Settings ---------------- */

        ApplySundayAsPresentDay: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },

        MarkSundayAbsentIfPreviousDayAbsent: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },

        MarkSundayAbsentIfNextDayAbsent: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },

        MarkSundayAbsentIfBothDaysAbsent: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },

        ApplySundayInOvertime: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },

        ApplySundayInAbsentDay: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },

        /* ---------------- Audit ---------------- */

        Active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },

        IsDelete: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },

        Sflag: {
            type: DataTypes.CHAR(1),
            allowNull: true
        },

        LogID: {
            type: DataTypes.STRING(50),
            allowNull: true
        },

        PcID: {
            type: DataTypes.STRING(50),
            allowNull: true
        },

    }, {
        tableName: 'MasterSettingMst',
        timestamps: true
    });
};

module.exports = MasterSettingMst;