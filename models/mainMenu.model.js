const { DataTypes } = require('sequelize');

module.exports = mainMenuMstModel;

function mainMenuMstModel(sequelize) {
    const attributes = {
        MainMenuMstId: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        MainMenuName: { type: DataTypes.STRING() },
        Active: { type: DataTypes.BOOLEAN, allowNull: true },
    };

    return sequelize.define('MainMenuMst', attributes, {
        tableName: 'MainMenuMst', // Explicitly set the table name
        timestamps: false,
    });
}  