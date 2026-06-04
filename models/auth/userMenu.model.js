const { DataTypes } = require('sequelize');

module.exports = UserMenuMst;

function UserMenuMst(sequelize) {
    const attributes = {
        UserMenuMstId: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        UserMstId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        MenuMstId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        MainMenuMstId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        isCreate: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false
        },
        isEdit: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false
        },
        isDelete: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false
        },
        isView: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false
        }
    };

    return sequelize.define('UserMenuMst', attributes, {
        tableName: 'UserMenuMst',
        timestamps: false,
    });
}