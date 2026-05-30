const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/master/hours-category.controller')
const asyncHandler = require("../../middlewares/async.middleware");
const verifyToken = require('../../middlewares/auth.middleware');
const validate = require('../../utils/validator');
const { hoursCategorySchema } = require('../../validations/master/hours-category.schema');

router.use(verifyToken);
router.get("/", asyncHandler(ctrl.getAll));
router.post("/", validate(hoursCategorySchema), asyncHandler(ctrl.add));
router.put("/:id", validate(hoursCategorySchema), asyncHandler(ctrl.update));
router.delete("/:id", asyncHandler(ctrl.remove));


module.exports = router;