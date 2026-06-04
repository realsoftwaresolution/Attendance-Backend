const { DataTypes } = require('sequelize');

const PFMst = (sequelize) => {
    return sequelize.define('PFMst', {
        /* --------------------------- Primary Key --------------------------- */
        PFCode: {
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
        tableName: 'PFMst',
        timestamps: true,
    });
};

module.exports = PFMst;