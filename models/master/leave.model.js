module.exports = (sequelize, DataTypes) => {
    const LeaveMst = sequelize.define("LeaveMst", {
        LeaveMstId: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        EmpMstId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        LeaveType: {
            type: DataTypes.STRING(50),
            allowNull: false,
            // e.g. Casual_Leave, Sick_Leave, Earned_Leave, Leave_Without_Pay, Other
        },
        DurationType: {
            type: DataTypes.STRING(50),
            allowNull: false,
            // e.g. Full_Day, Half_Day, Short_Leave_Hourly
        },
        StartDate: {
            type: DataTypes.STRING(10), // YYYY-MM-DD
            allowNull: true 
        },
        EndDate: {
            type: DataTypes.STRING(10), // YYYY-MM-DD
            allowNull: true
        },
        LeaveDate: {
            type: DataTypes.STRING(10), // YYYY-MM-DD
            allowNull: true
        },
        Session: {
            type: DataTypes.STRING(20),
            allowNull: true,
            // e.g. First_Half, Second_Half
        },
        HourlyDuration: {
            type: DataTypes.FLOAT,
            allowNull: true
        },
        DurationDays: {
            type: DataTypes.FLOAT,
            allowNull: false,
            defaultValue: 0
        },
        Reason: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        Status: {
            type: DataTypes.STRING(20),
            allowNull: false,
            defaultValue: "Pending", // Pending, Approved, Rejected
        },
        ApprovedBy: {
            type: DataTypes.INTEGER, // UserMstId of admin
            allowNull: true
        },
        ApprovalRemarks: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        
        // Audit Metadata
        Sflag: { type: DataTypes.CHAR(1), allowNull: true },
        LogID: { type: DataTypes.INTEGER, allowNull: true },
        PcID: { type: DataTypes.STRING(20), allowNull: true },
        Active: { type: DataTypes.BOOLEAN, defaultValue: true }
    }, {
        tableName: "LeaveMst",
        timestamps: true
    });

    return LeaveMst;
};
