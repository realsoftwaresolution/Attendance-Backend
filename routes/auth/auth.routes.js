const express = require('express');
const router = express.Router();
const controller = require('../../controllers/auth.controller')
const asyncHandler = require("../../middlewares/async.middleware");


router.post("/register", asyncHandler(controller.register));
router.post("/login", asyncHandler(controller.login));



module.exports = router;