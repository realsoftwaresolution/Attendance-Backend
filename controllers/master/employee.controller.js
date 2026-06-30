const { Op, QueryTypes, Sequelize } = require("sequelize");
const db = require("../../config/dbConnection");
const { AppError } = require("../../utils/AppError");
const {
  deleteSingleFile,
  deleteFileArray,
} = require("../../utils/fileCleanup");
const { saveValidatedBuffersToDisk } = require("../../utils/uploadEngine");
const { getEmbeddingFromImagePath } = require("../../utils/face.utils");
const moment = require("moment");

exports.createEmployee = async (req, res, next) => {
  const transaction = req.transaction;
  const {
    EmpCode,
    CashSalary,
    BankSalary,
    SalaryType,
    EffectiveMonth,
    DateOfJoining,
  } = req.body;

  if (!EmpCode) throw new AppError("Employee Code (EmpCode) is required.", 400);

  const existingEmployee = await db.EmployeeMst.findOne({
    where: { EmpCode },
    transaction,
  });

  if (existingEmployee) {
    throw new AppError(`Employee with Code '${EmpCode}' already exists.`, 409);
  }

  // Process files
  const filePaths = await saveValidatedBuffersToDisk(req);

  // Generate embedding if biometric image is provided
  let biometricVector = null;
  const biometricImagePath = filePaths.biometricData?.[0] || null;
  
  if (biometricImagePath) {
      const embedding = await getEmbeddingFromImagePath(biometricImagePath);
      if (embedding) {
          biometricVector = JSON.stringify(Array.from(embedding));
      }
  }

  // Create Employee
  const employee = await db.EmployeeMst.create(
    {
      ...req.body,
      ProfileImage: filePaths.profileImage?.[0] || null,
      DocumentPaths: filePaths.documents?.length
        ? JSON.stringify(filePaths.documents)
        : null,
      BiometricImagePath: biometricImagePath,
      BiometricVector: biometricVector,
      Sflag: "I",
      LogID: req.logId,
      PcID: req.pcId,
      SortId: req.body.SortId || 1,
      Active: true,
    },
    { transaction },
  );

  // Create Initial Salary History
  const cash = Number(CashSalary || 0);
  const bank = Number(BankSalary || 0);
  const total = cash + bank;

  let activeSalary = null;

  if (total > 0) {
    const effectiveMonth =
      EffectiveMonth ||
      (DateOfJoining
        ? DateOfJoining.substring(0, 7)
        : new Date().toISOString().substring(0, 7));

    activeSalary = await db.EmployeeSalaryHistory.create(
      {
        EmpMstId: employee.EmpMstId,
        EffectiveMonth: effectiveMonth,
        CashSalary: cash,
        BankSalary: bank,
        TotalSalary: total,
        SalaryType: SalaryType || "Fixed",
        EmpBankFullName: req.body.EmpBankFullName,
        EmpBankName: req.body.EmpBankName,
        EmpBankACNo: req.body.EmpBankACNo,
        EmpBankIFSCode: req.body.EmpBankIFSCode,
        Active: true,
      },
      { transaction },
    );
  }

  const data = employee.toJSON();
  data.CurrentSalary = activeSalary;



  return res.status(201).json({
    success: true,
    message: "Employee profile created successfully.",
    data,
  });
};

exports.updateEmployee = async (req, res, next) => {
  const employeeId = req.params.id;
  const { transaction, logId, pcId } = req;

  const { EmpCode, CashSalary, BankSalary, SalaryType, EffectiveMonth } =
    req.body;

  const employee = await db.EmployeeMst.findOne({
    where: { EmpMstId: employeeId },
    transaction,
  });

  if (!employee) {
    throw new AppError("Employee record not found.", 404);
  }

  // Prevent duplicate EmpCode
  if (EmpCode && String(EmpCode) !== String(employee.EmpCode)) {
    const duplicate = await db.EmployeeMst.findOne({
      where: { EmpCode },
      transaction,
    });

    if (duplicate) {
      throw new AppError(`The EmpCode '${EmpCode}' is already assigned.`, 409);
    }
  }

  // File Upload Handling
  const filePaths = await saveValidatedBuffersToDisk(req);

  let finalProfilePath = employee.ProfileImage;

  if (filePaths.profileImage?.length > 0) {
    finalProfilePath = filePaths.profileImage[0];

    if (employee.ProfileImage && employee.ProfileImage !== finalProfilePath) {
      deleteSingleFile(employee.ProfileImage);
    }
  }

  let finalBiometricPath = employee.BiometricImagePath;
  let finalBiometricVector = employee.BiometricVector;

  if (filePaths.biometricData?.length > 0) {
    finalBiometricPath = filePaths.biometricData[0];

    // Generate new embedding for the new image
    const newEmbedding = await getEmbeddingFromImagePath(finalBiometricPath);
    if (newEmbedding) {
        finalBiometricVector = JSON.stringify(Array.from(newEmbedding));
    } else {
        finalBiometricVector = null; // Clear if no face found
    }

    if (employee.BiometricImagePath && employee.BiometricImagePath !== finalBiometricPath) {
      deleteSingleFile(employee.BiometricImagePath);
    }
  }

  let finalizedDocumentsList = employee.DocumentPaths;

  if (filePaths.documents?.length > 0) {
    let currentDocs = [];

    try {
      currentDocs = JSON.parse(employee.DocumentPaths || "[]");
    } catch {
      currentDocs = [];
    }

    finalizedDocumentsList = JSON.stringify([
      ...currentDocs,
      ...filePaths.documents,
    ]);
  }

  /* ---------------- Salary History Versioning ---------------- */

  if (
    CashSalary !== undefined ||
    BankSalary !== undefined ||
    SalaryType !== undefined ||
    EffectiveMonth !== undefined
  ) {
    const cash = Number(CashSalary || 0);
    const bank = Number(BankSalary || 0);
    const total = cash + bank;

    const effectiveMonthValue = EffectiveMonth || moment().format("YYYY-MM");

    const currentActive = await db.EmployeeSalaryHistory.findOne({
      where: {
        EmpMstId: employeeId,
        Active: true,
      },
      transaction,
    });

    let skipSalaryUpdate = false;

    if (currentActive) {
      skipSalaryUpdate =
        Number(currentActive.CashSalary || 0) === cash &&
        Number(currentActive.BankSalary || 0) === bank &&
        Number(currentActive.TotalSalary || 0) === total &&
        currentActive.SalaryType === (SalaryType || currentActive.SalaryType) &&
        currentActive.EffectiveMonth === effectiveMonthValue;
    }

    if (!skipSalaryUpdate) {
      // Prevent duplicate month entry
      const existingMonth = await db.EmployeeSalaryHistory.findOne({
        where: {
          EmpMstId: employeeId,
          EffectiveMonth: effectiveMonthValue,
        },
        transaction,
      });

      if (existingMonth) {
        throw new AppError(
          `Salary history already exists for month ${effectiveMonthValue}.`,
          400,
        );
      }

      if (currentActive) {
        await currentActive.update({ Active: false }, { transaction });
      }

      await db.EmployeeSalaryHistory.create(
        {
          EmpMstId: employeeId,
          EffectiveMonth: effectiveMonthValue,
          CashSalary: cash,
          BankSalary: bank,
          TotalSalary: total,
          SalaryType: SalaryType || currentActive?.SalaryType || "Fixed",
          EmpBankFullName: req.body.EmpBankFullName,
          EmpBankName: req.body.EmpBankName,
          EmpBankACNo: req.body.EmpBankACNo,
          EmpBankIFSCode: req.body.EmpBankIFSCode,
          Active: true,
        },
        { transaction },
      );
    }
  }

  /* ---------------- Employee Update ---------------- */

  const updatePayload = Object.fromEntries(
    Object.entries(req.body).filter(([_, v]) => v !== undefined),
  );

  await employee.update(
    {
      ...updatePayload,
      ProfileImage: finalProfilePath,
      DocumentPaths: finalizedDocumentsList,
      BiometricImagePath: finalBiometricPath,
      BiometricVector: finalBiometricVector,
      Sflag: "U",
      LogID: logId,
      PcID: pcId,
    },
    { transaction },
  );

  /* ---------------- Response ---------------- */

  const currentActiveSalary = await db.EmployeeSalaryHistory.findOne({
    where: {
      EmpMstId: employeeId,
      Active: true,
    },
    order: [["EffectiveMonth", "DESC"]],
    transaction,
  });

  const data = employee.toJSON();
  data.CurrentSalary = currentActiveSalary;



  return res.status(200).json({
    success: true,
    message: "Employee profile updated successfully.",
    data,
  });
};

exports.getAllEmployees = async (req, res, next) => {
  try {
    // 1. Check for Pagination Flag (Defaults to true)
    const isPagination =
      req.query.isPagination !== "false" && req.query.isPagination !== false;

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;

    const search = req.query.Search ? req.query.Search.trim() : "";
    const departmentMstId = req.query.DepartmentMstId
      ? parseInt(req.query.DepartmentMstId, 10)
      : null;
    const companyMstId = req.query.CompanyMstId
      ? parseInt(req.query.CompanyMstId, 10)
      : null;
    const empCodeFilter = req.query.EmpCode
      ? parseInt(req.query.EmpCode, 10)
      : null;

    const conditions = ["1=1"];
    const replacements = {};

    // 2. Text Search Processing
    if (search) {
      const isNum = !isNaN(search) && search !== "";
      if (isNum) {
        conditions.push(
          `(e.EmpFullName LIKE :search OR e.EmpPhoneNo LIKE :search OR e.EmpPANNo LIKE :search OR e.EmpCode = :searchInt)`,
        );
        replacements.searchInt = parseInt(search, 10);
      } else {
        conditions.push(
          `(e.EmpFullName LIKE :search OR e.EmpPhoneNo LIKE :search OR e.EmpPANNo LIKE :search)`,
        );
      }
      replacements.search = `%${search}%`;
    }

    // 3. Filter Processing
    if (departmentMstId) {
      conditions.push("e.DepartmentMstId = :departmentMstId");
      replacements.departmentMstId = departmentMstId;
    }
    if (companyMstId) {
      conditions.push("e.CompanyMstId = :companyMstId");
      replacements.companyMstId = companyMstId;
    }
    if (empCodeFilter) {
      conditions.push("e.EmpCode = :empCodeFilter");
      replacements.empCodeFilter = empCodeFilter;
    }

    const searchSql = `WHERE ${conditions.join(" AND ")}`;

    // 4. Handle Conditional SQL Pagination Blocks
    let paginationSql = "";
    if (isPagination) {
      paginationSql = "OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY";
      replacements.offset = offset;
      replacements.limit = limit;
    }

    // 5. Query Implementation
    const rows = await db.sequelize.query(
      `
            SELECT
                e.*,
                e.BranchMstId AS EmpBranch,
                sh.CashSalary,
                sh.BankSalary,
                sh.TotalSalary,
                sh.SalaryType,
                sh.EffectiveMonth,
                d.Department AS EmpDepartment,
                dg.Designation AS EmpDesignation,
                c.CompanyName AS EmpCompanyName
            FROM EmployeeMst e
            LEFT JOIN (
                SELECT *, 
                       ROW_NUMBER() OVER (PARTITION BY EmpMstId ORDER BY createdAt DESC) as rn
                FROM EmployeeSalaryHistory 
                WHERE Active = 1
            ) sh ON e.EmpMstId = sh.EmpMstId AND sh.rn = 1
            LEFT JOIN DepartmentMst d ON e.DepartmentMstId = d.DepartmentMstId
            LEFT JOIN DesignationMst dg ON e.DesignationMstId = dg.DesignationMstId
            LEFT JOIN CompanyMst c ON e.CompanyMstId = c.CompanyMstId
            
            ${searchSql}
            
            ORDER BY e.EmpMstId DESC
            ${paginationSql}
        `,
      {
        replacements,
        type: QueryTypes.SELECT,
      },
    );

    // 6. Record Count Processing
    const countResult = await db.sequelize.query(
      `
            SELECT COUNT(e.EmpMstId) AS total
            FROM EmployeeMst e
            ${searchSql}
        `,
      {
        replacements,
        type: QueryTypes.SELECT,
      },
    );

    const totalRecords = Number(countResult[0]?.total || 0);

    // 7. Adjust Metadata response map dynamically
    const meta = isPagination
      ? {
          isPaginationEnabled: true,
          totalRecords,
          currentPage: page,
          totalPages: Math.ceil(totalRecords / limit),
          perPageLimit: limit,
        }
      : {
          isPaginationEnabled: false,
          totalRecords,
        };

    return res.status(200).json({
      success: true,
      message: "Employees fetched successfully.",
      data: rows,
      meta,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteEmployee = async (req, res, next) => {
  const employeeId = req.params.id;
  const { transaction } = req;

  const employee = await db.EmployeeMst.unscoped().findOne({
    where: { EmpMstId: employeeId },
    transaction,
  });

  if (!employee) throw new AppError("Employee record not found.", 404);

  // 1. Delete associated database records
  await db.EmployeeSalaryHistory.destroy({
    where: { EmpMstId: employeeId },
    transaction,
  });
  await employee.destroy({ transaction });

  // 2. Clean up files on disk post-database success
  if (employee.ProfileImage) deleteSingleFile(employee.ProfileImage);
  if (employee.BiometricImagePath) deleteSingleFile(employee.BiometricImagePath);
  if (employee.DocumentPaths) deleteFileArray(employee.DocumentPaths);

  return res.status(200).json({
    success: true,
    message: "Employee profile and record history deleted successfully.",
  });
};

exports.deleteUserDocuments = async (req, res, next) => {
  const employeeId = req.params.id;
  const { documentPathsToDelete } = req.body;

  if (
    !documentPathsToDelete ||
    !Array.isArray(documentPathsToDelete) ||
    documentPathsToDelete.length === 0
  ) {
    throw new AppError(
      "An array of document paths to delete is required.",
      400,
    );
  }

  const employee = await db.EmployeeMst.unscoped().findOne({
    where: { EmpMstId: employeeId },
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
    throw new AppError(
      "Malformed document storage structure inside the database.",
      500,
    );
  }

  const invalidPaths = documentPathsToDelete.filter(
    (path) => !currentDocsArray.includes(path),
  );
  if (invalidPaths.length > 0) {
    throw new AppError(
      "One or more target file paths do not belong to this employee profile.",
      404,
    );
  }

  const updatedDocsArray = currentDocsArray.filter(
    (path) => !documentPathsToDelete.includes(path),
  );

  const updatedDocumentPathsString =
    updatedDocsArray.length > 0 ? JSON.stringify(updatedDocsArray) : null;

  const transaction = await db.sequelize.transaction();

  await employee.update(
    {
      DocumentPaths: updatedDocumentPathsString,
      Sflag: "U",
      LogID: req.logId,
      PcID: req.pcId,
    },
    { transaction },
  );

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

  const employee = await db.EmployeeMst.findOne({
    attributes: ["EmpMstId", "EmpCode", "EmpFullName"],
    where: { EmpMstId: empMstId },
  });

  if (!employee) {
    throw new AppError("Employee not found.", 404);
  }

  const history = await db.EmployeeSalaryHistory.findAll({
    attributes: [
      "SalaryHistoryId",
      "EffectiveMonth",
      "CashSalary",
      "BankSalary",
      "TotalSalary",
      "SalaryType",
      "EmpBankFullName",
      "EmpBankName",
      "EmpBankACNo",
      "EmpBankIFSCode",
      "Active",
      "createdAt",
      "updatedAt",
    ],
    where: {
      EmpMstId: empMstId,
    },
    order: [["EffectiveMonth", "DESC"]],
  });

  return res.status(200).json({
    success: true,
    message: history.length
      ? "Salary history fetched successfully."
      : "No salary history found for this employee.",
    employee: {
      EmpMstId: employee.EmpMstId,
      EmpCode: employee.EmpCode,
      EmpFullName: employee.EmpFullName,
    },
    data: history,
  });
};

exports.deleteSalaryHistory = async (req, res, next) => {
  const { historyId } = req.params;
  const { transaction } = req;

  // Get the salary record
  const recordToDelete = await db.EmployeeSalaryHistory.findOne({
    where: {
      SalaryHistoryId: historyId,
      Active: true,
    },
    transaction,
  });

  if (!recordToDelete) {
    throw new AppError(
      "Only the current active salary record can be deleted.",
      400,
    );
  }

  const empMstId = recordToDelete.EmpMstId;

  // Delete active record
  await recordToDelete.destroy({ transaction });

  // Activate previous latest record
  const previousRecord = await db.EmployeeSalaryHistory.findOne({
    where: {
      EmpMstId: empMstId,
    },
    order: [["EffectiveMonth", "DESC"]],
    transaction,
  });

  if (previousRecord) {
    await previousRecord.update({ Active: true }, { transaction });
  }

  return res.status(200).json({
    success: true,
    message:
      "Salary history deleted successfully and previous salary restored.",
  });
};

exports.getEmployeeBasicInfo = async (req, res, next) => {
  const { empCode } = req.params;

  if (!empCode) {
    throw new AppError("Employee Code is required.", 400);
  }

  // Added Id fields to the query
  const query = `
        SELECT TOP 1
            e.EmpMstId,
            e.EmpFullName,
            dg.DesignationMstId,
            dg.Designation,
            c.CompanyMstId,
            c.CompanyName,
            d.DepartmentMstId,
            d.Department
        FROM EmployeeMst e
        LEFT JOIN DesignationMst dg ON e.DesignationMstId = dg.DesignationMstId
        LEFT JOIN CompanyMst c ON e.CompanyMstId = c.CompanyMstId
        LEFT JOIN DepartmentMst d ON e.DepartmentMstId = d.DepartmentMstId
        WHERE e.EmpCode = :empCode
    `;

  const result = await db.sequelize.query(query, {
    replacements: { empCode },
    type: QueryTypes.SELECT,
  });

  if (result.length === 0) {
    throw new AppError("Employee not found with the provided code.", 404);
  }

  return res.status(200).json({
    success: true,
    message: "Employee basic information retrieved successfully.",
    data: result[0],
  });
};
