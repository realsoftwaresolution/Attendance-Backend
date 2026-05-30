const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/transaction/attendance.controller')
const asyncHandler = require("../../middlewares/async.middleware");
const asyncTransactionHandler = require("../../middlewares/asyncTransaction.middleware");
const verifyToken = require('../../middlewares/auth.middleware');
const validate = require('../../utils/validator');


router.use(verifyToken);
router.get("/", asyncHandler(ctrl.getPunchLogs));
router.get("/manual-calculate", asyncHandler(ctrl.manualCalculateDailySummary));
router.put("/", asyncTransactionHandler(ctrl.updatePunchDay));
router.post("/sync-punch", asyncHandler(ctrl.syncPunchNow));

module.exports = router;