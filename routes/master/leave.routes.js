const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/master/leave.controller');
const asyncHandler = require("../../middlewares/async.middleware");
const asyncTransactionHandler = require("../../middlewares/asyncTransaction.middleware");
const { verifyToken, checkPermission } = require('../../middlewares/auth.middleware');
const validate = require('../../utils/validator');
const { leaveValidationSchema, leaveUpdateSchema } = require('../../validations/master/leave.validation');
const { FORMS } = require('../../constants/permissions.constants');

router.use(verifyToken);

router.get("/", asyncHandler(ctrl.getAllLeaves));
router.post("/",validate(leaveValidationSchema),asyncTransactionHandler(ctrl.createLeave));
router.put("/:id",validate(leaveUpdateSchema),asyncTransactionHandler(ctrl.updateLeave));
router.delete("/:id",asyncTransactionHandler(ctrl.deleteLeave));

module.exports = router;
