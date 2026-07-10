const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");
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

  const biometricImagePath = filePaths.biometricData?.[0] || null;
  let biometricVector = req.body.BiometricVector || null;

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
  let finalBiometricVector = req.body.BiometricVector !== undefined ? req.body.BiometricVector : employee.BiometricVector;

  if (filePaths.biometricData?.length > 0) {
    finalBiometricPath = filePaths.biometricData[0];

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

      let shouldNewRecordBeActive = true;

      if (currentActive) {
        if (effectiveMonthValue >= currentActive.EffectiveMonth) {
          // New record is newer (or same), make it active and deactivate old
          await currentActive.update({ Active: false }, { transaction });
        } else {
          // New record is older, keep current active as is
          shouldNewRecordBeActive = false;
        }
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
          Active: shouldNewRecordBeActive,
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
                c.CompanyName AS EmpCompanyName,
                c.Address AS EmpCompanyAddress
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
  let { month } = req.query;

  if (!month) {
    const currentDate = new Date();
    month = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  }

  if (!empCode) {
    throw new AppError("Employee Code is required.", 400);
  }

  // Added Id fields to the query
  const query = `
        SELECT TOP 1
            e.EmpMstId,
            e.EmpFullName,
            e.AadharCardNo,
            dg.DesignationMstId,
            dg.Designation,
            c.CompanyMstId,
            c.CompanyName,
            d.DepartmentMstId,
            d.Department,
            sh.CashSalary,
            sh.BankSalary,
            sh.TotalSalary,
            sd.NetPayableSalary As NetSalary
        FROM EmployeeMst e
        LEFT JOIN (
            SELECT *, 
                   ROW_NUMBER() OVER (PARTITION BY EmpMstId ORDER BY createdAt DESC) as rn
            FROM EmployeeSalaryHistory 
            WHERE Active = 1 ${month ? `AND EffectiveMonth <= :month` : ''}
        ) sh ON e.EmpMstId = sh.EmpMstId AND sh.rn = 1
        LEFT JOIN DesignationMst dg ON e.DesignationMstId = dg.DesignationMstId
        LEFT JOIN CompanyMst c ON e.CompanyMstId = c.CompanyMstId
        LEFT JOIN DepartmentMst d ON e.DepartmentMstId = d.DepartmentMstId
        LEFT JOIN SalaryDet sd ON e.EmpMstId = sd.EmpMstId ${month ? `AND sd.SalaryMonth = :month` : 'AND 1=0'}
        WHERE e.EmpCode = :empCode
    `;

  const replacements = { empCode };
  if (month) {
      replacements.month = month;
  }

  const result = await db.sequelize.query(query, {
    replacements,
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

exports.exportEmployeeMasterData = async (req, res, next) => {
  try {
    const { EmpCode, EmpMstId, DepartmentMstId, CompanyMstId, DesignationMstId } = req.query;

    let whereClause = `WHERE 1=1`;
    const replacements = {};

    const applyInFilter = (paramValue, columnName, paramKey) => {
      if (paramValue) {
        const values = String(paramValue)
          .split(",")
          .map((v) => v.trim())
          .filter((v) => v !== "");
          
        if (values.length > 0) {
          whereClause += ` AND ${columnName} IN (:${paramKey})`;
          replacements[paramKey] = values;
        }
      }
    };

    applyInFilter(EmpCode, "e.EmpCode", "EmpCode");
    applyInFilter(EmpMstId, "e.EmpMstId", "EmpMstId");
    applyInFilter(DepartmentMstId, "e.DepartmentMstId", "DepartmentMstId");
    applyInFilter(CompanyMstId, "e.CompanyMstId", "CompanyMstId");
    applyInFilter(DesignationMstId, "e.DesignationMstId", "DesignationMstId");

    const query = `
      SELECT 
          e.*,
          ISNULL(c.CompanyName, 'Unassigned Company') AS CompanyName, 
          ISNULL(d.Department, 'Unassigned Department') AS Department, 
          ISNULL(dg.Designation, 'Unassigned Designation') AS Designation,
          sh.CashSalary,
          sh.BankSalary,
          sh.TotalSalary,
          sh.SalaryType
      FROM EmployeeMst e
      LEFT JOIN CompanyMst c ON e.CompanyMstId = c.CompanyMstId
      LEFT JOIN DepartmentMst d ON e.DepartmentMstId = d.DepartmentMstId
      LEFT JOIN DesignationMst dg ON e.DesignationMstId = dg.DesignationMstId
      LEFT JOIN (
          SELECT *, ROW_NUMBER() OVER (PARTITION BY EmpMstId ORDER BY createdAt DESC) as rn
          FROM EmployeeSalaryHistory
          WHERE Active = 1
      ) sh ON e.EmpMstId = sh.EmpMstId AND sh.rn = 1
      ${whereClause}
      ORDER BY CompanyName ASC, Department ASC, Designation ASC, e.EmpFullName ASC
    `;

    const employees = await db.sequelize.query(query, {
      replacements,
      type: QueryTypes.SELECT,
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Employee Master');

    worksheet.columns = [
      { header: 'Company', key: 'CompanyName', width: 30 },
      { header: 'Department', key: 'Department', width: 30 },
      { header: 'Designation', key: 'Designation', width: 30 },
      { header: 'Emp Code', key: 'EmpCode', width: 15 },
      { header: 'Full Name', key: 'EmpFullName', width: 35 },
      { header: 'Emp Type', key: 'EmpType', width: 15 },
      { header: 'Phone', key: 'EmpPhoneNo', width: 15 },
      { header: 'PAN No', key: 'EmpPANNo', width: 15 },
      { header: 'Aadhar', key: 'AadharCardNo', width: 15 },
      { header: 'ESI No', key: 'ESINo', width: 15 },
      { header: 'Address', key: 'EmpAddress', width: 50 },
      { header: 'Date of Joining', key: 'DateOfJoining', width: 25 },
      { header: 'Date of Birth', key: 'DateOfBirth', width: 20 },
      { header: 'Emp Group', key: 'EmpGrp', width: 15 },
      { header: 'PF App.', key: 'IsPFApplicable', width: 20 },
      { header: 'EPS App.', key: 'IsEPSApplicable', width: 20 },
      { header: 'PF Eff. Month', key: 'PFEffectiveMonth', width: 20 },
      { header: 'UAN No', key: 'UANNo', width: 15 },
      { header: 'PF No', key: 'PFNo', width: 15 },
      { header: 'ESIC App.', key: 'IsESICApplicable', width: 20 },
      { header: 'ESIC Eff. Month', key: 'ESICEffectiveMonth', width: 25 },
      { header: 'ESINo', key: 'ESINo', width: 15 },
      { header: 'PT App.', key: 'IsPTApplicable', width: 20 },
      { header: 'PT Eff. Month', key: 'PTEffectiveMonth', width: 20 },
      { header: 'PT Remarks', key: 'PTRemarks', width: 25 },
      { header: 'Bank Full Name', key: 'EmpBankFullName', width: 35 },
      { header: 'Bank Name', key: 'EmpBankName', width: 30 },
      { header: 'Bank A/C No', key: 'EmpBankACNo', width: 25 },
      { header: 'IFSC Code', key: 'EmpBankIFSCode', width: 15 },
      { header: 'Bank Address', key: 'EmpBankAddress', width: 35 },
      { header: 'Salary Type', key: 'SalaryType', width: 15 },
      { header: 'Cash Salary', key: 'CashSalary', width: 15 },
      { header: 'Bank Salary', key: 'BankSalary', width: 15 },
      { header: 'Total Salary', key: 'TotalSalary', width: 15 },
      { header: 'Date of Resign', key: 'DateOfResign', width: 20 },
      { header: 'Active Status', key: 'Active', width: 15 },
    ];

    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 14 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B3B3B' } }; // Dark grey from image
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
    
    let currentCompany = null;
    let currentDept = null;
    let currentDesig = null;
    let startCompanyRow = 2;
    let startDeptRow = 2;
    let startDesigRow = 2;

    const mergeCells = (colLetter, start, end) => {
      if (start < end) {
        worksheet.mergeCells(`${colLetter}${start}:${colLetter}${end}`);
        const cell = worksheet.getCell(`${colLetter}${start}`);
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      }
    };

    employees.forEach((emp, index) => {
      const rowIndex = index + 2;

      worksheet.addRow({
        CompanyName: emp.CompanyName,
        Department: emp.Department,
        Designation: emp.Designation,
        EmpCode: emp.EmpCode,
        EmpFullName: emp.EmpFullName,
        EmpType: emp.EmpType,
        EmpPhoneNo: emp.EmpPhoneNo || '-',
        EmpPANNo: emp.EmpPANNo || '-',
        AadharCardNo: emp.AadharCardNo || '-',
        ESINo: emp.ESINo || '-',
        EmpAddress: emp.EmpAddress || '-',
        DateOfJoining: emp.DateOfJoining || '-',
        DateOfBirth: emp.DateOfBirth || '-',
        EmpGrp: emp.EmpGrp || '-',
        IsPFApplicable: emp.IsPFApplicable ? 'Yes' : 'No',
        IsEPSApplicable: emp.IsEPSApplicable ? 'Yes' : 'No',
        PFEffectiveMonth: emp.PFEffectiveMonth || '-',
        UANNo: emp.UANNo || '-',
        PFNo: emp.PFNo || '-',
        IsESICApplicable: emp.IsESICApplicable ? 'Yes' : 'No',
        ESICEffectiveMonth: emp.ESICEffectiveMonth || '-',
        ESINo: emp.ESINo || '-',
        IsPTApplicable: emp.IsPTApplicable ? 'Yes' : 'No',
        PTEffectiveMonth: emp.PTEffectiveMonth || '-',
        PTRemarks: emp.PTRemarks || '-',
        EmpBankFullName: emp.EmpBankFullName || '-',
        EmpBankName: emp.EmpBankName || '-',
        EmpBankACNo: emp.EmpBankACNo || '-',
        EmpBankIFSCode: emp.EmpBankIFSCode || '-',
        EmpBankAddress: emp.EmpBankAddress || '-',
        SalaryType: emp.SalaryType || '-',
        CashSalary: emp.CashSalary || 0,
        BankSalary: emp.BankSalary || 0,
        TotalSalary: emp.TotalSalary || 0,
        DateOfResign: emp.DateOfResign || '-',
        Active: emp.Active ? 'Active' : 'Inactive',
      });

      const row = worksheet.getRow(rowIndex);
      // Remove hardcoded height to allow Excel to auto-fit to content height
      row.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      
      // Set font size to 12 for data rows
      row.eachCell((cell) => {
        cell.font = { size: 12 };
      });

      const isCompanyChanged = currentCompany !== null && currentCompany !== emp.CompanyName;
      const isDeptChanged = currentDept !== null && (isCompanyChanged || currentDept !== emp.Department);
      const isDesigChanged = currentDesig !== null && (isDeptChanged || currentDesig !== emp.Designation);

      if (isCompanyChanged) {
        mergeCells('A', startCompanyRow, rowIndex - 1);
        startCompanyRow = rowIndex;
      }
      if (isDeptChanged) {
        mergeCells('B', startDeptRow, rowIndex - 1);
        startDeptRow = rowIndex;
      }
      if (isDesigChanged) {
        mergeCells('C', startDesigRow, rowIndex - 1);
        startDesigRow = rowIndex;
      }

      currentCompany = emp.CompanyName;
      currentDept = emp.Department;
      currentDesig = emp.Designation;
    });

    const finalRow = employees.length + 1;
    if (employees.length > 0) {
      mergeCells('A', startCompanyRow, finalRow);
      mergeCells('B', startDeptRow, finalRow);
      mergeCells('C', startDesigRow, finalRow);
    }

    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=EmployeeMasterExport.xlsx');

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    next(error);
  }
};

exports.bulkImportTemplate = async (req, res, next) => {
  try {
    const ExcelJS = require("exceljs");
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Employee_Bulk_Import');

    worksheet.columns = [
      { header: 'EmpCode', key: 'EmpCode', width: 15 },
      { header: 'EmpFullName', key: 'EmpFullName', width: 25 },
      { header: 'EmpType', key: 'EmpType', width: 15 },
      { header: 'Company', key: 'Company', width: 25 },
      { header: 'Department', key: 'Department', width: 20 },
      { header: 'Designation', key: 'Designation', width: 20 },
      { header: 'CashSalary', key: 'CashSalary', width: 15 },
      { header: 'BankSalary', key: 'BankSalary', width: 15 },
      { header: 'EffectiveMonth', key: 'EffectiveMonth', width: 15 },
      { header: 'EmpPhoneNo', key: 'EmpPhoneNo', width: 20 },
      { header: 'EmpPANNo', key: 'EmpPANNo', width: 20 },
      { header: 'AadharCardNo', key: 'AadharCardNo', width: 20 },
      { header: 'EmpAddress', key: 'EmpAddress', width: 30 },
      { header: 'DateOfJoining', key: 'DateOfJoining', width: 15 },
      { header: 'DateOfBirth', key: 'DateOfBirth', width: 15 },
      { header: 'DateOfResign', key: 'DateOfResign', width: 15 },
      { header: 'EmpGrp', key: 'EmpGrp', width: 15 },
      { header: 'EmpBankFullName', key: 'EmpBankFullName', width: 20 },
      { header: 'EmpBankName', key: 'EmpBankName', width: 20 },
      { header: 'EmpBankACNo', key: 'EmpBankACNo', width: 20 },
      { header: 'EmpBankIFSCode', key: 'EmpBankIFSCode', width: 20 },
      { header: 'EmpBankAddress', key: 'EmpBankAddress', width: 25 },
      { header: 'IsPFApplicable', key: 'IsPFApplicable', width: 15 },
      { header: 'IsEPSApplicable', key: 'IsEPSApplicable', width: 15 },
      { header: 'PFEffectiveMonth', key: 'PFEffectiveMonth', width: 15 },
      { header: 'UANNo', key: 'UANNo', width: 15 },
      { header: 'PFNo', key: 'PFNo', width: 15 },
      { header: 'IsESICApplicable', key: 'IsESICApplicable', width: 15 },
      { header: 'ESICEffectiveMonth', key: 'ESICEffectiveMonth', width: 15 },
      { header: 'ESINo', key: 'ESINo', width: 15 },
      { header: 'IsPTApplicable', key: 'IsPTApplicable', width: 15 },
      { header: 'PTEffectiveMonth', key: 'PTEffectiveMonth', width: 15 },
      { header: 'PTRemarks', key: 'PTRemarks', width: 15 },
      { header: 'SortId', key: 'SortId', width: 10 }
    ];

    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Employee_Bulk_Import_Template.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};

exports.bulkImportEmployees = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError("No Excel file uploaded.", 400);
    }

    const { employeeRegistrationSchema } = require("../../validations/master/employee.validation");
    const ExcelJS = require("exceljs");
    const moment = require("moment");

    // 1. Fetch Masters efficiently (Once)
    const companyRecords = await db.CompanyMst.findAll({ attributes: ['CompanyMstId', 'CompanyName'] });
    const deptRecords = await db.DepartmentMst.findAll({ attributes: ['DepartmentMstId', 'Department'] });
    const desigRecords = await db.DesignationMst.findAll({ attributes: ['DesignationMstId', 'Designation'] });
    // Build Case-Insensitive Maps
    const toMap = (records, nameKey, idKey) => {
      const map = new Map();
      records.forEach(r => {
        if (r[nameKey]) map.set(String(r[nameKey]).trim().toLowerCase(), r[idKey]);
      });
      return map;
    };

    const companyMap = toMap(companyRecords, 'CompanyName', 'CompanyMstId');
    const deptMap = toMap(deptRecords, 'Department', 'DepartmentMstId');
    const desigMap = toMap(desigRecords, 'Designation', 'DesignationMstId');

    // 2. Parse Excel
    const workbook = new ExcelJS.Workbook();
    try {
        await workbook.xlsx.load(req.file.buffer);
    } catch (err) {
        throw new AppError("Invalid or corrupted Excel file. Please ensure you are uploading a valid .xlsx file format.", 400);
    }
    const worksheet = workbook.worksheets[0];

    const errors = [];
    const validPayloads = [];

    // Dynamically map headers from Row 1 to be highly robust against casing and spaces
    const headerMap = {};
    worksheet.getRow(1).eachCell((cell, colNumber) => {
      if (cell.value) {
        const headerName = String(cell.value).toLowerCase().replace(/\s+/g, '');
        headerMap[headerName] = colNumber;
      }
    });

    const getVal = (row, colName) => {
      const cleanColName = String(colName).toLowerCase().replace(/\s+/g, '');
      const colIdx = headerMap[cleanColName];
      if (!colIdx) return null;

      let val = row.getCell(colIdx).value;
      
      // Handle rich text or formula cells
      if (val && typeof val === 'object') {
        if (val.richText) val = val.richText.map(rt => rt.text).join('');
        else if (val.result !== undefined) val = val.result;
        else if (val instanceof Date) {
          // If the column asks for EffectiveMonth, format YYYY-MM, else YYYY-MM-DD
          if (cleanColName.includes('effectivemonth')) {
            val = moment(val).format('YYYY-MM');
          } else {
            val = moment(val).format('YYYY-MM-DD');
          }
        }
      }

      let finalVal = val !== null && val !== undefined ? String(val).trim() : null;

      // Force strictly slice strings that are accidentally ISO dates (e.g., "1990-05-20T00:00...")
      if (finalVal && cleanColName.includes('date')) {
         finalVal = finalVal.substring(0, 10);
      }
      if (finalVal && cleanColName.includes('effectivemonth')) {
         finalVal = finalVal.substring(0, 7);
      }

      return finalVal;
    };

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const rowErrors = [];
      const rawCompany = getVal(row, 'Company');
      const rawDept = getVal(row, 'Department');
      const rawDesig = getVal(row, 'Designation');

      const companyId = rawCompany ? companyMap.get(rawCompany.toLowerCase()) : null;
      const deptId = rawDept ? deptMap.get(rawDept.toLowerCase()) : null;
      const desigId = rawDesig ? desigMap.get(rawDesig.toLowerCase()) : null;

      if (rawCompany && !companyId) rowErrors.push(`Company '${rawCompany}' not found in database.`);
      if (rawDept && !deptId) rowErrors.push(`Department '${rawDept}' not found in database.`);
      if (rawDesig && !desigId) rowErrors.push(`Designation '${rawDesig}' not found in database.`);

      // Format booleans
      const toBool = (val) => val && String(val).toLowerCase() === 'yes';

      const payload = {
        EmpCode: getVal(row, 'EmpCode'),
        EmpFullName: getVal(row, 'EmpFullName'),
        EmpType: getVal(row, 'EmpType'),
        CompanyMstId: companyId,
        BranchMstId: 1,
        DepartmentMstId: deptId,
        DesignationMstId: desigId,
        CashSalary: getVal(row, 'CashSalary'),
        BankSalary: getVal(row, 'BankSalary'),
        SalaryType: 'None',
        EffectiveMonth: getVal(row, 'EffectiveMonth'),
        EmpPhoneNo: getVal(row, 'EmpPhoneNo'),
        EmpPANNo: getVal(row, 'EmpPANNo'),
        AadharCardNo: getVal(row, 'AadharCardNo'),
        EmpAddress: getVal(row, 'EmpAddress'),
        DateOfJoining: getVal(row, 'DateOfJoining'),
        DateOfBirth: getVal(row, 'DateOfBirth'),
        DateOfResign: getVal(row, 'DateOfResign'),
        EmpGrp: getVal(row, 'EmpGrp'),
        EmpBankFullName: getVal(row, 'EmpBankFullName'),
        EmpBankName: getVal(row, 'EmpBankName'),
        EmpBankACNo: getVal(row, 'EmpBankACNo'),
        EmpBankIFSCode: getVal(row, 'EmpBankIFSCode'),
        EmpBankAddress: getVal(row, 'EmpBankAddress'),
        IsPFApplicable: toBool(getVal(row, 'IsPFApplicable')),
        IsEPSApplicable: toBool(getVal(row, 'IsEPSApplicable')),
        PFEffectiveMonth: getVal(row, 'PFEffectiveMonth'),
        UANNo: getVal(row, 'UANNo'),
        PFNo: getVal(row, 'PFNo'),
        IsESICApplicable: toBool(getVal(row, 'IsESICApplicable')),
        ESICEffectiveMonth: getVal(row, 'ESICEffectiveMonth'),
        ESINo: getVal(row, 'ESINo'),
        IsPTApplicable: toBool(getVal(row, 'IsPTApplicable')),
        PTEffectiveMonth: getVal(row, 'PTEffectiveMonth'),
        PTRemarks: getVal(row, 'PTRemarks'),
        SortId: getVal(row, 'SortId') || 1
      };

      // Strip out null values for optional Joi validation
      Object.keys(payload).forEach(key => {
          if (payload[key] === null || payload[key] === '') {
              delete payload[key];
          }
      });

      // Joi Validation
      const { error, value } = employeeRegistrationSchema.validate(payload, { abortEarly: false });
      
      if (error) {
        const cleanedErrors = error.details
          .map(err => err.message.replace(/\"/g, ''))
          .filter(msg => {
             // If there's a mapping error for a field, hide the redundant 'required' error
             if (msg.includes('MstId')) {
                 const fieldName = msg.split('MstId')[0]; // e.g. 'Department'
                 const hasMappingError = rowErrors.some(e => e.includes(fieldName) && e.includes('not found'));
                 if (hasMappingError) return false;
             }
             return true;
          })
          .map(msg => {
             // Convert 'DepartmentMstId is required' to 'Department column is required'
             if (msg.includes('MstId')) {
                 return msg.replace('MstId', ' column');
             }
             return msg;
          });

        rowErrors.push(...cleanedErrors);
      }

      if (rowErrors.length > 0) {
        errors.push({ row: rowNumber, issues: rowErrors });
      } else {
        validPayloads.push(value);
      }
    });

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Bulk import failed due to validation or mapping errors.",
        errors: errors
      });
    }

    // 3. Execution (All-or-nothing Transaction)
    const transaction = await db.sequelize.transaction();
    
    try {
      for (const empData of validPayloads) {
        // Pre-check EmpCode
        const existingCode = await db.EmployeeMst.findOne({ where: { EmpCode: empData.EmpCode }, transaction });
        if (existingCode) {
          throw new AppError(`Employee Code '${empData.EmpCode}' already exists in database.`, 409);
        }

        const employee = await db.EmployeeMst.create({
          ...empData,
          Sflag: "I",
          LogID: req.logId,
          PcID: req.pcId,
          SortId: empData.SortId || 1,
          Active: true
        }, { transaction });

        const totalSalary = Number(empData.CashSalary || 0) + Number(empData.BankSalary || 0);

        await db.EmployeeSalaryHistory.create({
          EmpMstId: employee.EmpMstId,
          EffectiveMonth: empData.EffectiveMonth,
          CashSalary: empData.CashSalary,
          BankSalary: empData.BankSalary,
          TotalSalary: totalSalary,
          SalaryType: empData.SalaryType,
          EmpBankFullName: empData.EmpBankFullName,
          EmpBankName: empData.EmpBankName,
          EmpBankACNo: empData.EmpBankACNo,
          EmpBankIFSCode: empData.EmpBankIFSCode,
          Active: true
        }, { transaction });
      }

      await transaction.commit();

      return res.status(200).json({
        success: true,
        message: `${validPayloads.length} employees imported successfully.`
      });
    } catch (execError) {
      await transaction.rollback();
      throw execError;
    }

  } catch (error) {
    next(error);
  }
};
