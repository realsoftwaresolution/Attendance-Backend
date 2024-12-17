const { DataTypes } = require('sequelize');

module.exports = userMstModel;

function userMstModel(sequelize) {
    const attributes = {
        UserMstId: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        Username: { type: DataTypes.STRING(30) },
        Password: { type: DataTypes.STRING() },
        UserType: { type: DataTypes.STRING(10) },
        UserGrp: { type: DataTypes.CHAR(5), allowNull: true },
        Sflag: { type: DataTypes.CHAR(1), allowNull: true },
        SDate: { type: DataTypes.STRING, allowNull: true },
        LogID: { type: DataTypes.INTEGER, allowNull: true },
        PcID: { type: DataTypes.STRING(20), allowNull: true },
        Ever: { type: DataTypes.INTEGER, allowNull: true },
        CompanyCode: { type: DataTypes.INTEGER, allowNull: true },
        SortId: { type: DataTypes.INTEGER, allowNull: true },
        Active: { type: DataTypes.BOOLEAN, allowNull: true },
        IsDelete: { type: DataTypes.BOOLEAN, allowNull: true },
        Token: { type: DataTypes.STRING(), allowNull: true },
        TokenCreatedDate: { type: DataTypes.STRING, allowNull: true },
    };

    const options = {
        defaultScope: {
            // exclude password and Token by default
            attributes: { exclude: ['Password', 'Token'] }
        },
        scopes: {
            // include hash with this scope
            withHash: { attributes: {exclude: ['Token']}, },
            withToken: { attributes: {exclude: ['Password']}, },
            withAll: { attributes: {}, }

        }
    };

    return sequelize.define('UserMst', attributes, {
        tableName: 'UserMst', // Explicitly set the table name
        timestamps: false,
        ...options 
    });
}  