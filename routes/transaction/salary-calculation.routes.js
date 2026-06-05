const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/transaction/salary-calculation.controller')
const asyncHandler = require("../../middlewares/async.middleware");
const validate = require('../../utils/validator');
const { verifyToken, checkPermission } = require('../../middlewares/auth.middleware');
const { FORMS } = require('../../constants/permissions.constants');
const { saveSalarySchema } = require('../../validations/transaction/salary-cal.validation');
const asyncTransactionHandler = require('../../middlewares/asyncTransaction.middleware');

router.use(verifyToken);
router.get("/manually", checkPermission(FORMS.SALARY_CALCULATION, 'view'), asyncHandler(ctrl.manualCalculateSalary));
router.post('/save', checkPermission(FORMS.SALARY_CALCULATION, 'create'), validate(saveSalarySchema), asyncTransactionHandler(ctrl.saveSalary));
router.get('/details/:salaryMstId',checkPermission(FORMS.SALARY_CALCULATION, 'view'),asyncHandler(ctrl.getSalaryDetails));
router.delete('/:salaryMstId', checkPermission(FORMS.SALARY_CALCULATION, 'delete'), asyncTransactionHandler(ctrl.deleteSalary));
router.get('/saved-list', checkPermission(FORMS.SALARY_CALCULATION, 'view'), asyncHandler(ctrl.getSavedSalaryList));

module.exports = router;