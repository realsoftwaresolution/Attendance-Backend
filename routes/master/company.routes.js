const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/master/company.controller')
const asyncHandler = require("../../middlewares/async.middleware");
const verifyToken = require('../../middlewares/auth.middleware');
const validate = require('../../utils/validator');
const { companySchema } = require('../../validations/master/company.schema');


router.use(verifyToken);
router.get("/", asyncHandler(ctrl.getAll));
router.post("/", validate(companySchema), asyncHandler(ctrl.add));
router.put("/:id", validate(companySchema), asyncHandler(ctrl.update));
router.delete("/:id", asyncHandler(ctrl.remove));

module.exports = router;