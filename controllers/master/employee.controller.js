const { Op } = require("sequelize");
const db = require("../../config/dbConnection");
const { AppError } = require("../../utils/AppError");
const { deleteSingleFile, deleteFileArray } = require("../../utils/fileCleanup");
const { saveValidatedBuffersToDisk } = require("../../utils/uploadEngine");
const moment = require("moment");

exports.createEmployee = async (req, res, next) => {
    const transaction = req.transaction; // Middleware provided transaction

    const {
        EmpCode, EmpFullName, EmpType, BranchMstId, DepartmentMstId,
        DesignationMstId, CompanyMstId, EmpSalary, EmpSalaryType,
        SalaryFromDate, EmpPhoneNo, EmpPANNo, EmpESINo, EmpAddress,
        DateOfJoining, EmpGrp, EmpBankFullName, EmpBankName,
        EmpBankACNo, EmpBankIFSCode
    } = req.body;

    if (!EmpCode) throw new AppError("Employee Code (EmpCode) is required.", 400);

    // 1. Check existence (Pass transaction if you want to ensure read-consistency)
    const existingEmployee = await db.EmployeeMst.findOne({
        where: { EmpCode },
        transaction
    });
    if (existingEmployee) throw new AppError(`An employee with EmpCode '${EmpCode}' already exists.`, 409);

    // 2. Create Employee
    const employee = await db.EmployeeMst.create({
        EmpCode, EmpFullName, EmpType, BranchMstId, DepartmentMstId,
        DesignationMstId, CompanyMstId, EmpPhoneNo, EmpPANNo, EmpESINo,
        EmpAddress, DateOfJoining, EmpGrp, EmpBankFullName, EmpBankName,
        EmpBankACNo, EmpBankIFSCode,
        Sflag: 'I', LogID: req.logId, PcID: req.pcId,
        SortId: req.body.SortId || 1, Active: true
    }, { transaction });

    // 3. Create Salary History
    let activeSalary = null;
    if (EmpSalary) {
        activeSalary = await db.EmployeeSalaryHistory.create({
            EmpMstId: employee.EmpMstId,
            SalaryAmount: EmpSalary,
            SalaryType: EmpSalaryType || 'Fixed',
            FromDate: SalaryFromDate || DateOfJoining || new Date(),
            Active: true
        }, { transaction });
    }

    // 4. Handle File Paths
    const filePaths = await saveValidatedBuffersToDisk(req);
    await employee.update({
        ProfileImage: filePaths.profileImage?.[0] || null,
        DocumentPaths: filePaths.documents?.length ? JSON.stringify(filePaths.documents) : null
    }, { transaction });

    // 5. Prepare Response
    const data = employee.toJSON();
    data.CurrentSalary = activeSalary;

    // Remove sensitive biometric data
    delete data.BiometricVectorFront;
    delete data.BiometricVectorLeft;
    delete data.BiometricVectorRight;

    return res.status(201).json({
        success: true,
        message: "Employee profile created successfully.",
        data: data
    });
};

exports.updateEmployee = async (req, res, next) => {
    const employeeId = req.params.id;
    const transaction = req.transaction;

    const {
        EmpCode, EmpFullName, EmpType, BranchMstId, DepartmentMstId,
        DesignationMstId, CompanyMstId, EmpSalary, EmpSalaryType,
        SalaryFromDate, EmpPhoneNo, EmpPANNo, EmpESINo, EmpAddress,
        DateOfJoining, EmpGrp, EmpBankFullName, EmpBankName,
        EmpBankACNo, EmpBankIFSCode, Active, SortId
    } = req.body;

    const employee = await db.EmployeeMst.findOne({ where: { EmpMstId: employeeId }, transaction });
    if (!employee) throw new AppError("Employee record not found.", 404);

    // 1. Prevent duplicate EmpCode
    if (EmpCode && String(EmpCode) !== String(employee.EmpCode)) {
        const duplicateCodeCheck = await db.EmployeeMst.findOne({ where: { EmpCode }, transaction });
        if (duplicateCodeCheck) throw new AppError(`The EmpCode '${EmpCode}' is already assigned.`, 409);
    }


    // 2. Handle File Uploads
    const filePaths = await saveValidatedBuffersToDisk(req);
    const oldProfileImage = employee.ProfileImage;
    let finalProfilePath = oldProfileImage;

    if (filePaths.profileImage?.length > 0) {
        finalProfilePath = filePaths.profileImage[0];
        if (oldProfileImage && oldProfileImage !== finalProfilePath) {
            deleteSingleFile(oldProfileImage);
        }
    }

    let finalizedDocumentsList = employee.DocumentPaths;
    if (filePaths.documents?.length > 0) {
        let currentDocsArray = [];
        try { currentDocsArray = JSON.parse(employee.DocumentPaths || '[]'); } catch (e) { currentDocsArray = []; }
        finalizedDocumentsList = JSON.stringify([...currentDocsArray, ...filePaths.documents]);
    }

    // 3. Handle Salary History Versioning
    if (EmpSalary !== undefined) {
        const effectiveDate = moment(SalaryFromDate || new Date());

        const currentActive = await db.EmployeeSalaryHistory.findOne({
            where: { EmpMstId: employeeId, Active: true, ToDate: null },
            transaction
        });

        if (currentActive) {
            const activeFromDate = moment(currentActive.FromDate);
            if (effectiveDate.isSameOrBefore(activeFromDate)) {
                throw new AppError(`Salary effective date must be later than the current active salary start date (${currentActive.FromDate}).`, 400);
            }
        }

        const closingDate = effectiveDate.clone().subtract(1, 'days');
        await db.EmployeeSalaryHistory.update(
            { ToDate: closingDate.format('YYYY-MM-DD'), Active: false },
            { where: { EmpMstId: employeeId, Active: true }, transaction }
        );

        await db.EmployeeSalaryHistory.create({
            EmpMstId: employeeId,
            SalaryAmount: EmpSalary,
            SalaryType: EmpSalaryType || 'Fixed',
            FromDate: effectiveDate.format('YYYY-MM-DD'),
            Active: true
        }, { transaction });
    }

    // 4. Update Employee (Salary fields removed)
    await employee.update({
        EmpCode: EmpCode ?? employee.EmpCode,
        EmpFullName: EmpFullName || employee.EmpFullName,
        EmpType: EmpType || employee.EmpType,
        BranchMstId: BranchMstId || employee.BranchMstId,
        DepartmentMstId: DepartmentMstId || employee.DepartmentMstId,
        DesignationMstId: DesignationMstId || employee.DesignationMstId,
        CompanyMstId: CompanyMstId || employee.CompanyMstId,
        EmpPhoneNo: EmpPhoneNo ?? employee.EmpPhoneNo,
        EmpPANNo: EmpPANNo ?? employee.EmpPANNo,
        EmpESINo: EmpESINo ?? employee.EmpESINo,
        EmpAddress: EmpAddress ?? employee.EmpAddress,
        DateOfJoining: DateOfJoining || employee.DateOfJoining,
        EmpGrp: EmpGrp ?? employee.EmpGrp,
        EmpBankFullName: EmpBankFullName ?? employee.EmpBankFullName,
        EmpBankName: EmpBankName ?? employee.EmpBankName,
        EmpBankACNo: EmpBankACNo ?? employee.EmpBankACNo,
        EmpBankIFSCode: EmpBankIFSCode ?? employee.EmpBankIFSCode,
        ProfileImage: finalProfilePath,
        DocumentPaths: finalizedDocumentsList,
        Active: Active ?? employee.Active,
        SortId: SortId || employee.SortId,
        Sflag: 'U',
        LogID: req.logId,
        PcID: req.pcId
    }, { transaction });

    // 5. Fetch Final Data
    const currentActiveSalary = await db.EmployeeSalaryHistory.findOne({
        where: { EmpMstId: employeeId, Active: true, ToDate: null },
        transaction
    });

    const data = employee.toJSON();
    data.CurrentSalary = currentActiveSalary;

    return res.status(200).json({
        success: true,
        message: "Employee profile updated successfully.",
        data: data
    });
};

exports.getAllEmployees = async (req, res, next) => {
    const page = parseInt(req.query.Page, 10) || 1;
    const limit = parseInt(req.query.Limit, 10) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.Search ? req.query.Search.trim() : "";

    // Build Search Clause for Raw SQL
    let searchSql = "";
    if (search) {
        searchSql = `WHERE e.EmpFullName LIKE :search 
                     OR e.EmpPhoneNo LIKE :search 
                     OR e.EmpPANNo LIKE :search 
                     ${!isNaN(search) ? "OR e.EmpCode = :searchInt" : ""}`;
    }

    // 1. Fetch Paginated Rows with Current Salary
    const rows = await db.sequelize.query(`
        SELECT e.*, s.SalaryAmount, s.SalaryType 
        FROM EmployeeMst e
        LEFT JOIN EmployeeSalaryHistory s ON e.EmpMstId = s.EmpMstId AND s.Active = 1
        ${searchSql}
        ORDER BY e.SortId ASC, e.EmpMstId DESC
        OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
    `, {
        replacements: {
            search: `%${search}%`,
            searchInt: parseInt(search, 10),
            offset,
            limit
        },
        type: QueryTypes.SELECT
    });

    // 2. Fetch Total Count (Required for meta pagination)
    const countResult = await db.sequelize.query(`
        SELECT COUNT(*) as total FROM EmployeeMst e
        ${searchSql}
    `, {
        replacements: {
            search: `%${search}%`,
            searchInt: parseInt(search, 10)
        },
        type: QueryTypes.SELECT
    });

    const totalRecords = countResult[0].total;

    return res.status(200).json({
        success: true,
        message: "Employees fetched successfully.",
        data: rows,
        meta: {
            totalRecords: totalRecords,
            currentPage: page,
            totalPages: Math.ceil(totalRecords / limit),
            perPageLimit: limit
        }
    });
};

exports.deleteEmployee = async (req, res, next) => {
    const employeeId = req.params.id;

    const employee = await db.EmployeeMst.unscoped().findOne({
        where: { EmpMstId: employeeId }
    });

    if (!employee) {
        throw new AppError("Employee record not found.", 404);
    }

    const transaction = req.transaction;

    await db.EmployeeSalaryHistory.destroy({
        where: { EmpMstId: employeeId },
        transaction
    });

    await db.EmployeeMst.destroy({
        where: { EmpMstId: employeeId },
        transaction
    });

    if (employee.ProfileImage) {
        deleteSingleFile(employee.ProfileImage);
    }

    if (employee.DocumentPaths) {
        deleteFileArray(employee.DocumentPaths);
    }

    return res.status(200).json({
        success: true,
        message: "Employee profile and all associated files purged permanently."
    });
};

exports.deleteUserDocuments = async (req, res, next) => {
    const employeeId = req.params.id;
    const { documentPathsToDelete } = req.body;

    if (!documentPathsToDelete || !Array.isArray(documentPathsToDelete) || documentPathsToDelete.length === 0) {
        throw new AppError("An array of document paths to delete is required.", 400);
    }

    const employee = await db.EmployeeMst.unscoped().findOne({
        where: { EmpMstId: employeeId }
    });

    if (!employee) {
        throw new AppError("Employee record not found.", 404);
    }

    if (!employee.DocumentPaths) {
        throw new AppError("No documents ledger found for this employee.", 404);
    }

    let currentDocsArray = [];
    try {
        currentDocsArray = JSON.parse(employee.DocumentPaths);
        if (!Array.isArray(currentDocsArray)) currentDocsArray = [];
    } catch (e) {
        throw new AppError("Malformed document storage structure inside the database.", 500);
    }

    const invalidPaths = documentPathsToDelete.filter(path => !currentDocsArray.includes(path));
    if (invalidPaths.length > 0) {
        throw new AppError("One or more target file paths do not belong to this employee profile.", 404);
    }

    const updatedDocsArray = currentDocsArray.filter(path => !documentPathsToDelete.includes(path));

    const updatedDocumentPathsString = updatedDocsArray.length > 0
        ? JSON.stringify(updatedDocsArray)
        : null;

    const transaction = await db.sequelize.transaction();

    await employee.update({
        DocumentPaths: updatedDocumentPathsString,
        Sflag: 'U',
        LogID: req.logId,
        PcID: req.pcId
    }, { transaction });

    await transaction.commit();

    deleteFileArray(JSON.stringify(documentPathsToDelete));

    return res.status(200).json({
        success: true,
        message: `${documentPathsToDelete.length} document(s) deleted successfully.`,
    });
};

exports.getEmployeeSalaryHistory = async (req, res, next) => {
    const { empMstId } = req.params;

    if (!empMstId) {
        throw new AppError("Employee ID is required to fetch salary history.", 400);
    }

    // Fetch all salary records for this employee
    const history = await db.EmployeeSalaryHistory.findAll({
        where: { EmpMstId: empMstId },
        order: [['FromDate', 'DESC']], // Newest changes at the top
    });

    if (!history || history.length === 0) {
        return res.status(200).json({
            success: true,
            message: "No salary history found for this employee.",
            data: []
        });
    }

    return res.status(200).json({
        success: true,
        message: "Salary history fetched successfully.",
        data: history
    });
};

exports.deleteSalaryHistory = async (req, res, next) => {
    const { historyId } = req.params;
    const transaction = req.transaction;

    // 1. Get the record to be deleted
    const recordToDelete = await db.EmployeeSalaryHistory.findOne({
        where: { SalaryHistoryId: historyId },
        transaction,
        lock: transaction.LOCK.UPDATE
    });

    if (!recordToDelete) throw new AppError("Salary record not found.", 404);

    const empMstId = recordToDelete.EmpMstId;

    // 2. Find the immediate PREVIOUS record
    const prevRecord = await db.EmployeeSalaryHistory.findOne({
        where: {
            EmpMstId: empMstId,
            ToDate: moment(recordToDelete.FromDate).subtract(1, 'days').format('YYYY-MM-DD')
        },
        transaction,
        lock: transaction.LOCK.UPDATE
    });

    // 3. Find the immediate NEXT record (if it exists)
    const nextRecord = await db.EmployeeSalaryHistory.findOne({
        where: {
            EmpMstId: empMstId,
            FromDate: moment(recordToDelete.ToDate || '9999-12-31').add(1, 'days').format('YYYY-MM-DD')
        },
        transaction,
        lock: transaction.LOCK.UPDATE
    });

    // 4. Delete the target record
    await recordToDelete.destroy({ transaction });

    // 5. BRIDGE THE GAP
    // If there is a previous record, extend its ToDate to cover the deleted record's ToDate
    if (prevRecord) {
        await prevRecord.update({
            ToDate: recordToDelete.ToDate // This carries over the ToDate (even if null)
        }, { transaction });
    }

    return res.status(200).json({
        success: true,
        message: "Salary record deleted and timeline bridged successfully."
    });
};