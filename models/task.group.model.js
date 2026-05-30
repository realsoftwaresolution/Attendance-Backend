const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Group = sequelize.define('Group', {
      GroupId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      GroupName: {
        type: DataTypes.STRING(200),
        allowNull: false
      },
      CreatedBy: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      Description: {
        type: DataTypes.TEXT
      },
      IsActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      CreatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      }
    }, {
      tableName: 'Groups',
      timestamps: false
    });
  
    return Group;
  };