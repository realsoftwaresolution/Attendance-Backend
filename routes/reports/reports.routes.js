const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/reports/reports.controller')
const asyncHandler = require("../../middlewares/async.middleware");
const { verifyToken, checkPermission, checkReportPermission } = require('../../middlewares/auth.middleware');
const { REPORT_FORMS } = require('../../constants/permissions.constants');


router.use(verifyToken);
router.get("/in-out/daily",checkReportPermission(REPORT_FORMS.DAILY_IN_OUT), asyncHandler(ctrl.getDailyInOutReport));
router.get("/in-out/department",checkReportPermission(REPORT_FORMS.DEPARTMENT_WISE_IN_OUT), asyncHandler(ctrl.getDepartmentWiseInOutReport));
router.get("/in-out/employee",checkReportPermission(REPORT_FORMS.EMPLOYEE_WISE_IN_OUT), asyncHandler(ctrl.getEmployeeWiseInOutReport));

router.get("/invalid-logs",checkReportPermission(REPORT_FORMS.INVALID_LOGS_REPORT), asyncHandler(ctrl.getInvalidLogsWithPunches));


router.get("/salary/detail",checkReportPermission(REPORT_FORMS.SALARY_DETAIL), asyncHandler(ctrl.getDetailedSalaryStatement));



module.exports = router;