const { DataTypes } = require('sequelize');

const ESICMst = (sequelize) => {
    return sequelize.define('ESICMst', {
        /* --------------------------- Primary Key --------------------------- */
        ESICCode: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },

        /* --------------------------- Data Fields --------------------------- */
        Sflag: {
            type: DataTypes.CHAR(1),
            allowNull: true
        },

        LogID: {
            type: DataTypes.STRING(50),
            allowNull: true
        },

        PcID: {
            type: DataTypes.STRING(50),
            allowNull: true
        },

        BranchMstId: { type: DataTypes.INTEGER, allowNull: false },
    }, {
        tableName: 'ESICMst',
        timestamps: true,
    });
};

module.exports = ESICMst;