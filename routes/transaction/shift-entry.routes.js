const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/transaction/shift-entry.controller')
const asyncHandler = require("../../middlewares/async.middleware");
const validate = require('../../utils/validator');
const { shiftEntrySchema } = require('../../validations/transaction/shift-entry.schema');
const { verifyToken, checkPermission } = require('../../middlewares/auth.middleware');
const { FORMS } = require('../../constants/permissions.constants');



router.use(verifyToken);
router.get("/", checkPermission(FORMS.SHIFT_ENTRY, 'view'), asyncHandler(ctrl.getAllShiftEntry));
router.post("/", checkPermission(FORMS.SHIFT_ENTRY, 'create'), validate(shiftEntrySchema), asyncHandler(ctrl.addShiftEntry));
router.delete("/:ShiftEntryMstId", checkPermission(FORMS.SHIFT_ENTRY, 'delete'), asyncHandler(ctrl.deleteShiftEntry));


module.exports = router;