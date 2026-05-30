const { DataTypes } = require('sequelize');

const SyncTracker = (sequelize) => {

    return sequelize.define('SyncTracker', {

        SyncTrackerId: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },

        SyncName: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true
        },

        LastAutoId: {
            type: DataTypes.BIGINT,
            allowNull: false,
            defaultValue: 0
        },

        LastSyncTime: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: null
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
        tableName: 'SyncTracker',
        timestamps: true
    });

};

module.exports = SyncTracker;