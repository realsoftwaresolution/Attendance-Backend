const { DataTypes } = require('sequelize');

module.exports = subReportTypeMstModel;

function subReportTypeMstModel(sequelize) {
    const attributes = {
        SubReportTypeMstId: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        SubReportTypeName: { type: DataTypes.STRING() },
        ReportTypeMstId: { type: DataTypes.INTEGER },
        ReportName: { type: DataTypes.STRING() },
        SortId: { type: DataTypes.INTEGER },
        Active: { type: DataTypes.BOOLEAN, allowNull: true },
    };

    return sequelize.define('SubReportTypeMst', attributes, {
        tableName: 'SubReportTypeMst', // Explicitly set the table name
        timestamps: false,
    });
}  