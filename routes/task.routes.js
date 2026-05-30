const express = require('express');
const router = express.Router();
const taskController = require('../controllers/task.create.controller');
const groupController = require('../controllers/group.controller');
const { verifyToken } = require('../middlewares/task.middleware');


// Task Routes (Protected)
router.post('/tasks', verifyToken, taskController.createTask);
router.get('/tasks', verifyToken, taskController.getUserTasks);
router.put('/tasks/:taskId/complete', verifyToken, taskController.completeTask);
router.delete('/tasks/:taskId', verifyToken, taskController.deleteTask);

router.post('/groups', verifyToken, groupController.createGroup);
router.get('/groups', verifyToken, groupController.getUserGroups);
router.get('/groups/:groupId/members', verifyToken, groupController.getGroupMembers);
router.get('/users', verifyToken, groupController.getAllUsers);

module.exports = router;