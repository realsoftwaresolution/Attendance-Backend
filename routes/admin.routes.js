const router = require("express").Router();
const adminController = require("../controllers/admin.controller");
const upload = require("../middlewares/upload.middleware");

// router.use(authMiddleware);

router.post(
  "/face/register",
  upload.single("image"),
  adminController.registerEmployeeFace
);

router.post(
  "/face/verify",
  upload.single("image"),
  adminController.verifyEmployeeFace
);

router.post("/calculate-salary", adminController.calculateSalary);
router.post("/attendance", adminController.addAttendance1);
router.post("/attendance-add", adminController.addAttendance);
router.post("/master-setting", adminController.addMasterSetting);
router.post("/att-mst", adminController.addAttMst);
router.post("/user-permission", adminController.assignUserPermissions);
router.get("/user-permission/:id", adminController.getUserPermissions);
router.post("/save-calculated-salary", adminController.addSalaryMst);
router.get("/users", adminController.getAllUsers);
router.get("/main-menu", adminController.getAllMainMenu);
router.get("/menu", adminController.getAllMenu);
router.get("/report-type", adminController.getAllReportType);
router.get("/sub-report-type", adminController.getAllSubReportType);
router.get("/employee/faces", adminController.getAllFaceEmployees);


router.get("/attendance", adminController.getAllAttendance);
router.get("/master-setting", adminController.getAllMasterSetting);
router.get("/att-mst", adminController.getAllAttMst);
router.get("/salary-mst", adminController.getAllSalaryMst);
router.get("/salary-det-mst", adminController.getAllSalaryDetMst);
router.put("/attendance/:id", adminController.updateAttendance1);
router.delete("/attendance-log/:id", adminController.deleteAttLog);
router.delete("/master-setting/:department", adminController.deleteMasterSetting);
router.delete("/attendance", adminController.deleteAttendance);
router.delete("/salary-mst/:id", adminController.deleteSalaryMst);
router.delete("/user/:id", adminController.deleteUser);

module.exports = router;
