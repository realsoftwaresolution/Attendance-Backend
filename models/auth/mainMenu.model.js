const { DataTypes } = require('sequelize');

module.exports = MainMenuMst;

function MainMenuMst(sequelize) {
    const attributes = {
        MainMenuMstId: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        MainMenuName: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        Active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            allowNull: false
        }
    };

    return sequelize.define('MainMenuMst', attributes, {
        tableName: 'MainMenuMst',
        timestamps: false,
    });
}