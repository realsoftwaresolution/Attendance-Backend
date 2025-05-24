const { DataTypes } = require('sequelize');

module.exports = menuMstModel;

function menuMstModel(sequelize) {
    const attributes = {
        MenuMstId: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        MenuName: { type: DataTypes.STRING() },
        MainMenuMstId: { type: DataTypes.INTEGER },
        FormName: { type: DataTypes.STRING() },
        SortId: { type: DataTypes.INTEGER },
        Active: { type: DataTypes.BOOLEAN, allowNull: true },
    };

    return sequelize.define('MenuMst', attributes, {
        tableName: 'MenuMst', // Explicitly set the table name
        timestamps: false,
    });
}  