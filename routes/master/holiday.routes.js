const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/master/holiday.controller')
const asyncHandler = require("../../middlewares/async.middleware");
const validate = require('../../utils/validator');
const { holidaySchema } = require('../../validations/master/holiday.schema');
const { verifyToken, checkPermission } = require('../../middlewares/auth.middleware');
const { FORMS } = require('../../constants/permissions.constants');

router.use(verifyToken);
router.get("/", checkPermission(FORMS.HOLIDAY, 'view'), asyncHandler(ctrl.getAll));
router.post("/", checkPermission(FORMS.HOLIDAY, 'create'), validate(holidaySchema), asyncHandler(ctrl.add));
router.put("/:id", checkPermission(FORMS.HOLIDAY, 'edit'), validate(holidaySchema), asyncHandler(ctrl.update));
router.delete("/:id", checkPermission(FORMS.HOLIDAY, 'delete'), asyncHandler(ctrl.remove));

module.exports = router;