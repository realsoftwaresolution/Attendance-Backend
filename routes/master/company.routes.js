const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/master/company.controller')
const asyncHandler = require("../../middlewares/async.middleware");
const validate = require('../../utils/validator');
const { companySchema } = require('../../validations/master/company.schema');
const { verifyToken, checkPermission } = require('../../middlewares/auth.middleware');
const { FORMS } = require('../../constants/permissions.constants');


router.use(verifyToken);
router.get("/", checkPermission(FORMS.COMPANY, 'view'), asyncHandler(ctrl.getAll));
router.post("/", checkPermission(FORMS.COMPANY, 'create'), validate(companySchema), asyncHandler(ctrl.add));
router.put("/:id", checkPermission(FORMS.COMPANY, 'edit'), validate(companySchema), asyncHandler(ctrl.update));
router.delete("/:id", checkPermission(FORMS.COMPANY, 'delete'), asyncHandler(ctrl.remove));

module.exports = router;