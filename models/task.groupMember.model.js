const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const GroupMember = sequelize.define('GroupMember', {
      GroupMemberId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      GroupId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      UserId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      JoinedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      }
    }, {
      tableName: 'GroupMembers',
      timestamps: false
    });
  
    return GroupMember;
  };