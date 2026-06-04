const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/transaction/hours-calculation.controller')
const asyncHandler = require("../../middlewares/async.middleware");
const validate = require('../../utils/validator');
const { verifyToken, checkPermission } = require('../../middlewares/auth.middleware');
const { FORMS } = require('../../constants/permissions.constants');


router.use(verifyToken);
router.get("/monthly", checkPermission(FORMS.HOUR_CALCULATION, 'view'), asyncHandler(ctrl.getDailyHoursCalculation));


module.exports = router;