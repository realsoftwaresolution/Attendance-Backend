const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/master/hours-category.controller')
const asyncHandler = require("../../middlewares/async.middleware");
const validate = require('../../utils/validator');
const { hoursCategorySchema } = require('../../validations/master/hours-category.schema');
const { verifyToken, checkPermission } = require('../../middlewares/auth.middleware');
const { FORMS } = require('../../constants/permissions.constants');

router.use(verifyToken);
router.get("/", checkPermission(FORMS.HOUR_CATEGORY, 'view'), asyncHandler(ctrl.getAll));
router.post("/", checkPermission(FORMS.HOUR_CATEGORY, 'create'), validate(hoursCategorySchema), asyncHandler(ctrl.add));
router.put("/:id", checkPermission(FORMS.HOUR_CATEGORY, 'edit'), validate(hoursCategorySchema), asyncHandler(ctrl.update));
router.delete("/:id", checkPermission(FORMS.HOUR_CATEGORY, 'delete'), asyncHandler(ctrl.remove));


module.exports = router;