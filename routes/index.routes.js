const express = require('express');
const router = express.Router();

/* ------------------------------ master routes ----------------------------- */
router.use("/auth", require('./auth/auth.routes'));
router.use("/hours-category", require('./master/hours-category.routes'));
router.use("/holiday", require('./master/holiday.routes'));
router.use("/designation", require('./master/designation.routes'));
router.use("/department", require('./master/department.routes'));
router.use("/company", require('./master/company.routes'));
router.use("/employee", require('./master/employee.routes'));

/* --------------------------- transaction routes --------------------------- */
router.use("/shift-entry", require('./transaction/shift-entry.routes'));
router.use("/attendance", require('./transaction/attendance.routes'));
router.use("/hours-calculation", require('./transaction/hours-calculation.routes'));
router.use("/salary-calculation", require('./transaction/salary-calculation.routes'));



module.exports = router;