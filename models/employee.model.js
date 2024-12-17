const { DataTypes } = require('sequelize');

module.exports = employeeMstModel;

function employeeMstModel(sequelize) {
    const attributes = {
        EmpMstId: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        EmpName: { type: DataTypes.STRING(30) },
        EmpPassword: { type: DataTypes.STRING() },
        EmpType: { type: DataTypes.STRING(10) },
        EmpGrp: { type: DataTypes.CHAR(5), allowNull: true },
        Sflag: { type: DataTypes.CHAR(1), allowNull: true },
        SDate: { type: DataTypes.STRING, allowNull: true },
        LogID: { type: DataTypes.INTEGER, allowNull: true },
        PcID: { type: DataTypes.STRING(20), allowNull: true },
        Ever: { type: DataTypes.INTEGER, allowNull: true },
        CompanyCode: { type: DataTypes.INTEGER, allowNull: true },
        SortId: { type: DataTypes.INTEGER, allowNull: true },
        Active: { type: DataTypes.BOOLEAN, allowNull: true },
        IsDelete: { type: DataTypes.BOOLEAN, allowNull: true },
        EmpToken: { type: DataTypes.STRING(), allowNull: true },
        EmpTokenCreatedDate: { type: DataTypes.STRING, allowNull: true },
    };

    const options = {
        defaultScope: {
            // exclude password and Token by default
            attributes: { exclude: ['EmpPassword', 'EmpToken'] }
        },
        scopes: {
            // include hash with this scope
            withHash: { attributes: {exclude: ['EmpToken']}, },
            withToken: { attributes: {exclude: ['EmpPassword']}, },
            withAll: { attributes: {}, }

        }
    };

    return sequelize.define('EmployeeMst', attributes, {
        tableName: 'EmployeeMst', // Explicitly set the table name
        timestamps: false,
        ...options 
    });
}  