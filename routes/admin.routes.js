const router = require("express").Router();
const authMiddleware = require("../middlewares/auth.middleware");
const adminController = require("../controllers/admin.controller");
const upload = require("../middlewares/upload.middleware");

// Public Routes
router.post("/register", adminController.register);
router.post("/login", adminController.login);

// Authenticated Routes
router.use(authMiddleware); // This will apply the token validation middleware to the following routes
router.post("/employee", upload, adminController.createEmployee);
router.post("/hours-category", adminController.addHoursCategory);  // Employee creation route
router.put("/employee/:id", adminController.updateEmployee); // Employee update route
router.get("/employee", adminController.getAllEmployees); // Employee update route
router.get("/hours-category", adminController.getAllHoursCategory);
router.get("/employee/faces", adminController.getAllFaceEmployees);
router.get("/holiday", adminController.getAllHoliday);
router.get("/designation", adminController.getAllDesignation);
router.get("/department", adminController.getAllDepartment);
router.get("/firm", adminController.getAllFirm);






module.exports = router;
