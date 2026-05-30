const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    UserId: { 
      type: DataTypes.INTEGER, 
      autoIncrement: true, 
      primaryKey: true 
    },
    Username: { 
      type: DataTypes.STRING(50), 
      allowNull: false, 
      unique: true 
    },
    Email: { 
      type: DataTypes.STRING(100), 
      allowNull: false, 
      unique: true 
    },
    Password: { 
      type: DataTypes.STRING(255), 
      allowNull: false 
    },
    FullName: { 
      type: DataTypes.STRING(100) 
    },
    ProfilePic: { 
      type: DataTypes.TEXT 
    },
    TotalPoints: { 
      type: DataTypes.INTEGER, 
      defaultValue: 0 
    },
    CurrentStreak: { 
      type: DataTypes.INTEGER, 
      defaultValue: 0 
    },
    LongestStreak: { 
      type: DataTypes.INTEGER, 
      defaultValue: 0 
    },
    Level: { 
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
    },
    CreatedAt: { 
      type: DataTypes.DATE, 
      defaultValue: DataTypes.NOW 
    }
  }, {
    tableName: 'Task_User',
    timestamps: false
  });

  return User;
};