const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/master/designation.controller')
const asyncHandler = require("../../middlewares/async.middleware");
const verifyToken = require('../../middlewares/auth.middleware');
const validate = require('../../utils/validator');
const { designationSchema } = require('../../validations/master/designation.schema');

router.use(verifyToken);
router.get("/", verifyToken, asyncHandler(ctrl.getAll));
router.post("/", verifyToken, validate(designationSchema), asyncHandler(ctrl.add));
router.put("/:id", verifyToken, validate(designationSchema), asyncHandler(ctrl.update));
router.delete("/:id", verifyToken, asyncHandler(ctrl.remove));

module.exports = router;