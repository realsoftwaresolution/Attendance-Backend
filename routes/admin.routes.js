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
router.post("/hours-category", adminController.addHoursCategory);
router.post("/holiday", adminController.addHoliday);
router.post("/department", adminController.addDepartment);
router.post("/designation", adminController.addDesignation);
router.post("/firm", adminController.addFirm);
router.post("/shift-entry", adminController.addShiftEntry);
router.post("/attendance", adminController.addAttendance);
router.post("/master-setting", adminController.addMasterSetting);
router.get("/employee", adminController.getAllEmployees);
router.get("/hours-category", adminController.getAllHoursCategory);
router.get("/employee/faces", adminController.getAllFaceEmployees);
router.get("/holiday", adminController.getAllHoliday);
router.get("/designation", adminController.getAllDesignation);
router.get("/department", adminController.getAllDepartment);
router.get("/firm", adminController.getAllFirm);
router.get("/shift-entry", adminController.getAllShiftEntry);
router.get("/attendance", adminController.getAllAttendance);
router.get("/master-setting", adminController.getAllMasterSetting);
router.put("/employee/:id", upload, adminController.updateEmployee);
router.put("/hours-category/:id", adminController.updateHoursCategory);
router.put("/holiday/:id", adminController.updateHoliday);
router.put("/department/:id", adminController.updateDepartment);
router.put("/designation/:id", adminController.updateDesignation);
router.put("/firm/:id", adminController.updateFirm);
router.put("/attendance/:id", adminController.updateAttendance);
router.delete("/employee/:id", adminController.deleteEmployee);
router.delete("/hours-category/:id", adminController.deleteHoursCategory);
router.delete("/holiday/:id", adminController.deleteHoliday);
router.delete("/department/:id", adminController.deleteDepartment);
router.delete("/designation/:id", adminController.deleteDesignation);
router.delete("/firm/:id", adminController.deleteFirm);
router.delete("/master-setting/:department", adminController.deleteMasterSetting);
router.delete("/attendance", adminController.deleteAttendance);
router.delete("/shift-entry/:department", adminController.deleteShiftEntry);
// Route to delete user documents
router.delete('/employee/:id/documents', adminController.deleteUserDocuments);




module.exports = router;
