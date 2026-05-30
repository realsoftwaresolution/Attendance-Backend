const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    return sequelize.define('DailyAttendanceSummary', {
        SummaryId: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        EmpMstId: { type: DataTypes.INTEGER, allowNull: false },
        EmpCode: { type: DataTypes.INTEGER, allowNull: false },
        attendanceDate: { type: DataTypes.DATEONLY, allowNull: false },

        // --- Metrics from Attendance Engine ---
        ShiftEntryMstId: { type: DataTypes.INTEGER },
        Status: { type: DataTypes.STRING(20) }, // e.g., Present, Absent, Half Day
        WorkHours: { type: DataTypes.STRING(10) },
        OTHours: { type: DataTypes.STRING(10) },
        LunchBreak: { type: DataTypes.STRING(10) },
        FinalTotalHours: { type: DataTypes.STRING(10) },

        WorkGapMinutes: { type: DataTypes.STRING(10), defaultValue: "00:00" },
        OTGapMinutes: { type: DataTypes.STRING(10), defaultValue: "00:00" },

        // --- Hourly/Target Reference (Used for calculations) ---
        OriginalWorkingHours: { type: DataTypes.STRING(10) },
        OriginalOTHours: { type: DataTypes.STRING(10) },

        // --- Financial Snapshot (Per Day) ---
        BaseMonthlySalary: { type: DataTypes.DECIMAL(18, 2) },
        HourlyWageRate: { type: DataTypes.DECIMAL(18, 4) },
        PerMinuteWageRate: { type: DataTypes.DECIMAL(18, 4) },

        // Daily Earning/Deduction Snapshot
        FinalDailyWagesEarned: { type: DataTypes.DECIMAL(18, 2) },
        DailyOTEarned: { type: DataTypes.DECIMAL(18, 2) },

        // --- Audit & Context ---
        IsHoliday: { type: DataTypes.BOOLEAN, defaultValue: false },
        HolidayName: { type: DataTypes.STRING(100), allowNull: true }
    }, {
        tableName: 'DailyAttendanceSummary',
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ['EmpMstId', 'attendanceDate']
            },
            {
                unique: true,
                fields: ['EmpCode', 'attendanceDate']
            }
        ]
    });
};