const { DataTypes } = require('sequelize');

module.exports = masterSettingMstModel;

function masterSettingMstModel(sequelize) {
    const attributes = {
        MstId: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        DepCode: { type: DataTypes.STRING(30) },
        Holiday: { type: DataTypes.BOOLEAN },
        HalfDay: {type: DataTypes.BOOLEAN },
        Late: {type: DataTypes.BOOLEAN },
        SalaryOnCalenderDay: {type: DataTypes.BOOLEAN },
        SalaryOnCalenderDayNotSunday: {type: DataTypes.BOOLEAN },
        SalaryOnWorkingDay: {type: DataTypes.BOOLEAN },
        WorkingDay: {type: DataTypes.INTEGER },
        SundayInOT: {type: DataTypes.BOOLEAN },
        SundayInWorking: {type: DataTypes.BOOLEAN },
        SundayInAbsent: {type: DataTypes.BOOLEAN },
        ApplySBeforeAbsent: {type: DataTypes.BOOLEAN },
        ApplySAfterAbsent: {type: DataTypes.BOOLEAN },
        ApplySBothAbsent: {type: DataTypes.BOOLEAN },
        O_T: {type: DataTypes.BOOLEAN },
        HourCategoryCode: {type: DataTypes.STRING },
        OnDay: {type: DataTypes.BOOLEAN },
        OnHours: {type: DataTypes.BOOLEAN },
        PerPc: {type: DataTypes.BOOLEAN },
        AllowLunchBreak: {type: DataTypes.BOOLEAN },
        Sflag: { type: DataTypes.CHAR(1), allowNull: true },
        SDate: { type: DataTypes.STRING, allowNull: true },
        LogID: { type: DataTypes.INTEGER, allowNull: true },
        PcID: { type: DataTypes.STRING(20), allowNull: true },
        Ever: { type: DataTypes.INTEGER, allowNull: true },
        CompanyCode: { type: DataTypes.INTEGER, allowNull: true },
        SortId: { type: DataTypes.INTEGER, allowNull: true },
        Active: { type: DataTypes.BOOLEAN, allowNull: true },
        IsDelete: { type: DataTypes.BOOLEAN, allowNull: true },
    };

    return sequelize.define('MasterSettingMst', attributes, {
        tableName: 'MasterSettingMst',
        timestamps: false,
    });
}  