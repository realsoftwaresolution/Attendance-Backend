const { DataTypes } = require('sequelize');

const DepartmentMst = (sequelize) => {
    return sequelize.define('DepartmentMst', {
        DepartmentMstId: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        Code: {
            type: DataTypes.STRING(30),
            allowNull: false
        },
        Department: {
            type: DataTypes.STRING,
            allowNull: false
        },
        MonthHours: {
            type: DataTypes.STRING,
            allowNull: true
        },
        Sflag: DataTypes.CHAR(1),
        LogID: DataTypes.INTEGER,
        PcID: DataTypes.STRING(20),
        CompanyCode: DataTypes.INTEGER,
        SortId: {
            type: DataTypes.INTEGER,
            defaultValue: 1
        },
        Active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        IsDelete: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        }
    }, {
        tableName: 'DepartmentMst',
        timestamps: true,
    });
};


module.exports = DepartmentMst;