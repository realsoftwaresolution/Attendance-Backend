const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/transaction/salary-calculation.controller')
const asyncHandler = require("../../middlewares/async.middleware");
const validate = require('../../utils/validator');
const { verifyToken, checkPermission } = require('../../middlewares/auth.middleware');
const { FORMS } = require('../../constants/permissions.constants');


router.use(verifyToken);
router.get("/monthly", checkPermission(FORMS.SALARY_CALCULATION, 'view'), asyncHandler(ctrl.getMonthlySalaryReport));



module.exports = router;