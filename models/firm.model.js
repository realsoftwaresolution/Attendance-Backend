const { DataTypes } = require('sequelize');

module.exports = hoursCategoryMstModel;

function hoursCategoryMstModel(sequelize) {
    const attributes = {
        FirmMstId: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        Code: { type: DataTypes.INTEGER },
        FirmName: { type: DataTypes.STRING },
        OwnerName: { type: DataTypes.STRING },
        PartnerName: { type: DataTypes.STRING },
        Designation: { type: DataTypes.STRING },
        CorporateCode: { type: DataTypes.STRING },
        Address: { type: DataTypes.STRING },
        PANNo: { type: DataTypes.STRING },
        TANNo: { type: DataTypes.STRING },
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

    return sequelize.define('FirmMst', attributes, {
        tableName: 'FirmMst', // Explicitly set the table name
        timestamps: false,
    });
}  