const { DataTypes } = require('sequelize');

module.exports = MenuMst;

function MenuMst(sequelize) {
    const attributes = {
        MenuMstId: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        MenuName: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        MainMenuMstId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        FormName: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        SortId: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        Active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            allowNull: false
        }
    };

    return sequelize.define('MenuMst', attributes, {
        tableName: 'MenuMst',
        timestamps: false,
    });
}