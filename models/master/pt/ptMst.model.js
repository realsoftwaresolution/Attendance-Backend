const { DataTypes } = require('sequelize');

const PTMst = (sequelize) => {
    return sequelize.define('PTMst', {
        /* --------------------------- Primary Key --------------------------- */
        PTCode: {
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
        tableName: 'PTMst',
        timestamps: true,
    });
};

module.exports = PTMst;