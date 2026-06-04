const { DataTypes } = require('sequelize');

// Export the function name for consistency
module.exports = UserReportMst;

function UserReportMst(sequelize) {
    const attributes = {
        UserReportMstId: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        UserMstId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        ReportTypeMstId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        SubReportTypeMstId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        isView: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false
        }
    };

    return sequelize.define('UserReportMst', attributes, {
        tableName: 'UserReportMst',
        timestamps: false,
    });
}