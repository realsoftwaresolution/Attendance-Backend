const db = require('../config/dbConnection');
const { Op } = require('sequelize');

// Create Group
exports.createGroup = async (req, res) => {
  try {
    const { GroupName, Description, MemberIds } = req.body;
    const createdBy = req.user.userId;

    console.log('📝 Creating group:', { GroupName, MemberIds, createdBy });

    // Create group
    const group = await db.Group.create({
      GroupName,
      Description,
      CreatedBy: createdBy,
      IsActive: true
    });

    console.log('✅ Group created with ID:', group.GroupId);

    // Create array of all members including creator
    const allMemberIds = new Set([createdBy, ...(MemberIds || [])]);
    const members = Array.from(allMemberIds).map(userId => ({
      GroupId: group.GroupId,
      UserId: userId
    }));

    console.log('👥 Adding members:', members);

    // Add all members at once
    if (members.length > 0) {
      await db.GroupMember.bulkCreate(members);
      console.log('✅ Members added successfully');
    }

    return res.status(201).json({
      success: true,
      message: "Group created successfully!",
      data: group
    });

  } catch (err) {
    console.error("❌ Create Group Error:", err);
    return res.status(500).json({
      success: false,
      message: "Group creation failed",
      error: err.message
    });
  }
};

// Get All Users (for group creation)
exports.getAllUsers = async (req, res) => {
  try {
    const currentUserId = req.user.userId;

    const users = await db.User.findAll({
      where: {
        UserId: { [Op.ne]: currentUserId },
        Active: true,
        IsDelete: false
      },
      attributes: ['UserId', 'Username', 'FullName', 'Email', 'ProfilePic', 'TotalPoints', 'Level', 'CurrentStreak']
    });

    console.log(`✅ Found ${users.length} users`);

    return res.status(200).json({
      success: true,
      data: users
    });

  } catch (err) {
    console.error("❌ Get Users Error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: err.message
    });
  }
};

// Get User's Groups - FIXED
exports.getUserGroups = async (req, res) => {
  try {
    const userId = req.user.userId;

    console.log(`🔍 Fetching groups for user ${userId}`);

    // FIX: Use positional parameters (?) for SQL Server
    const groups = await db.sequelize.query(`
      SELECT g.*, 
        (SELECT COUNT(*) FROM GroupMembers WHERE GroupId = g.GroupId) as MemberCount
      FROM Groups g
      INNER JOIN GroupMembers gm ON g.GroupId = gm.GroupId
      WHERE gm.UserId = ? AND g.IsActive = 1
      ORDER BY g.CreatedAt DESC
    `, {
      replacements: [userId],
      type: db.sequelize.QueryTypes.SELECT
    });

    console.log(`✅ Found ${groups.length} groups`);
      
    return res.status(200).json({
      success: true,
      data: groups
    });

  } catch (err) {
    console.error("❌ Get Groups Error:", err);
    console.error("Error details:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch groups",
      error: err.message
    });
  }
};

// Get Group Members - FIXED
exports.getGroupMembers = async (req, res) => {
  try {
    const { groupId } = req.params;

    console.log(`🔍 Fetching members for group ${groupId}`);

    // FIX: Use positional parameter (?)
    const members = await db.sequelize.query(`
      SELECT u.UserId, u.Username, u.FullName, u.Email, u.ProfilePic, 
             u.TotalPoints, u.Level, u.CurrentStreak
      FROM Task_User u
      INNER JOIN GroupMembers gm ON u.UserId = gm.UserId
      WHERE gm.GroupId = ?
      ORDER BY u.FullName ASC
    `, {
      replacements: [parseInt(groupId)],
      type: db.sequelize.QueryTypes.SELECT
    });

    console.log(`✅ Found ${members.length} members:`, members);

    return res.status(200).json({
      success: true,
      data: members
    });

  } catch (err) {
    console.error("❌ Get Group Members Error:", err);
    console.error("Error details:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch group members",
      error: err.message
    });
  }
};