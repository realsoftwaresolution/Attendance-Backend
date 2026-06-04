const express = require('express');
const router = express.Router();
const taskController = require('../controllers/task.create.controller');
const groupController = require('../controllers/group.controller');
// const { verifyToken } = require('../middlewares/task.middleware');


// Task Routes (Protected)
router.post('/tasks', taskController.createTask);``
router.get('/tasks', taskController.getUserTasks);
router.put('/tasks/:taskId/complete', taskController.completeTask);
router.delete('/tasks/:taskId', taskController.deleteTask);

router.post('/groups', groupController.createGroup);
router.get('/groups', groupController.getUserGroups);
router.get('/groups/:groupId/members', groupController.getGroupMembers);
router.get('/users', groupController.getAllUsers);

module.exports = router;