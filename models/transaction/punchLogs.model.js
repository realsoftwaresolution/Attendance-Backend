const { DataTypes } = require('sequelize');

const PunchLogs = (sequelize) => {
    return sequelize.define('PunchLogs', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        SyncTrackerId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        EmpCode: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        punchTime: {
            type: DataTypes.DATE,
            allowNull: false
        },
        punchType: {
            type: DataTypes.STRING(10), // IN / OUT
            allowNull: false
        },
        punchSource: {
            type: DataTypes.STRING(50), // BIOMETRIC / MOBILE
            allowNull: false
        }
    }, {
        tableName: 'PunchLogs',
        timestamps: false 
    });
};

module.exports = PunchLogs;