const { DataTypes } = require('sequelize');

module.exports = hoursCategoryMstModel;

function hoursCategoryMstModel(sequelize) {
    const attributes = {
        HolidayMstId: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        Date: { type: DataTypes.STRING() },
        Holiday: { type: DataTypes.STRING() },
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

    return sequelize.define('HolidayMst', attributes, {
        tableName: 'HolidayMst', // Explicitly set the table name
        timestamps: false,
    });
}  