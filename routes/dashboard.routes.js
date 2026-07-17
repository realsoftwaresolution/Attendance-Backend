const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const asyncHandler = require("../middlewares/async.middleware");
const { verifyToken } = require('../middlewares/auth.middleware');

// Apply verifyToken middleware to all routes in this file
router.use(verifyToken);

/* ------------------ GET ENDPOINTS ------------------ */
router.get("/daily-metrics", asyncHandler(dashboardController.getDailyMetrics));
router.get("/monthly-trends", asyncHandler(dashboardController.getMonthlyTrends));

module.exports = router;
