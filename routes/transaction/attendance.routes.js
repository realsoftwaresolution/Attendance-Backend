const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/transaction/attendance.controller')
const asyncHandler = require("../../middlewares/async.middleware");
const asyncTransactionHandler = require("../../middlewares/asyncTransaction.middleware");
const validate = require('../../utils/validator');
const { verifyToken, checkPermission } = require('../../middlewares/auth.middleware');
const { FORMS } = require('../../constants/permissions.constants');


router.use(verifyToken);
router.get("/", checkPermission(FORMS.ATTENDANCE, 'view'), asyncHandler(ctrl.getPunchLogs));
router.put("/", checkPermission(FORMS.ATTENDANCE, 'edit'), asyncTransactionHandler(ctrl.updatePunchDay));
router.post("/sync-punch", checkPermission(FORMS.ATTENDANCE, 'view'), asyncHandler(ctrl.syncPunchNow));

module.exports = router;