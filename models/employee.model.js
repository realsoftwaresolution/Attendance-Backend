const { DataTypes } = require('sequelize');

module.exports = employeeMstModel;

function employeeMstModel(sequelize) {
    const attributes = {
        EmpMstId: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        EmpFullName: { type: DataTypes.STRING() },
        EmpUsername: { type: DataTypes.STRING(30) },
        EmpPassword: { type: DataTypes.STRING() },
        EmpType: { type: DataTypes.STRING(10) },
        EmpBranch: { type: DataTypes.STRING(10) },
        EmpDepartment: { type: DataTypes.STRING(10) },
        EmpBankFullName: { type: DataTypes.STRING() },
        EmpDesignation: { type: DataTypes.STRING(10) },
        EmpFirm: { type: DataTypes.STRING(10) },
        EmpSalary: { type: DataTypes.DECIMAL(18, 2) },
        EmpPhoneNo: { type: DataTypes.STRING(20) },
        EmpBankName: { type: DataTypes.STRING() },
        EmpBankACNo: { type: DataTypes.STRING() },
        EmpBankIFSCode: { type: DataTypes.STRING(30) },
        EmpSalaryType: { type: DataTypes.STRING(30) },
        EmpCode: { type: DataTypes.STRING(10) },
        EmpPANNo: { type: DataTypes.STRING(30) },
        EmpESINo: { type: DataTypes.STRING(10) },
        EmpAddress: { type: DataTypes.STRING() },
        DateOfJoinng: {type: DataTypes.STRING},
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
        EmpFaceData: { type: DataTypes.TEXT, allowNull: true }, // Array of image paths as JSON string
        DocumentPaths: { type: DataTypes.TEXT, allowNull: true }, // Array of document paths as JSON string
        
    };

    const options = {
        defaultScope: {
            // exclude password and Token by default
            attributes: { exclude: ['EmpPassword', 'EmpToken', 'EmpFaceData'] }
        },
        scopes: {
            // include hash with this scope
            withHash: { attributes: {exclude: ['EmpToken', 'EmpFaceData']}, },
            withToken: { attributes: {exclude: ['EmpPassword', 'EmpFaceData']}, },
            withAll: { attributes: {}, },
            onlyFaceData: { attributes:{include: ['EmpFaceData']},}

        }
    };

    return sequelize.define('EmployeeMst', attributes, {
        tableName: 'EmployeeMst', // Explicitly set the table name
        timestamps: false,
        ...options 
    });
}  