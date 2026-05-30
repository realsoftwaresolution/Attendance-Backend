const { DataTypes } = require('sequelize');

const CompanyMst = (sequelize) => {
    return sequelize.define('CompanyMst', {
        CompanyMstId: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        Code: { type: DataTypes.STRING(30), allowNull: false },
        CompanyName: { type: DataTypes.STRING, allowNull: false },
        OwnerName: DataTypes.STRING,
        PartnerName: DataTypes.STRING,
        Designation: DataTypes.STRING,
        CorporateCode: DataTypes.STRING,
        Address: DataTypes.STRING,
        PANNo: DataTypes.STRING,
        TANNo: DataTypes.STRING,
        Sflag: DataTypes.CHAR(1),
        LogID: DataTypes.INTEGER,
        PcID: DataTypes.STRING(20),
        SortId: { type: DataTypes.INTEGER, defaultValue: 1 },
        Active: { type: DataTypes.BOOLEAN, defaultValue: true },
        IsDelete: { type: DataTypes.BOOLEAN, defaultValue: false }
    }, {
        tableName: 'CompanyMst',
        timestamps: true,
    });
};

module.exports = CompanyMst;