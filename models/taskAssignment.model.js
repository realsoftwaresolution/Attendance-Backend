module.exports = (sequelize, DataTypes) => {
    const TaskAssignment = sequelize.define('TaskAssignment', {
      AssignmentId: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      TaskId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      UserId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      AssignedBy: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      IsCompleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      CompletedAt: {
        type: DataTypes.DATE
      },
      AssignedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      }
    }, {
      tableName: 'TaskAssignments',
      timestamps: false
    });
  
    return TaskAssignment;
  };
  