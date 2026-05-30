const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/transaction/salary-calculation.controller')
const asyncHandler = require("../../middlewares/async.middleware");
const verifyToken = require('../../middlewares/auth.middleware');
const validate = require('../../utils/validator');


router.use(verifyToken);
router.get("/monthly", asyncHandler(ctrl.getMonthlySalaryReport));



module.exports = router;