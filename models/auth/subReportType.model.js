const { DataTypes } = require('sequelize');

// Export the function name for consistency
module.exports = SubReportTypeMst;

function SubReportTypeMst(sequelize) {
    const attributes = {
        SubReportTypeMstId: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        SubReportTypeName: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        ReportTypeMstId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        ReportName: {
            type: DataTypes.STRING(255),
            allowNull: true
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

    return sequelize.define('SubReportTypeMst', attributes, {
        tableName: 'SubReportTypeMst',
        timestamps: false,
    });
}