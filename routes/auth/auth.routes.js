const express = require('express');
const router = express.Router();
const controller = require('../../controllers/auth.controller')
const asyncHandler = require("../../middlewares/async.middleware");
const asyncTransactionHandler = require('../../middlewares/asyncTransaction.middleware');
const { checkPermission, verifyToken } = require('../../middlewares/auth.middleware');
const { FORMS } = require('../../constants/permissions.constants');


router.post("/login", asyncHandler(controller.login));
router.use(verifyToken);
router.get("/users",checkPermission(FORMS.COUNTER, "view"), asyncTransactionHandler(controller.getUsers));
router.post("/users",checkPermission(FORMS.COUNTER, "create"), asyncTransactionHandler(controller.createUser));
router.get("/system-metadata",checkPermission(FORMS.COUNTER, "view"), asyncHandler(controller.getSystemMetadata));
router.get("/users/:UserMstId",checkPermission(FORMS.COUNTER, "view"), asyncTransactionHandler(controller.getUserDetails));
router.put("/users/:id",checkPermission(FORMS.COUNTER, "edit"), asyncTransactionHandler(controller.updateUser));
router.delete("/users/:id",
    checkPermission(FORMS.COUNTER, "delete"),
    controller.deleteUser
);



module.exports = router;