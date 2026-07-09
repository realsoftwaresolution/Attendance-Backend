const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/master/loan.controller')
const asyncHandler = require("../../middlewares/async.middleware");
const validate = require('../../utils/validator');
const { loanSchema } = require('../../validations/master/loan.schema');
const { verifyToken, checkPermission } = require('../../middlewares/auth.middleware');
const { FORMS } = require('../../constants/permissions.constants');


router.use(verifyToken);
router.get("/", checkPermission(FORMS.LOAN, 'view'), asyncHandler(ctrl.getAll));
router.post("/", checkPermission(FORMS.LOAN, 'create'), validate(loanSchema), asyncHandler(ctrl.add));
router.put("/:id", checkPermission(FORMS.LOAN, 'edit'), validate(loanSchema), asyncHandler(ctrl.update));
router.delete("/:id", checkPermission(FORMS.LOAN, 'delete'), asyncHandler(ctrl.remove));

module.exports = router;