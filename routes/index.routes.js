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
router.use("/pf", require('./master/pf.routes'));
router.use("/pt", require('./master/pt.routes'));
router.use("/esic", require('./master/esic.routes'));
router.use("/advanced-entry", require('./master/advanced-entry.routes'));

/* --------------------------- transaction routes --------------------------- */
router.use("/shift-entry", require('./transaction/shift-entry.routes'));
router.use("/attendance", require('./transaction/attendance.routes'));
router.use("/hours-calculation", require('./transaction/hours-calculation.routes'));
router.use("/salary-calculation", require('./transaction/salary-calculation.routes'));

/* ----------------------------- utility routes ----------------------------- */
router.use("/master-settings", require('./utility/masterSetting.routes'));



module.exports = router;