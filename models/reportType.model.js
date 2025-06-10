const { DataTypes } = require('sequelize');

module.exports = reportTypeMstModel;

function reportTypeMstModel(sequelize) {
    const attributes = {
        ReportTypeMstId: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        ReportTypeName: { type: DataTypes.STRING() },
        Active: { type: DataTypes.BOOLEAN, allowNull: true },
    };

    return sequelize.define('ReportTypeMst', attributes, {
        tableName: 'ReportTypeMst', // Explicitly set the table name
        timestamps: false,
    });
}  