const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/master/employee.controller')
const asyncHandler = require("../../middlewares/async.middleware");
const validate = require('../../utils/validator');
const { employeeRegistrationSchema } = require('../../validations/master/employee.validation');
const { AppError } = require('../../utils/AppError');
const { configureMulterValidators } = require('../../utils/uploadEngine');
const db = require('../../config/dbConnection');
const asyncTransactionHandler = require('../../middlewares/asyncTransaction.middleware');
const { verifyToken, checkPermission } = require('../../middlewares/auth.middleware');
const { FORMS } = require('../../constants/permissions.constants');

const employeeUploadSchema = [
    {
        name: "profileImage",
        pathBuilder: (req) => `employee/profile`,
        maxCount: 1,
        maxSizeMb: 1.5,
        allowedTypes: ["image/jpeg", "image/png", "image/jpg"]
    },
    {
        name: "documents",
        pathBuilder: (req) => `employee/documents`,
        maxCount: 4,
        maxSizeMb: 3,
        allowedTypes: ["application/pdf", "image/jpeg", "image/png", "image/jpg"]
    },
    {
        name: "biometricData",
        pathBuilder: (req) => `employee/biometric`,
        maxCount: 3,
        maxSizeMb: 5,
        allowedTypes: ["image/png", "image/jpg", "image/jpeg"]
    }
];


router.use(verifyToken);
/* ------------------ GET ENDPOINTS ------------------ */
router.get("/", checkPermission(FORMS.EMPLOYEE, 'view'), asyncHandler(ctrl.getAllEmployees));

/* ------------------ POST ENDPOINT ------------------ */
router.post(
    "/",
    checkPermission(FORMS.EMPLOYEE, 'create'),
    configureMulterValidators(employeeUploadSchema),
    validate(employeeRegistrationSchema),
    asyncTransactionHandler(ctrl.createEmployee)
);
router.get('/history/:empMstId', checkPermission(FORMS.EMPLOYEE, 'view'), asyncHandler(ctrl.getEmployeeSalaryHistory));
router.delete('/salary-delete/:historyId', checkPermission(FORMS.EMPLOYEE, 'delete'), asyncTransactionHandler(ctrl.deleteSalaryHistory));

/* ------------------ PUT ENDPOINT (With Count Check) ------------------ */
const checkExistingDocumentThreshold = async (req, res, next) => {
    try {
        const employeeId = req.params.id;

        const employee = await db.EmployeeMst.findOne({
            where: { EmpMstId: employeeId }
        });

        if (!employee) {
            return next(new AppError("Target employee record not found", 404));
        }

        let totalExistingDocs = 0;
        if (employee.DocumentPaths) {
            try {
                const parsedPaths = JSON.parse(employee.DocumentPaths);
                if (Array.isArray(parsedPaths)) totalExistingDocs = parsedPaths.length;
            } catch (e) {
                totalExistingDocs = 0;
            }
        }

        const newIncomingDocsCount = req.files?.documents ? req.files.documents.length : 0;
        if (totalExistingDocs + newIncomingDocsCount > 4) {
            return next(new AppError(`Document limit exceeded. Maximum allowed is 4 documents total.`, 400));
        }

        next();
    } catch (error) {
        next(error);
    }
};

router.put(
    "/:id",
    checkPermission(FORMS.EMPLOYEE, 'edit'),
    configureMulterValidators(employeeUploadSchema),
    asyncHandler(checkExistingDocumentThreshold),
    validate(employeeRegistrationSchema),
    asyncTransactionHandler(ctrl.updateEmployee)
);

/* ------------------ DELETE ENDPOINTS ------------------ */
router.delete("/:id", checkPermission(FORMS.EMPLOYEE, 'delete'), asyncTransactionHandler(ctrl.deleteEmployee));
router.delete('/:id/documents', checkPermission(FORMS.EMPLOYEE, 'delete'), asyncHandler(ctrl.deleteUserDocuments));

module.exports = router;