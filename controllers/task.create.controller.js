const db = require('../config/dbConnection');
const { Op } = require('sequelize');

const formatToSqlDateTime = (isoString) => {
  if (!isoString) return null;

  const d = new Date(isoString);

  if (isNaN(d.getTime())) return null;

  const pad = (n) => String(n).padStart(2, '0');

  return (
    d.getFullYear() + '-' +
    pad(d.getMonth() + 1) + '-' +
    pad(d.getDate()) + ' ' +
    pad(d.getHours()) + ':' +
    pad(d.getMinutes()) + ':' +
    pad(d.getSeconds())
  );
};

exports.createTask = async (req, res) => {
  try {
    const {
      Title,
      Description,
      Category,
      Priority,
      DueDate,
      NotificationTime,
      GroupId,
      AssignedUserIds,
      EstimatedTime
    } = req.body;

    const userId = req.user.userId;
    const sqlDueDate = formatToSqlDateTime(DueDate);
    const sqlNotificationTime = formatToSqlDateTime(NotificationTime);

    console.log('📝 Creating task - Request body:', req.body);
    console.log('User ID:', userId);

    // Calculate points
    let points = 10;
    if (Priority === 'high') points = 30;
    else if (Priority === 'medium') points = 20;

    // Prepare task data with proper type conversion
    const taskData = {
      UserId: parseInt(userId),
      GroupId: GroupId ? parseInt(GroupId) : null,
      Title: Title,
      Description: Description || null,
      Category: Category || 'personal',
      Priority: Priority || 'medium',
      // DueDate: DueDate ? new Date(DueDate + 'Z') : null,
      NotificationTime: NotificationTime ? new Date(NotificationTime) : null,
      DueDate: sqlDueDate,
      NotificationTime: sqlNotificationTime,
      Points: points,
      IsCompleted: false,  // Must be boolean
      IsDelete: false,
      EstimatedTime: EstimatedTime
      // Must be boolean
    };

    console.log('💾 Task data to insert:', taskData);

    // Create task
    const newTask = await db.Task.create(taskData);

    console.log('✅ Task created successfully with ID:', newTask.TaskId);

    // If group task, create assignments
    if (GroupId && AssignedUserIds && AssignedUserIds.length > 0) {
      console.log('👥 Creating task assignments for users:', AssignedUserIds);

      const assignments = AssignedUserIds.map(assignedUserId => ({
        TaskId: parseInt(newTask.TaskId),
        UserId: parseInt(assignedUserId),
        AssignedBy: parseInt(userId),
        IsCompleted: false  // Must be boolean
      }));

      console.log('Assignments to create:', assignments);

      await db.TaskAssignment.bulkCreate(assignments);
      console.log(`✅ Created ${assignments.length} task assignments`);
    }

    return res.status(201).json({
      success: true,
      message: "Task created!",
      data: {
        task: newTask,
        assignedCount: AssignedUserIds ? AssignedUserIds.length : 0
      }
    });

  } catch (err) {
    console.error("❌ ❌ ❌ CREATE TASK ERROR ❌ ❌ ❌");
    console.error("Error name:", err.name);
    console.error("Error message:", err.message);
    console.error("Error original:", err.original);
    console.error("Error SQL:", err.sql);
    console.error("Full error:", err);

    return res.status(500).json({
      success: false,
      message: "Task create error",
      error: err.name,
      details: err.message
    });
  }
};
// Get User Tasks (Updated) - FIXED
exports.getUserTasks = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { status, groupId } = req.query;

    console.log(`🔍 Fetching tasks for user ${userId}`);

    // FIX: Use positional parameters (?)
    let query = `
      SELECT DISTINCT t.*, 
        g.GroupName,
        (SELECT COUNT(*) FROM TaskAssignments WHERE TaskId = t.TaskId) as AssignedCount
      FROM Task_Task t
      LEFT JOIN Groups g ON t.GroupId = g.GroupId
      LEFT JOIN TaskAssignments ta ON t.TaskId = ta.TaskId
      WHERE t.IsDelete = 0
        AND (t.UserId = ? OR ta.UserId = ?)
    `;

    const replacements = [userId, userId];

    if (status === 'completed') {
      query += ` AND (t.IsCompleted = 1 OR ta.IsCompleted = 1)`;
    } else if (status === 'pending') {
      query += ` AND (t.IsCompleted = 0 AND (ta.IsCompleted = 0 OR ta.IsCompleted IS NULL))`;
    }

    if (groupId) {
      query += ` AND t.GroupId = ?`;
      replacements.push(groupId);
    }

    query += ` ORDER BY t.CreatedAt DESC`;

    const tasks = await db.sequelize.query(query, {
      replacements,
      type: db.sequelize.QueryTypes.SELECT
    });

    console.log(`✅ Found ${tasks.length} tasks`);

    return res.status(200).json({
      success: true,
      data: tasks
    });

  } catch (err) {
    console.error("❌ Get Tasks Error:", err);
    return res.status(500).json({
      success: false,
      message: "Tasks fetch error",
      error: err.message
    });
  }
};

// Get Group Tasks - FIXED
exports.getGroupTasks = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.userId;

    console.log(`🔍 Fetching tasks for group ${groupId}`);

    // FIX: Use positional parameters (?)
    const tasks = await db.sequelize.query(`
      SELECT t.*, 
        u.Username as CreatorName,
        u.FullName as CreatorFullName,
        (SELECT COUNT(*) FROM TaskAssignments WHERE TaskId = t.TaskId) as AssignedCount,
        ta.IsCompleted as MyCompletion
      FROM Task_Task t
      INNER JOIN Task_User u ON t.UserId = u.UserId
      LEFT JOIN TaskAssignments ta ON t.TaskId = ta.TaskId AND ta.UserId = ?
      WHERE t.GroupId = ? AND t.IsDelete = 0
      ORDER BY t.CreatedAt DESC
    `, {
      replacements: [userId, groupId],
      type: db.sequelize.QueryTypes.SELECT
    });

    console.log(`✅ Found ${tasks.length} group tasks`);

    return res.status(200).json({
      success: true,
      data: tasks
    });

  } catch (err) {
    console.error("❌ Get Group Tasks Error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch group tasks",
      error: err.message
    });
  }
};

// Complete Task
exports.completeTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.userId;

    const task = await db.Task.findOne({
      where: { TaskId: taskId, UserId: userId, IsDelete: false }
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found"
      });
    }

    if (task.IsCompleted) {
      return res.status(400).json({
        success: false,
        message: "Task already completed!"
      });
    }

    // Mark as completed
    task.IsCompleted = true;
    task.CompletedAt = new Date();
    await task.save();

    // Update user points and streak
    const user = await db.User.findByPk(userId);
    user.TotalPoints += task.Points;
    user.CurrentStreak += 1;

    if (user.CurrentStreak > user.LongestStreak) {
      user.LongestStreak = user.CurrentStreak;
    }

    // Level up logic
    const newLevel = Math.floor(user.TotalPoints / 100) + 1;
    if (newLevel > user.Level) {
      user.Level = newLevel;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: `🎉 Task complete! +${task.Points} points`,
      data: {
        task,
        userStats: {
          totalPoints: user.TotalPoints,
          level: user.Level,
          currentStreak: user.CurrentStreak
        }
      }
    });

  } catch (err) {
    console.error("Complete Task Error:", err);
    return res.status(500).json({
      success: false,
      message: "Task complete error",
      error: err.message
    });
  }
};

// Complete Task Assignment
exports.completeTaskAssignment = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.userId;

    const assignment = await db.TaskAssignment.findOne({
      where: { TaskId: taskId, UserId: userId }
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Task assignment not found"
      });
    }

    if (assignment.IsCompleted) {
      return res.status(400).json({
        success: false,
        message: "Task already completed!"
      });
    }

    assignment.IsCompleted = true;
    assignment.CompletedAt = new Date();
    await assignment.save();

    // Check if all assignments are completed
    const allAssignments = await db.TaskAssignment.findAll({
      where: { TaskId: taskId }
    });

    const allCompleted = allAssignments.every(a => a.IsCompleted);

    if (allCompleted) {
      const task = await db.Task.findByPk(taskId);
      task.IsCompleted = true;
      task.CompletedAt = new Date();
      await task.save();
    }

    // Update user stats
    const task = await db.Task.findByPk(taskId);
    const user = await db.User.findByPk(userId);

    user.TotalPoints += task.Points;
    user.CurrentStreak += 1;

    if (user.CurrentStreak > user.LongestStreak) {
      user.LongestStreak = user.CurrentStreak;
    }

    const newLevel = Math.floor(user.TotalPoints / 100) + 1;
    if (newLevel > user.Level) {
      user.Level = newLevel;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: `🎉 Task completed! +${task.Points} points`,
      data: {
        task,
        allCompleted,
        userStats: {
          totalPoints: user.TotalPoints,
          level: user.Level,
          currentStreak: user.CurrentStreak
        }
      }
    });

  } catch (err) {
    console.error("Complete Task Assignment Error:", err);
    return res.status(500).json({
      success: false,
      message: "Task completion error",
      error: err.message
    });
  }
};

// Delete Task
exports.deleteTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.userId;

    const task = await db.Task.findOne({
      where: { TaskId: taskId, UserId: userId }
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found"
      });
    }

    task.IsDelete = true;
    await task.save();

    return res.status(200).json({
      success: true,
      message: "Task deleted!"
    });

  } catch (err) {
    console.error("Delete Task Error:", err);
    return res.status(500).json({
      success: false,
      message: "Task delete error",
      error: err.message
    });
  }
};