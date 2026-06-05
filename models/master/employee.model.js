const { DataTypes } = require('sequelize');

module.exports = employeeMstModel;

function employeeMstModel(sequelize) {
    const attributes = {
        EmpMstId: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        EmpCode: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        EmpFullName: {
            type: DataTypes.STRING,
            allowNull: false
        },
        EmpType: {
            type: DataTypes.STRING(10),
            allowNull: false
        },

        BranchMstId: { type: DataTypes.INTEGER, allowNull: false },
        DepartmentMstId: { type: DataTypes.INTEGER, allowNull: false },
        DesignationMstId: { type: DataTypes.INTEGER, allowNull: false },
        CompanyMstId: { type: DataTypes.INTEGER, allowNull: false },


        EmpPhoneNo: { type: DataTypes.STRING(20) },
        EmpPANNo: { type: DataTypes.STRING(30) },
        EmpESINo: { type: DataTypes.STRING(50) },

        EmpAddress: { type: DataTypes.STRING },
        DateOfJoining: { type: DataTypes.STRING },
        DateOfBirth: {
            type: DataTypes.STRING(10),
            allowNull: true
        },
        EmpGrp: { type: DataTypes.STRING(30), allowNull: true },

        IsPFApplicable: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },

        IsEPSApplicable: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },

        PFEffectiveMonth: {
            type: DataTypes.STRING(7),
            allowNull: true
        },

        UANNo: {
            type: DataTypes.STRING(50),
            allowNull: true
        },

        PFNo: {
            type: DataTypes.STRING(50),
            allowNull: true
        },

        IsESICApplicable: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },

        ESICEffectiveMonth: {
            type: DataTypes.STRING(7),
            allowNull: true
        },

        ESINo: {
            type: DataTypes.STRING(50),
            allowNull: true
        },

        IsPTApplicable: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },

        PTEffectiveMonth: {
            type: DataTypes.STRING(7),
            allowNull: true
        },

        PTRemarks: {
            type: DataTypes.STRING(255),
            allowNull: true
        },

        // Banking Configurations
        EmpBankFullName: { type: DataTypes.STRING },
        EmpBankName: { type: DataTypes.STRING },
        EmpBankACNo: { type: DataTypes.STRING(50) },
        EmpBankIFSCode: { type: DataTypes.STRING(20) },

        // Avatar & Document Reference String Path Storage
        ProfileImage: { type: DataTypes.STRING, allowNull: true },
        DocumentPaths: { type: DataTypes.TEXT, allowNull: true },

        // 3-Angle Facial Biometric Registrations
        BiometricVectorFront: { type: DataTypes.TEXT, allowNull: true },
        BiometricVectorLeft: { type: DataTypes.TEXT, allowNull: true },
        BiometricVectorRight: { type: DataTypes.TEXT, allowNull: true },

        // Audit Engine Metadata Flags
        Sflag: { type: DataTypes.CHAR(1), allowNull: true },
        LogID: { type: DataTypes.INTEGER, allowNull: true },
        PcID: { type: DataTypes.STRING(20), allowNull: true },
        SortId: { type: DataTypes.INTEGER, defaultValue: 1, allowNull: true },
        Active: { type: DataTypes.BOOLEAN, defaultValue: true, allowNull: true },
    };

    return sequelize.define('EmployeeMst', attributes, {
        tableName: 'EmployeeMst',
        timestamps: true,
    });
}