const { DataTypes } = require('sequelize');

const HolidayMst = (sequelize) => {
    return sequelize.define('HolidayMst', {
        HolidayMstId: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        Date: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        Holiday: {
            type: DataTypes.STRING,
            allowNull: false
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
        tableName: 'HolidayMst',
        timestamps: true,
    });
};


module.exports = HolidayMst;