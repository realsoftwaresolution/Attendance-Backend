const { DataTypes } = require('sequelize');

module.exports = userMstModel;

function userMstModel(sequelize) {
    const attributes = {
        UserMstId: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        Username: { type: DataTypes.STRING(30) },
        Password: { type: DataTypes.STRING() },
        UserType: { type: DataTypes.STRING(10) },
        UserGrp: { type: DataTypes.STRING(10), allowNull: true },
        Sflag: { type: DataTypes.CHAR(1), allowNull: true },
        SortId: { type: DataTypes.INTEGER, allowNull: true },
        Active: { type: DataTypes.BOOLEAN, allowNull: true },
        IsDelete: { type: DataTypes.BOOLEAN, allowNull: true },
        Token: {
            type: DataTypes.STRING(4000),
            allowNull: true
        }
    };

    const options = {
        defaultScope: {
            attributes: { exclude: ['Password', 'Token'] }
        },
        scopes: {
            withHash: { attributes: { exclude: ['Token'] }, },
            withToken: { attributes: { exclude: ['Password'] }, },
            withAll: { attributes: {}, }

        }
    };

    return sequelize.define('UserMst', attributes, {
        tableName: 'UserMst',
        timestamps: true,
        ...options
    });
}  