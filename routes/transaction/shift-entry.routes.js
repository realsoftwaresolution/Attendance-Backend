const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/transaction/shift-entry.controller')
const asyncHandler = require("../../middlewares/async.middleware");
const verifyToken = require('../../middlewares/auth.middleware');
const validate = require('../../utils/validator');
const { shiftEntrySchema } = require('../../validations/transaction/shift-entry.schema');



router.use(verifyToken);
router.get("/", asyncHandler(ctrl.getAllShiftEntry));
router.post("/", validate(shiftEntrySchema), asyncHandler(ctrl.addShiftEntry));
router.delete("/:ShiftEntryMstId", asyncHandler(ctrl.deleteShiftEntry));


module.exports = router;