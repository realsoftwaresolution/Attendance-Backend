const router = require("express").Router();
const authMiddleware = require("../middlewares/auth.middleware");
const adminController = require("../controllers/admin.controller");

// Public Routes
router.post("/register", adminController.register);
router.post("/login", adminController.login);

// Authenticated Routes
router.use(authMiddleware); // This will apply the token validation middleware to the following routes
router.post("/employee", adminController.createEmployee); // Employee creation route
router.put("/employee/:id", adminController.updateEmployee); // Employee update route

module.exports = router;
