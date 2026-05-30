const { DataTypes } = require('sequelize');

module.exports = userMenuMstModel;

function userMenuMstModel(sequelize) {
    const attributes = {
        UserMenuMstId: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        UserMstId: { type: DataTypes.INTEGER },
        MenuMstId: { type: DataTypes.INTEGER },
        MainMenuMstId: { type: DataTypes.INTEGER }
    };

    return sequelize.define('UserMenuMst', attributes, {
        tableName: 'UserMenuMst',
        timestamps: false,
    });
}  