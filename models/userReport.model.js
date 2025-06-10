const { DataTypes } = require('sequelize');

module.exports = userReportMstModel;

function userReportMstModel(sequelize) {
    const attributes = {
        UserReportMstId: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        UserMstId: { type: DataTypes.INTEGER },
        ReportTypeMstId: { type: DataTypes.INTEGER },
        SubReportTypeMstId: { type: DataTypes.INTEGER }
    };

    return sequelize.define('UserReportMst', attributes, {
        tableName: 'UserReportMst', // Explicitly set the table name
        timestamps: false,
    });
}  