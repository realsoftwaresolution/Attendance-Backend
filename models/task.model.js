// const { DataTypes } = require('sequelize');

// module.exports = (sequelize) => {
//   const Task = sequelize.define('Task', {
//     TaskId: { 
//       type: DataTypes.INTEGER, 
//       autoIncrement: true, 
//       primaryKey: true 
//     },
//     UserId: { 
//       type: DataTypes.INTEGER, 
//       allowNull: false 
//     },
//     Title: { 
//       type: DataTypes.STRING(200), 
//       allowNull: false 
//     },
//     Description: { 
//       type: DataTypes.TEXT 
//     },
//     Category: { 
//       type: DataTypes.ENUM('work', 'personal', 'health', 'learning', 'other'),
//       defaultValue: 'personal'
//     },
//     Priority: { 
//       type: DataTypes.ENUM('low', 'medium', 'high'),
//       defaultValue: 'medium'
//     },
//     DueDate: { 
//       type: DataTypes.DATE 
//     },
//     IsCompleted: { 
//       type: DataTypes.BOOLEAN, 
//       defaultValue: false 
//     },
//     CompletedAt: { 
//       type: DataTypes.DATE 
//     },
//     Points: { 
//       type: DataTypes.INTEGER, 
//       defaultValue: 10 
//     },
//     IsDelete: { 
//       type: DataTypes.BOOLEAN, 
//       defaultValue: false 
//     },
//     CreatedAt: { 
//       type: DataTypes.DATE, 
//       defaultValue: DataTypes.NOW 
//     }
//   }, {
//     tableName: 'Task_Task',
//     timestamps: false
//   });

//   return Task;
// };
// models/task.model.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Task = sequelize.define('Task', {
    TaskId: { 
      type: DataTypes.INTEGER, 
      autoIncrement: true, 
      primaryKey: true 
    },
    UserId: { 
      type: DataTypes.INTEGER, 
      allowNull: false 
    },
    GroupId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    Title: { 
      type: DataTypes.STRING(200), 
      allowNull: false 
    },
    Description: { 
      type: DataTypes.TEXT,
      allowNull: true
    },
    Category: { 
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'personal'
    },
    Priority: { 
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'medium'
    },
    DueDate: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'DueDate'
      },
      NotificationTime: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'NotificationTime'
      },
      
      
    EstimatedTime: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    IsCompleted: { 
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false
    },
    CompletedAt: { 
      type: DataTypes.DATE,
      allowNull: true
    },
    Points: { 
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 10 
    },
    IsDelete: { 
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false 
    },
    CreatedAt: { 
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW 
    }
  }, {
    tableName: 'Task_Task',
    timestamps: false
  });
  
  return Task;
};