const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/master/designation.controller')
const asyncHandler = require("../../middlewares/async.middleware");
const validate = require('../../utils/validator');
const { designationSchema } = require('../../validations/master/designation.schema');
const { verifyToken, checkPermission } = require('../../middlewares/auth.middleware');
const { FORMS } = require('../../constants/permissions.constants');

router.use(verifyToken);
router.get("/", checkPermission(FORMS.DESIGNATION, 'view'), asyncHandler(ctrl.getAll));
router.post("/", checkPermission(FORMS.DESIGNATION, 'create'), validate(designationSchema), asyncHandler(ctrl.add));
router.put("/:id", checkPermission(FORMS.DESIGNATION, 'edit'), validate(designationSchema), asyncHandler(ctrl.update));
router.delete("/:id", checkPermission(FORMS.DESIGNATION, 'delete'), asyncHandler(ctrl.remove));

module.exports = router;