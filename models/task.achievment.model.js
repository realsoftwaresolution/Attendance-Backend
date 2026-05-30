const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Achievement = sequelize.define('Achievement', {
    AchievementId: { 
      type: DataTypes.INTEGER, 
      autoIncrement: true, 
      primaryKey: true 
    },
    UserId: { 
      type: DataTypes.INTEGER, 
      allowNull: false 
    },
    Title: { 
      type: DataTypes.STRING(100) 
    },
    Description: { 
      type: DataTypes.STRING(255) 
    },
    BadgeIcon: { 
      type: DataTypes.STRING(50) 
    },
    UnlockedAt: { 
      type: DataTypes.DATE, 
      defaultValue: DataTypes.NOW 
    }
  }, {
    tableName: 'Task_Achievement',
    timestamps: false
  });

  return Achievement;
};