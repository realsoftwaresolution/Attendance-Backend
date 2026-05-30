const { DataTypes } = require('sequelize');

module.exports = pcModel;

function pcModel(sequelize) {
    const attributes = {
        PcId: {
            type: DataTypes.STRING(100),
            primaryKey: true,
        },
        PcName: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        IpAddress: {
            type: DataTypes.STRING(50),
            allowNull: true,
        },
        MacAddress: {
            type: DataTypes.STRING(50),
            allowNull: true,
        },
        OsInfo: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },
        Status: {
            type: DataTypes.STRING(20),
            defaultValue: 'offline',
        },
        LastSeen: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        PendingCommand: {
            type: DataTypes.STRING(50),
            allowNull: true,
        },
        Active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
    };

    return sequelize.define('PC', attributes, {
        tableName: 'PC',
        timestamps: false,        // 🔥 CHANGE

        });
}
