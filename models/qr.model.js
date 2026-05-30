// models/qrScanner.model.js

const { DataTypes } = require('sequelize');

module.exports = qrScannerModel;

function qrScannerModel(sequelize) {
    const attributes = {
        QRScannerId: { 
            type: DataTypes.BIGINT, 
            primaryKey: true, 
            autoIncrement: true 
        },
        QRCode: {
            type: DataTypes.STRING(100),
            allowNull: false,
            comment: 'Unique QR code identifier'
        },
        QROwnerNumber: {
            type: DataTypes.STRING(20),
            allowNull: false,
            comment: 'Phone number of QR creator'
        },
        QROwnerName: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: 'Name of QR creator'
        },
        ScannerName: {
            type: DataTypes.STRING(100),
            allowNull: false,
            comment: 'Name of person who scanned'
        },
        ScannerNumber: {
            type: DataTypes.STRING(20),
            allowNull: false,
            comment: 'Phone number of scanner'
        },
        DeviceBrand: {
            type: DataTypes.STRING(50),
            allowNull: true
        },
        DeviceModel: {
            type: DataTypes.STRING(50),
            allowNull: true
        },
        DeviceOS: {
            type: DataTypes.STRING(50),
            allowNull: true
        },
        Latitude: {
            type: DataTypes.DECIMAL(10, 8),
            allowNull: true
        },
        Longitude: {
            type: DataTypes.DECIMAL(11, 8),
            allowNull: true
        },
        LocationAddress: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        ScanCount: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1
        },
        FirstScanDate: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        LastScanDate: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        Active: { 
            type: DataTypes.BOOLEAN, 
            allowNull: false,
            defaultValue: true 
        },
        IsDelete: { 
            type: DataTypes.BOOLEAN, 
            allowNull: false,
            defaultValue: false 
        },
    };

    return sequelize.define('QRScanner', attributes, {
        tableName: 'QRScannerMst',
        timestamps: false,
        // createdAt: 'CreatedAt',
        // updatedAt: 'UpdatedAt'
    });
}