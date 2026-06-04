const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/master/department.controller')
const asyncHandler = require("../../middlewares/async.middleware");
const validate = require('../../utils/validator');
const { departmentSchema } = require('../../validations/master/department.schema');
const { verifyToken, checkPermission } = require('../../middlewares/auth.middleware');
const { FORMS } = require('../../constants/permissions.constants');

router.use(verifyToken);
router.get("/", checkPermission(FORMS.DEPARTMENT, 'view'), asyncHandler(ctrl.getAll));
router.post("/", checkPermission(FORMS.DEPARTMENT, 'create'), validate(departmentSchema), asyncHandler(ctrl.add));
router.put("/:id", checkPermission(FORMS.DEPARTMENT, 'edit'), validate(departmentSchema), asyncHandler(ctrl.update));
router.delete("/:id", checkPermission(FORMS.DEPARTMENT, 'delete'), asyncHandler(ctrl.remove));

module.exports = router;