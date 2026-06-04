const { DataTypes } = require('sequelize');

module.exports = ReportTypeMst;

function ReportTypeMst(sequelize) {
    const attributes = {
        ReportTypeMstId: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        ReportTypeName: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        Active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            allowNull: false
        }
    };

    return sequelize.define('ReportTypeMst', attributes, {
        tableName: 'ReportTypeMst',
        timestamps: false,
    });
}