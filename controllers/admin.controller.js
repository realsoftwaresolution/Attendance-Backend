const jwt = require("jsonwebtoken");
const { secret } = require("../config/jwt.config");
const db = require("../models"); // Import the model
const { hashPassword, comparePassword } = require("../utils/hash.util");
const { Op } = require("sequelize");
const upload = require('../middlewares/upload.middleware'); // Ensure you have the multer middleware
const fs = require('fs');
const path = require('path');
const moment = require('moment');  // Make sure to install moment.js or use any other library for date manipulation



// Admin Registration
exports.register = async (req, res) => {
  try {
    const { Username, Password, UserType, UserGrp, CompanyCode } = req.body;

    // Check for existing user
    const existingUser = await db.UserMst.findOne({
      where: { Username: { [Op.eq]: Username } },
    });
    if (existingUser) {
      return res.status(400).json({ message: "Username already exists" });
    }

    // Hash the password
    const hashedPassword = await hashPassword(Password);

    // Prepare the payload
    const newUser = {
      Username,
      Password: hashedPassword,
      UserType: UserType, // Default UserType
      UserGrp: UserGrp,      // Optional field
      Sflag: "I",                    // Default 'Y' flag
      SDate: new Date().toISOString(), // Current date as ISO string
      CompanyCode: CompanyCode || null,
      Active: true,                  // Default active user
      IsDelete: false,               // Default not deleted
    };

    // Create the user
    await db.UserMst.create(newUser);

    return res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    console.error("Registration Error:", err);
    return res.status(500).json({ error: "An error occurred during registration" });
  }
};

// Admin Login
exports.login = async (req, res) => {
  try {
    const { Username, Password } = req.body;

    // Check if the user exists
    const user = await db.UserMst.scope("withHash").findOne({
      where: { Username: { [Op.eq]: Username }, IsDelete: false, Active: true },
    });
    if (!user) {
      return res.status(404).json({ message: "User not found or inactive" });
    }

    // Validate password
    const isPasswordValid = await comparePassword(Password, user.Password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid password" });
    }

    // Generate JWT Token
    const tokenPayload = {
      UserMstId: user.UserMstId,
      Username: user.Username,
      UserType: user.UserType,
    };
    const token = jwt.sign(tokenPayload, secret, { expiresIn: "7d" });

    // Update token and timestamp in database
    user.Token = token;
    user.TokenCreatedDate = new Date().toISOString();
    await user.save();

    // Return the token
    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        UserMstId: user.UserMstId,
        Username: user.Username,
        UserType: user.UserType,
      },
    });
  } catch (err) {
    console.error("Login Error:", err);
    return res.status(500).json({ error: "An error occurred during login" });
  }
};

// Create Employee
exports.createEmployee = async (req, res) => {
  try {
    // Check if the logged-in user has the admin role
    if (req.user.UserType !== 'Admin') {
      return res.status(403).json({ error: 'You do not have permission to create an employee' });
    }

    // Destructure and validate the request body
    const {
      empFullName,
      empUsername,
      empPassword,
      empType,
      empBranch,
      empDepartment,
      empBankFullName,
      empDesignation,
      empFirm,
      empSalary,
      empPhoneNo,
      empBankName,
      empBankACNo,
      empBankIFSCode,
      empSalaryType,
      empCode,
      empPANNo,
      empESINo,
      empAddress,
      dateOfJoining,
      sDate,
      logId,
      pcId,
      ever,
      companyCode,
      sortId,
      empFaceData,
    } = req.body;


    const existingUser = await db.EmployeeMst.findOne({
      where: { EmpUsername: { [Op.eq]: empUsername } },
    });
    if (existingUser) {
      return res.status(400).json({ message: "Username already exists" });
    }

    // Ensure that all required fields are provided
    const requiredFields = [
      empFullName, empUsername, empPassword, empType, empBranch, empDepartment,
      empBankFullName, empDesignation, empFirm, empSalary, empPhoneNo, empBankName,
      empBankACNo, empBankIFSCode, empSalaryType, empCode, empPANNo, empESINo,
      empAddress, dateOfJoining, sDate, logId, pcId, ever, companyCode, sortId, empFaceData
    ];

    for (let field of requiredFields) {
      if (!field) {
        return res.status(400).json({ error: 'Missing required field' });
      }
    }

    // Hash the password before saving
    const hashedPassword = await hashPassword(empPassword);

    // Extract file paths from multer's response and serialize them as JSON strings
    // const imagePaths = req.files?.images ? JSON.stringify(req.files.images.map((file) => file.path)) : null;
    const documentPaths = req.files?.documents ? JSON.stringify(req.files.documents.map((file) => file.path)) : null;
    const faceData = JSON.stringify(empFaceData);
    // Check if username already exists
    // const existingUser = await db.EmployeeMst.findOne({ where: { EmpUsername: empUsername } });
    // if (existingUser) {
    //   return res.status(400).json({ message: "User already exists" });
    // }

    // Create the new employee
    const employee = await db.EmployeeMst.create({
      EmpFullName: empFullName,
      EmpUsername: empUsername,
      EmpPassword: hashedPassword,
      EmpType: empType,
      EmpBranch: empBranch,
      EmpDepartment: empDepartment,
      EmpBankFullName: empBankFullName,
      EmpDesignation: empDesignation,
      EmpFirm: empFirm,
      EmpSalary: empSalary,
      EmpPhoneNo: empPhoneNo,
      EmpBankName: empBankName,
      EmpBankACNo: empBankACNo,
      EmpBankIFSCode: empBankIFSCode,
      EmpSalaryType: empSalaryType,
      EmpCode: empCode,
      EmpPANNo: empPANNo,
      EmpESINo: empESINo,
      EmpAddress: empAddress,
      DateOfJoinng: dateOfJoining,
      EmpFaceData: faceData,
      DocumentPaths: documentPaths,
      EmpGrp: empDepartment,
      Sflag: 'I',
      SDate: sDate,
      LogID: logId,
      PcID: pcId,
      Ever: ever,
      CompanyCode: companyCode,
      SortId: sortId,
      Active: true,
      IsDelete: false,
    });

    // Respond with the created employee
    return res.status(201).json({
      message: 'Employee created successfully',
      employee,
    });
  } catch (err) {
    console.log('Error:', err);
    return res.status(500).json({ error: err.message });
  }
};

exports.updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if the logged-in user has the admin role
    if (req.user.UserType !== 'Admin') {
      return res.status(403).json({ error: 'You do not have permission to update an employee' });
    }

    // Check if the employee exists
    const employee = await db.EmployeeMst.findByPk(id);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Prepare the fields to update dynamically
    const fieldsToUpdate = {};
    const allowedFields = [
      'empFullName', 'empUsername', 'empType', 'empBranch', 'empDepartment',
      'empBankFullName', 'empDesignation', 'empFirm', 'empSalary', 'empPhoneNo',
      'empBankName', 'empBankACNo', 'empBankIFSCode', 'empSalaryType', 'empCode',
      'empPANNo', 'empESINo', 'empAddress', 'dateOfJoining', 'sDate', 'logId',
      'pcId', 'ever', 'companyCode', 'sortId', 'empFaceData'
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        // Special handling for certain fields like `empFaceData`
        fieldsToUpdate[field] =
          field === 'empFaceData' ? JSON.stringify(req.body[field]) : req.body[field];
      }
    }

    if (req.files?.documents) {
      // Parse existing DocumentPaths or initialize as an empty array
      const existingDocuments = employee.DocumentPaths
        ? JSON.parse(employee.DocumentPaths)
        : [];

      // Add new file paths to the existing paths
      const newDocuments = req.files.documents.map((file) => file.path);
      fieldsToUpdate.DocumentPaths = JSON.stringify([
        ...existingDocuments,
        ...newDocuments,
      ]);
    }

    // Map keys to database column names if necessary
    const dbFieldMapping = {
      empFullName: 'EmpFullName',
      empUsername: 'EmpUsername',
      empType: 'EmpType',
      empBranch: 'EmpBranch',
      empDepartment: 'EmpDepartment',
      empBankFullName: 'EmpBankFullName',
      empDesignation: 'EmpDesignation',
      empFirm: 'EmpFirm',
      empSalary: 'EmpSalary',
      empPhoneNo: 'EmpPhoneNo',
      empBankName: 'EmpBankName',
      empBankACNo: 'EmpBankACNo',
      empBankIFSCode: 'EmpBankIFSCode',
      empSalaryType: 'EmpSalaryType',
      empCode: 'EmpCode',
      empPANNo: 'EmpPANNo',
      empESINo: 'EmpESINo',
      empAddress: 'EmpAddress',
      dateOfJoining: 'DateOfJoinng',
      empFaceData: 'EmpFaceData',
      DocumentPaths: 'DocumentPaths',
      sDate: 'SDate',
      logId: 'LogID',
      pcId: 'PcID',
      ever: 'Ever',
      companyCode: 'CompanyCode',
      sortId: 'SortId',
    };

    const mappedFieldsToUpdate = {};
    for (const [key, value] of Object.entries(fieldsToUpdate)) {
      mappedFieldsToUpdate[dbFieldMapping[key] || key] = value;
    }

    // Add default fields
    mappedFieldsToUpdate.Active = true;
    mappedFieldsToUpdate.IsDelete = false;

    // Update the employee
    await employee.update(mappedFieldsToUpdate);

    return res.json({
      message: 'Employee updated successfully',
      employee,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};


exports.deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if the logged-in user has the admin role
    if (req.user.UserType !== 'Admin') {
      return res.status(403).json({ error: 'You do not have permission to delete an employee' });
    }

    // Check if the Employee exists
    const employee = await db.EmployeeMst.findByPk(id);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // Physically delete the Employee
    await employee.destroy();

    return res.json({
      message: 'Employee deleted successfully',
    });
  } catch (err) {
    console.log('Error:', err);
    return res.status(500).json({ error: err.message });
  }
};

exports.deleteUserDocuments = async (req, res) => {
  try {
    const { id } = req.params;
    const { documentPaths } = req.body;  // Array of document paths to delete

    // Check if the logged-in user has the admin role
    if (req.user.UserType !== 'Admin') {
      return res.status(403).json({ error: 'You do not have permission to delete documents' });
    }

    // Check if the employee exists
    const employee = await db.EmployeeMst.findByPk(id);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // Ensure documentPaths is provided
    if (!documentPaths || !Array.isArray(documentPaths) || documentPaths.length === 0) {
      return res.status(400).json({ error: "No document paths provided" });
    }

    // Parse DocumentPaths if it's a string (JSON)
    let currentDocumentPaths = [];
    try {
      currentDocumentPaths = JSON.parse(employee.DocumentPaths);  // Parse if it's a JSON string
    } catch (err) {
      currentDocumentPaths = employee.DocumentPaths || [];  // If parsing fails, just use it as is
    }

    // Loop through each document path to delete
    for (const documentPath of documentPaths) {
      const fullDocumentPath = path.join(__dirname, documentPath);
      if (fs.existsSync(fullDocumentPath)) {
        try {
          // Delete the document from the server
          fs.unlinkSync(fullDocumentPath);
          console.log(`Deleted document: ${documentPath}`);
        } catch (err) {
          console.error(`Error deleting document: ${documentPath}`, err);
        }
      }
    }

    // Filter out deleted document paths from the currentDocumentPaths array
    const updatedDocumentPaths = currentDocumentPaths.filter((docPath) => !documentPaths.includes(docPath));

    // Update the employee's DocumentPaths field in the database
    await employee.update({ DocumentPaths: JSON.stringify(updatedDocumentPaths) });

    return res.json({
      message: 'Documents deleted successfully',
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};



exports.addHoursCategory = async (req, res) => {
  try {
    if (req.user.UserType !== 'Admin') {
      return res.status(403).json({ error: 'You do not have permission to add a Hours Category' });
    }

    const {
      code,
      hours,
      sDate,
      logId,
      pcId,
      ever,
      companyCode,
      sortId,
    } = req.body;

    // Ensure that all required fields are provided
    const requiredFields = [
      code, hours, sDate, logId, pcId, ever, companyCode, sortId
    ];

    for (let field of requiredFields) {
      if (!field) {
        return res.status(400).json({ error: 'Missing required field' });
      }
    }

    const existingEntry = await db.HoursCategoryMst.findOne({ where: { Code: code } });
    if (existingEntry) {
      return res.status(400).json({ message: "Code already exists" });
    }

    const entry = await db.HoursCategoryMst.create({
      Code: code,
      Hours: hours,
      Sflag: 'I',
      SDate: sDate,
      LogID: logId,
      PcID: pcId,
      Ever: ever,
      CompanyCode: companyCode,
      SortId: sortId,
      Active: true,
      IsDelete: false,
    });

    return res.status(201).json({
      message: 'Hours Category added successfully',
      entry,
    });

  }
  catch (err) {
    console.log('Error:', err);
    return res.status(500).json({ error: err.message });
  }
};

exports.updateHoursCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if the logged-in user has the admin role
    if (req.user.UserType !== 'Admin') {
      return res.status(403).json({ error: 'You do not have permission to update a Hours Category' });
    }

    // Check if the Hours Category exists
    const category = await db.HoursCategoryMst.findByPk(id);
    if (!category) {
      return res.status(404).json({ error: "Hours Category not found" });
    }

    // Prepare the fields to update dynamically
    const fieldsToUpdate = {};
    const allowedFields = [
      'code', 'hours', 'sDate', 'logId', 'pcId', 'ever', 'companyCode', 'sortId'
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        fieldsToUpdate[field] = req.body[field];
      }
    }

    // Map request body keys to database column names
    const dbFieldMapping = {
      code: 'Code',
      hours: 'Hours',
      sDate: 'SDate',
      logId: 'LogID',
      pcId: 'PcID',
      ever: 'Ever',
      companyCode: 'CompanyCode',
      sortId: 'SortId',
    };

    const mappedFieldsToUpdate = {};
    for (const [key, value] of Object.entries(fieldsToUpdate)) {
      mappedFieldsToUpdate[dbFieldMapping[key] || key] = value;
    }

    // Add default fields
    mappedFieldsToUpdate.Sflag = 'U'; // Set Sflag to 'U'

    // Update the Hours Category
    await category.update(mappedFieldsToUpdate);

    return res.json({
      message: 'Hours Category updated successfully',
      category,
    });

  } catch (err) {
    console.log('Error:', err);
    return res.status(500).json({ error: err.message });
  }
};

exports.deleteHoursCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if the logged-in user has the admin role
    if (req.user.UserType !== 'Admin') {
      return res.status(403).json({ error: 'You do not have permission to delete an Hour Category' });
    }

    const entry = await db.HoursCategoryMst.findByPk(id);
    if (!entry) {
      return res.status(404).json({ error: "Hour Category not found" });
    }

    await entry.destroy();

    return res.json({
      message: 'Hour Category deleted successfully',
    });
  } catch (err) {
    console.log('Error:', err);
    return res.status(500).json({ error: err.message });
  }
};



exports.addHoliday = async (req, res) => {
  try {
    if (req.user.UserType !== 'Admin') {
      return res.status(403).json({ error: 'You do not have permission to add a Hours Category' });
    }

    const {
      date,
      holiday,
      sDate,
      logId,
      pcId,
      ever,
      companyCode,
      sortId,
    } = req.body;

    // Ensure that all required fields are provided
    const requiredFields = [
      date, holiday, sDate, logId, pcId, ever, companyCode, sortId
    ];

    for (let field of requiredFields) {
      if (!field) {
        return res.status(400).json({ error: 'Missing required field' });
      }
    }

    const existingEntry = await db.HolidayMst.findOne({ where: { Holiday: holiday } });
    if (existingEntry) {
      return res.status(400).json({ message: "Holiday already exists" });
    }

    const entry = await db.HolidayMst.create({
      Date: date,
      Holiday: holiday,
      Sflag: 'I',
      SDate: sDate,
      LogID: logId,
      PcID: pcId,
      Ever: ever,
      CompanyCode: companyCode,
      SortId: sortId,
      Active: true,
      IsDelete: false,
    });

    return res.status(201).json({
      message: 'Holiday added successfully',
      entry,
    });

  }
  catch (err) {
    console.log('Error:', err);
    return res.status(500).json({ error: err.message });
  }
};

exports.updateHoliday = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if the logged-in user has the admin role
    if (req.user.UserType !== 'Admin') {
      return res.status(403).json({ error: 'You do not have permission to update a Holiday' });
    }

    // Check if the Holiday entry exists
    const holidayEntry = await db.HolidayMst.findByPk(id);
    if (!holidayEntry) {
      return res.status(404).json({ error: "Holiday not found" });
    }

    // Prepare the fields to update dynamically
    const fieldsToUpdate = {};
    const allowedFields = [
      'date', 'holiday', 'sDate', 'logId', 'pcId', 'ever', 'companyCode', 'sortId'
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        fieldsToUpdate[field] = req.body[field];
      }
    }

    // Map request body keys to database column names
    const dbFieldMapping = {
      date: 'Date',
      holiday: 'Holiday',
      sDate: 'SDate',
      logId: 'LogID',
      pcId: 'PcID',
      ever: 'Ever',
      companyCode: 'CompanyCode',
      sortId: 'SortId',
    };

    const mappedFieldsToUpdate = {};
    for (const [key, value] of Object.entries(fieldsToUpdate)) {
      mappedFieldsToUpdate[dbFieldMapping[key] || key] = value;
    }

    // Add default fields
    mappedFieldsToUpdate.Sflag = 'U';

    // Update the Holiday entry
    await holidayEntry.update(mappedFieldsToUpdate);

    return res.json({
      message: 'Holiday updated successfully',
      holiday: holidayEntry,
    });

  } catch (err) {
    console.log('Error:', err);
    return res.status(500).json({ error: err.message });
  }
};

exports.deleteHoliday = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if the logged-in user has the admin role
    if (req.user.UserType !== 'Admin') {
      return res.status(403).json({ error: 'You do not have permission to delete Holiday' });
    }

    const entry = await db.HolidayMst.findByPk(id);
    if (!entry) {
      return res.status(404).json({ error: "Holiday not found" });
    }

    await entry.destroy();

    return res.json({
      message: 'Holiday deleted successfully',
    });
  } catch (err) {
    console.log('Error:', err);
    return res.status(500).json({ error: err.message });
  }
};


exports.addDepartment = async (req, res) => {
  try {
    if (req.user.UserType !== 'Admin') {
      return res.status(403).json({ error: 'You do not have permission to add a Hours Category' });
    }

    const {
      code,
      department,
      monthHours,
      sDate,
      logId,
      pcId,
      ever,
      companyCode,
      sortId,
    } = req.body;

    // Ensure that all required fields are provided
    const requiredFields = [
      code, department, monthHours, sDate, logId, pcId, ever, companyCode, sortId
    ];

    for (let field of requiredFields) {
      if (!field) {
        return res.status(400).json({ error: 'Missing required field' });
      }
    }

    const existingEntry = await db.DepartmentMst.findOne({ where: { Department: department } });
    if (existingEntry) {
      return res.status(400).json({ message: "Department already exists" });
    }

    const entry = await db.DepartmentMst.create({
      Code: code,
      Department: department,
      MonthHours: monthHours,
      Sflag: 'I',
      SDate: sDate,
      LogID: logId,
      PcID: pcId,
      Ever: ever,
      CompanyCode: companyCode,
      SortId: sortId,
      Active: true,
      IsDelete: false,
    });

    return res.status(201).json({
      message: 'Department added successfully',
      entry,
    });

  }
  catch (err) {
    console.log('Error:', err);
    return res.status(500).json({ error: err.message });
  }
};


exports.updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if the logged-in user has the admin role
    if (req.user.UserType !== 'Admin') {
      return res.status(403).json({ error: 'You do not have permission to update a Department' });
    }

    // Check if the Department entry exists
    const departmentEntry = await db.DepartmentMst.findByPk(id);
    if (!departmentEntry) {
      return res.status(404).json({ error: "Department not found" });
    }

    // Prepare the fields to update dynamically
    const fieldsToUpdate = {};
    const allowedFields = [
      'code', 'department', 'monthHours', 'sDate', 'logId', 'pcId', 'ever', 'companyCode', 'sortId'
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        fieldsToUpdate[field] = req.body[field];
      }
    }

    // Map request body keys to database column names
    const dbFieldMapping = {
      code: 'Code',
      department: 'Department',
      monthHours: 'MonthHours',
      sDate: 'SDate',
      logId: 'LogID',
      pcId: 'PcID',
      ever: 'Ever',
      companyCode: 'CompanyCode',
      sortId: 'SortId',
    };

    const mappedFieldsToUpdate = {};
    for (const [key, value] of Object.entries(fieldsToUpdate)) {
      mappedFieldsToUpdate[dbFieldMapping[key] || key] = value;
    }

    // Add default fields
    mappedFieldsToUpdate.Sflag = 'U';

    // Update the Department entry
    await departmentEntry.update(mappedFieldsToUpdate);

    return res.json({
      message: 'Department updated successfully',
      department: departmentEntry,
    });

  } catch (err) {
    console.log('Error:', err);
    return res.status(500).json({ error: err.message });
  }
};

exports.deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if the logged-in user has the admin role
    if (req.user.UserType !== 'Admin') {
      return res.status(403).json({ error: 'You do not have permission to delete Department' });
    }

    const entry = await db.DepartmentMst.findByPk(id);
    if (!entry) {
      return res.status(404).json({ error: "Department not found" });
    }

    await entry.destroy();

    return res.json({
      message: 'Department deleted successfully',
    });
  } catch (err) {
    console.log('Error:', err);
    return res.status(500).json({ error: err.message });
  }
};


exports.addDesignation = async (req, res) => {
  try {
    if (req.user.UserType !== 'Admin') {
      return res.status(403).json({ error: 'You do not have permission to add a Hours Category' });
    }

    const {
      code,
      designation,
      sDate,
      logId,
      pcId,
      ever,
      companyCode,
      sortId,
    } = req.body;

    // Ensure that all required fields are provided
    const requiredFields = [
      code, designation, sDate, logId, pcId, ever, companyCode, sortId
    ];

    for (let field of requiredFields) {
      if (!field) {
        return res.status(400).json({ error: 'Missing required field' });
      }
    }

    const existingEntry = await db.DesignationMst.findOne({ where: { Designation: designation } });
    if (existingEntry) {
      return res.status(400).json({ message: "Designation already exists" });
    }

    const entry = await db.DesignationMst.create({
      Code: code,
      Designation: designation,
      Sflag: 'I',
      SDate: sDate,
      LogID: logId,
      PcID: pcId,
      Ever: ever,
      CompanyCode: companyCode,
      SortId: sortId,
      Active: true,
      IsDelete: false,
    });

    return res.status(201).json({
      message: 'Designation added successfully',
      entry,
    });

  }
  catch (err) {
    console.log('Error:', err);
    return res.status(500).json({ error: err.message });
  }
};


exports.updateDesignation = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if the logged-in user has the admin role
    if (req.user.UserType !== 'Admin') {
      return res.status(403).json({ error: 'You do not have permission to update a Designation' });
    }

    // Check if the Designation entry exists
    const designationEntry = await db.DesignationMst.findByPk(id);
    if (!designationEntry) {
      return res.status(404).json({ error: "Designation not found" });
    }

    // Prepare the fields to update dynamically
    const fieldsToUpdate = {};
    const allowedFields = [
      'code', 'designation', 'sDate', 'logId', 'pcId', 'ever', 'companyCode', 'sortId'
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        fieldsToUpdate[field] = req.body[field];
      }
    }

    // Map request body keys to database column names
    const dbFieldMapping = {
      code: 'Code',
      designation: 'Designation',
      sDate: 'SDate',
      logId: 'LogID',
      pcId: 'PcID',
      ever: 'Ever',
      companyCode: 'CompanyCode',
      sortId: 'SortId',
    };

    const mappedFieldsToUpdate = {};
    for (const [key, value] of Object.entries(fieldsToUpdate)) {
      mappedFieldsToUpdate[dbFieldMapping[key] || key] = value;
    }

    // Add default fields
    mappedFieldsToUpdate.Sflag = 'U';

    // Update the Designation entry
    await designationEntry.update(mappedFieldsToUpdate);

    return res.json({
      message: 'Designation updated successfully',
      designation: designationEntry,
    });

  } catch (err) {
    console.log('Error:', err);
    return res.status(500).json({ error: err.message });
  }
};


exports.deleteDesignation = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if the logged-in user has the admin role
    if (req.user.UserType !== 'Admin') {
      return res.status(403).json({ error: 'You do not have permission to delete Designation' });
    }

    const entry = await db.DesignationMst.findByPk(id);
    if (!entry) {
      return res.status(404).json({ error: "Designation not found" });
    }

    await entry.destroy();

    return res.json({
      message: 'Designation deleted successfully',
    });
  } catch (err) {
    console.log('Error:', err);
    return res.status(500).json({ error: err.message });
  }
};


exports.addFirm = async (req, res) => {
  try {
    if (req.user.UserType !== 'Admin') {
      return res.status(403).json({ error: 'You do not have permission to add a Hours Category' });
    }

    const {
      code,
      firmName,
      ownerName,
      partnerName,
      designation,
      corporateCode,
      address,
      panNo,
      tanNo,
      sDate,
      logId,
      pcId,
      ever,
      companyCode,
      sortId,
    } = req.body;

    // Ensure that all required fields are provided
    const requiredFields = [
      code, firmName, ownerName, partnerName, corporateCode, address, panNo, tanNo, designation, sDate, logId, pcId, ever, companyCode, sortId
    ];

    for (let field of requiredFields) {
      if (!field) {
        return res.status(400).json({ error: 'Missing required field' });
      }
    }

    const existingEntry = await db.FirmMst.findOne({ where: { FirmName: firmName } });
    if (existingEntry) {
      return res.status(400).json({ message: "Firm already exists" });
    }

    const entry = await db.FirmMst.create({
      Code: code,
      FirmName: firmName,
      OwnerName: ownerName,
      PartnerName: partnerName,
      CorporateCode: corporateCode,
      Address: address,
      PANNo: panNo,
      TANNo: tanNo,
      Designation: designation,
      Sflag: 'I',
      SDate: sDate,
      LogID: logId,
      PcID: pcId,
      Ever: ever,
      CompanyCode: companyCode,
      SortId: sortId,
      Active: true,
      IsDelete: false,
    });

    return res.status(201).json({
      message: 'Firm added successfully',
      entry,
    });

  }
  catch (err) {
    console.log('Error:', err);
    return res.status(500).json({ error: err.message });
  }
};

exports.updateFirm = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if the logged-in user has the admin role
    if (req.user.UserType !== 'Admin') {
      return res.status(403).json({ error: 'You do not have permission to update a Firm' });
    }

    // Check if the Firm entry exists
    const firmEntry = await db.FirmMst.findByPk(id);
    if (!firmEntry) {
      return res.status(404).json({ error: "Firm not found" });
    }

    // Prepare the fields to update dynamically
    const fieldsToUpdate = {};
    const allowedFields = [
      'code', 'firmName', 'ownerName', 'partnerName', 'corporateCode',
      'address', 'panNo', 'tanNo', 'designation', 'sDate',
      'logId', 'pcId', 'ever', 'companyCode', 'sortId'
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        fieldsToUpdate[field] = req.body[field];
      }
    }

    // Map request body keys to database column names
    const dbFieldMapping = {
      code: 'Code',
      firmName: 'FirmName',
      ownerName: 'OwnerName',
      partnerName: 'PartnerName',
      corporateCode: 'CorporateCode',
      address: 'Address',
      panNo: 'PANNo',
      tanNo: 'TANNo',
      designation: 'Designation',
      sDate: 'SDate',
      logId: 'LogID',
      pcId: 'PcID',
      ever: 'Ever',
      companyCode: 'CompanyCode',
      sortId: 'SortId',
    };

    const mappedFieldsToUpdate = {};
    for (const [key, value] of Object.entries(fieldsToUpdate)) {
      mappedFieldsToUpdate[dbFieldMapping[key] || key] = value;
    }

    // Add default fields
    mappedFieldsToUpdate.Sflag = 'U';

    // Update the Firm entry
    await firmEntry.update(mappedFieldsToUpdate);

    return res.json({
      message: 'Firm updated successfully',
      firm: firmEntry,
    });

  } catch (err) {
    console.log('Error:', err);
    return res.status(500).json({ error: err.message });
  }
};

exports.deleteFirm = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if the logged-in user has the admin role
    if (req.user.UserType !== 'Admin') {
      return res.status(403).json({ error: 'You do not have permission to delete Firm' });
    }

    const entry = await db.FirmMst.findByPk(id);
    if (!entry) {
      return res.status(404).json({ error: "Firm not found" });
    }

    await entry.destroy();

    return res.json({
      message: 'Firm deleted successfully',
    });
  } catch (err) {
    console.log('Error:', err);
    return res.status(500).json({ error: err.message });
  }
};


// exports.getAllEmployees = async (req, res) => {
//   try {
//     // Check if the logged-in user has the admin role
//     if (req.user.UserType !== 'Admin') {
//       return res.status(403).json({ error: 'You do not have permission to view employees' });
//     }

//     // Fetch all employees from the database
//     const employees = await db.EmployeeMst.findAll({
//       where: {
//         IsDelete: false, // Only fetch employees that are not marked as deleted
//       },
//       attributes: [
//         'EmpMstId', 'EmpFullName', 'EmpUsername', 'EmpType', 'EmpBranch', 'EmpDepartment', 'EmpFirm', 'EmpDesignation',
//         'EmpSalary', 'EmpPhoneNo', 'EmpBankName', 'EmpBankACNo', 'EmpBankIFSCode',
//         'EmpSalaryType', 'EmpCode', 'EmpPANNo', 'EmpESINo', 'EmpAddress', 'DateOfJoinng',
//         'DocumentPaths', 'EmpGrp', 'Sflag', 'SDate', 'LogID', 'PcID', 'Ever',
//         'CompanyCode', 'SortId', 'Active',
//       ]
//     });

//     // Check if no employees found
//     // if (employees.length === 0) {
//     //   return res.status(404).json({ message: 'No employees found' });
//     // }

//     // Respond with the list of employees
//     return res.status(200).json({
//       message: 'Employees fetched successfully.',
//       employees,
//     });
//   } catch (err) {
//     console.log('Error:', err);
//     return res.status(500).json({ error: err.message });
//   }
// };

exports.getAllEmployees = async (req, res) => {
  try {
    // Check if the logged-in user has the admin role
    if (req.user.UserType !== 'Admin') {
      return res.status(403).json({ error: 'You do not have permission to view employees' });
    }

    // Define your base URL for file storage (adjust as needed for your setup)
    const baseUrl = process.env.BASE_URL || 'http://50.62.183.116';

    // Fetch all employees from the database
    const employees = await db.EmployeeMst.findAll({
      where: {
        IsDelete: false, // Only fetch employees that are not marked as deleted
      },
      attributes: [
        'EmpMstId', 'EmpFullName', 'EmpUsername', 'EmpType', 'EmpBranch', 'EmpDepartment', 'EmpFirm', 'EmpDesignation',
        'EmpSalary', 'EmpPhoneNo', 'EmpBankName', 'EmpBankFullName', 'EmpBankACNo', 'EmpBankIFSCode',
        'EmpSalaryType', 'EmpCode', 'EmpPANNo', 'EmpESINo', 'EmpAddress', 'DateOfJoinng',
        'DocumentPaths', 'EmpGrp', 'Sflag', 'SDate', 'LogID', 'PcID', 'Ever',
        'CompanyCode', 'SortId', 'Active',
      ]
    });

    // Map employees to include cleaned and formatted DocumentPaths
    const updatedEmployees = employees.map(employee => {
      let cleanedPaths = [];

      if (employee.DocumentPaths) {
        try {
          // Attempt to parse and clean the paths
          const parsedPaths = JSON.parse(employee.DocumentPaths);
          if (Array.isArray(parsedPaths)) {
            cleanedPaths = parsedPaths.map(path => `${baseUrl}/${path.replace(/\\/g, '/')}`);
          }
        } catch (err) {
          console.warn(`Error parsing DocumentPaths for employee ID ${employee.EmpMstId}:`, err);
        }
      }

      return {
        ...employee.toJSON(),
        DocumentPaths: cleanedPaths,
      };
    });

    // Respond with the list of employees
    return res.status(200).json({
      message: 'Employees fetched successfully.',
      employees: updatedEmployees,
    });
  } catch (err) {
    console.log('Error:', err);
    return res.status(500).json({ error: err.message });
  }
};



exports.getAllFaceEmployees = async (req, res) => {
  try {
    // Check if the logged-in user has the admin role
    if (req.user.UserType !== 'Admin') {
      return res.status(403).json({ error: 'You do not have permission to view face employees' });
    }

    // Fetch all employees from the database
    const employees = await db.EmployeeMst.findAll({
      where: {
        IsDelete: false, // Only fetch employees that are not marked as deleted
      },
      attributes: [
        'EmpMstId', 'EmpUsername', 'EmpFaceData'
      ]
    });

    // Check if no employees found
    // if (employees.length === 0) {
    //   return res.status(404).json({ message: 'No employees found' });
    // }

    // Respond with the list of employees
    return res.status(200).json({
      message: 'Employees Face fetched successfully',
      employees,
    });
  } catch (err) {
    console.log('Error:', err);
    return res.status(500).json({ error: err.message });
  }
};

exports.getAllHoursCategory = async (req, res) => {
  try {
    // Check if the logged-in user has the admin role
    if (req.user.UserType !== 'Admin') {
      return res.status(403).json({ error: 'You do not have permission to view Hour Category' });
    }

    // Fetch all employees from the database
    const entry = await db.HoursCategoryMst.findAll({
      where: {
        IsDelete: false, // Only fetch entry that are not marked as deleted
      }
    });
    return res.status(200).json({
      message: 'Hours Category fetched successfully',
      entry,
    });
  } catch (err) {
    console.log('Error:', err);
    return res.status(500).json({ error: err.message });
  }
};

exports.getAllHoliday = async (req, res) => {
  try {
    // Check if the logged-in user has the admin role
    if (req.user.UserType !== 'Admin') {
      return res.status(403).json({ error: 'You do not have permission to view Holiday' });
    }

    // Fetch all employees from the database
    const entry = await db.HolidayMst.findAll({
      where: {
        IsDelete: false, // Only fetch entry that are not marked as deleted
      }
    });
    return res.status(200).json({
      message: 'Holiday fetched successfully',
      entry,
    });
  } catch (err) {
    console.log('Error:', err);
    return res.status(500).json({ error: err.message });
  }
};


exports.getAllDesignation = async (req, res) => {
  try {
    // Check if the logged-in user has the admin role
    if (req.user.UserType !== 'Admin') {
      return res.status(403).json({ error: 'You do not have permission to view Designation' });
    }

    // Fetch all employees from the database
    const entry = await db.DesignationMst.findAll({
      where: {
        IsDelete: false, // Only fetch entry that are not marked as deleted
      }
    });
    return res.status(200).json({
      message: 'Designation fetched successfully',
      entry,
    });
  } catch (err) {
    console.log('Error:', err);
    return res.status(500).json({ error: err.message });
  }
};


exports.getAllDepartment = async (req, res) => {
  try {
    // Check if the logged-in user has the admin role
    if (req.user.UserType !== 'Admin') {
      return res.status(403).json({ error: 'You do not have permission to view Department' });
    }

    // Fetch all employees from the database
    const entry = await db.DepartmentMst.findAll({
      where: {
        IsDelete: false, // Only fetch entry that are not marked as deleted
      }
    });
    return res.status(200).json({
      message: 'Department fetched successfully',
      entry,
    });
  } catch (err) {
    console.log('Error:', err);
    return res.status(500).json({ error: err.message });
  }
};


exports.getAllFirm = async (req, res) => {
  try {
    // Check if the logged-in user has the admin role
    if (req.user.UserType !== 'Admin') {
      return res.status(403).json({ error: 'You do not have permission to view Firm' });
    }

    // Fetch all employees from the database
    const entry = await db.FirmMst.findAll({
      where: {
        IsDelete: false, // Only fetch entry that are not marked as deleted
      }
    });
    return res.status(200).json({
      message: 'Firm fetched successfully',
      entry,
    });
  } catch (err) {
    console.log('Error:', err);
    return res.status(500).json({ error: err.message });
  }
};


exports.getAllShiftEntry = async (req, res) => {
  try {
    // Check if the logged-in user has the admin role
    if (req.user.UserType !== 'Admin') {
      return res.status(403).json({ error: 'You do not have permission to view Shift Entry' });
    }

    // Fetch all employees from the database
    const entry = await db.ShiftEntryMst.findAll({
      where: {
        IsDelete: false, // Only fetch entry that are not marked as deleted
      }
    });
    return res.status(200).json({
      message: 'Shift fetched successfully',
      entry,
    });
  } catch (err) {
    console.log('Error:', err);
    return res.status(500).json({ error: err.message });
  }
};

exports.addShiftEntry = async (req, res) => {
  try {
    if (req.user.UserType !== 'Admin') {
      return res.status(403).json({ error: 'You do not have permission to add a Shift Entry' });
    }

    const {
      shiftDate, department, mIn, mOut, motIn, motOut, eotIn, eotOut, halfIn, halfOut,
      late, lunchIn, lunchOut, sDate, logId, pcId, ever, companyCode, sortId
    } = req.body;

    // Ensure all required fields are provided
    const requiredFields = [shiftDate, department, mIn, mOut, halfIn, halfOut, late, lunchIn, lunchOut, sDate, logId, pcId, ever, companyCode, sortId];
    if (requiredFields.some(field => !field)) {
      return res.status(400).json({ error: 'Missing required field' });
    }

    // Convert shiftDate to YYYY-MM-DD format for proper date handling
    const startDate = moment(shiftDate, 'DD-MM-YYYY').format('YYYY-MM-DD');

    // Find existing shift entries for the department
    const existingEntries = await db.ShiftEntryMst.findAll({ where: { Department: department } });

    if (existingEntries.length > 0) {
      // Preserve entries before shiftDate
      const preservedEntries = existingEntries.filter(entry =>
        moment(entry.ShiftDate).isBefore(moment(startDate))
      );

      const startDateOnly = new Date(startDate);
      startDateOnly.setHours(0, 0, 0, 0); // Reset to midnight


      // Step 1: Delete existing entries from shiftDate onward
      await db.ShiftEntryMst.destroy({
        where: {
          Department: department,
          ShiftDate: {
            [Op.gte]: startDateOnly // Proper date comparison
          }
        }
      });

      // Step 2: Recreate shift entries from shiftDate onward
      let currentDate = moment(startDate);
      const endDate = moment(startDate).endOf('year');

      while (currentDate.isSameOrBefore(endDate)) {
        await db.ShiftEntryMst.create({
          ShiftDate: currentDate.format('YYYY-MM-DD'),
          Department: department,
          MIn: mIn, MOut: mOut, MOTIn: motIn, MOTOut: motOut, EOTIn: eotIn,
          EOTOut: eotOut, HalfIn: halfIn, HalfOut: halfOut, Late: late,
          LunchIn: lunchIn, LunchOut: lunchOut, Sflag: 'I', SDate: sDate,
          LogID: logId, PcID: pcId, Ever: ever, CompanyCode: companyCode,
          SortId: sortId, Active: true, IsDelete: false,
          AutoGenerated: !currentDate.isSame(moment(startDate), 'day')
        });

        currentDate.add(1, 'days');
      }
    } else {
      // No existing entries, create a new set
      let currentDate = moment(startDate);
      const endDate = moment(startDate).endOf('year');

      while (currentDate.isSameOrBefore(endDate)) {
        await db.ShiftEntryMst.create({
          ShiftDate: currentDate.format('YYYY-MM-DD'),
          Department: department,
          MIn: mIn, MOut: mOut, MOTIn: motIn, MOTOut: motOut, EOTIn: eotIn,
          EOTOut: eotOut, HalfIn: halfIn, HalfOut: halfOut, Late: late,
          LunchIn: lunchIn, LunchOut: lunchOut, Sflag: 'I', SDate: sDate,
          LogID: logId, PcID: pcId, Ever: ever, CompanyCode: companyCode,
          SortId: sortId, Active: true, IsDelete: false,
          AutoGenerated: !currentDate.isSame(moment(startDate), 'day')
        });

        currentDate.add(1, 'days');
      }
    }

    return res.status(201).json({ message: 'Shift entries added successfully' });

  } catch (err) {
    console.error('Error:', err);
    return res.status(500).json({ error: err.message });
  }
};

exports.deleteShiftEntry = async (req, res) => {
  try {
    const { department } = req.params;

    // Check if the logged-in user has the admin role
    if (req.user.UserType !== 'Admin') {
      return res.status(403).json({ error: 'You do not have permission to delete Shift Entry' });
    }




    const entry = await db.ShiftEntryMst.findAll({ where: { Department: department } });
    console.log(entry);
    if (!entry || entry.length === 0) {
      return res.status(404).json({ error: "Shift Entry not found." });
    }

    await db.ShiftEntryMst.destroy({ where: { Department: department } });

    return res.json({
      message: 'Shift Entry deleted successfully',
    });
  } catch (err) {
    console.log('Error:', err);
    return res.status(500).json({ error: err.message });
  }
};

exports.addAttendance = async (req, res) => {
  try {
    // Check for admin permissions
    if (req.user.UserType !== 'Admin') {
      return res.status(403).json({ error: 'You do not have permission to add attendance records' });
    }

    const {
      empId,
      department,
      shift,
      inTime,
      outTime,
      isPresent,
      isHalfDay,
      date,
      overtime,
      onLeave,
      totalHours,
      sDate,
      logId,
      pcId,
      ever,
      companyCode,
      sortId
    } = req.body;

    // Ensure all required fields are provided
    const requiredFields = [empId, department, shift, date];

    for (let field of requiredFields) {
      if (!field) {
        return res.status(400).json({ error: 'Missing required field' });
      }
    }

    // Create a new attendance entry


    const currentDate = moment(date, 'DD-MM-YYYY').format('YYYY-MM-DD');



    const entry = await db.AttendanceMst.create({
      EmpId: empId,
      Department: department,
      Shift: shift,
      InTime: inTime,
      OutTime: outTime,
      IsPresent: isPresent,
      IsHalfDay: isHalfDay,
      Date: currentDate,
      Overtime: overtime,
      onLeave: onLeave,
      TotalHours: totalHours,
      Sflag: 'I',
      SDate: sDate,
      LogID: logId,
      PcID: pcId,
      Ever: ever,
      CompanyCode: companyCode,
      SortId: sortId,
      Active: true,
      IsDelete: false,
    });

    return res.status(201).json({
      message: 'Attendance added successfully',
      entry,
    });

  } catch (err) {
    console.error('Error:', err);
    return res.status(500).json({ error: err.message });
  }
};

exports.updateAttendance = async (req, res) => {
  try {
    // Check if the logged-in user has admin permissions
    if (req.user.UserType !== 'Admin') {
      return res.status(403).json({ error: 'You do not have permission to update attendance records' });
    }

    const { id } = req.params; // Assuming attendanceId is passed as a route parameter
    const {
      inTime,
      outTime
    } = req.body;

    // Ensure the attendance record exists
    const attendance = await db.AttendanceMst.findByPk(id);
    if (!attendance) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }


    // Update the attendance record
    await attendance.update({
      EmpId: attendance.EmpId,
      Department: attendance.Department,
      Shift: attendance.Shift,
      InTime: inTime ?? attendance.InTime,
      OutTime: outTime ?? attendance.OutTime,
      IsPresent: attendance.IsPresent,
      IsHalfDay: attendance.IsHalfDay,
      Date: attendance.Date,
      Overtime: attendance.Overtime,
      OnLeave: attendance.OnLeave,
      TotalHours: attendance.TotalHours,
      Sflag: 'U', // Marking as updated
      SDate: attendance.SDate,
      LogID: attendance.LogID,
      PcID: attendance.PcID,
      Ever: attendance.Ever,
      CompanyCode: attendance.CompanyCode,
      SortId: attendance.SortId,
    });

    return res.status(200).json({
      message: 'Attendance updated successfully',
      attendance,
    });

  } catch (err) {
    console.error('Error:', err);
    return res.status(500).json({ error: err.message });
  }
};



exports.getAllAttendance = async (req, res) => {
  try {
    // Check if the logged-in user has the admin role
    if (req.user.UserType !== 'Admin') {
      return res.status(403).json({ error: 'You do not have permission to view Attendance' });
    }

    // Fetch all employees from the database
    const entry = await db.AttendanceMst.findAll({
      where: {
        IsDelete: false, // Only fetch entry that are not marked as deleted
      }
    });
    return res.status(200).json({
      message: 'Attendance fetched successfully',
      entry,
    });
  } catch (err) {
    console.log('Error:', err);
    return res.status(500).json({ error: err.message });
  }
};

exports.deleteAttendance = async (req, res) => {
  try {
    const { empId, date } = req.body; // Expecting `empId` and `date` from the request body

    // Check if the logged-in user has the admin role
    if (req.user.UserType !== 'Admin') {
      return res.status(403).json({ error: 'You do not have permission to delete attendance' });
    }


    const currentDate = moment(date, 'DD-MM-YYYY').format('YYYY-MM-DD');

    // Find and delete all attendance records that match the empId and date
    const entries = await db.AttendanceMst.destroy({
      where: {
        EmpId: empId,
        Date: currentDate
      }
    });

    if (entries === 0) {
      return res.status(404).json({ error: "No attendance records found for the given employee and date" });
    }

    return res.json({
      message: `${entries} attendance record(s) deleted successfully`,
    });
  } catch (err) {
    console.log('Error:', err);
    return res.status(500).json({ error: err.message });
  }
};


exports.getAllMasterSetting = async (req, res) => {
  try {
    // Check if the logged-in user has the admin role
    if (req.user.UserType !== 'Admin') {
      return res.status(403).json({ error: 'You do not have permission to view Master Setting' });
    }

    // Fetch all employees from the database
    const entry = await db.MasterSettingMst.findAll({
      where: {
        IsDelete: false, // Only fetch entry that are not marked as deleted
      }
    });
    return res.status(200).json({
      message: 'Master Setting fetched successfully',
      entry,
    });
  } catch (err) {
    console.log('Error:', err);
    return res.status(500).json({ error: err.message });
  }
};

exports.addMasterSetting = async (req, res) => {
  try {
    if (req.user.UserType !== 'Admin') {
      return res.status(403).json({ error: 'You do not have permission to add a Hours Category' });
    }

    const {
      depCode,
      holiday,
      halfday,
      late,
      salaryOnCalenderDay,
      salaryOnCalenderDayNotSunday,
      salaryOnWorkingDay,
      workingDay,
      sundayInOT,
      sundayInWorking,
      sundayInAbsent,
      applySBeforeAbsent,
      applySAfterAbsent,
      applySBothAbsent,
      ot,
      hourCategoryCode,
      onDay,
      onHours,
      perPc,
      allowLunchBreak,
      sDate,
      logId,
      pcId,
      ever,
      companyCode,
      sortId,
    } = req.body;

    // Ensure that all required fields are provided
    // const requiredFields = [
    //   depCode,
    //   holiday,
    //   halfday,
    //   late,
    //   salaryOnCalenderDay,
    //   salaryOnCalenderDayNotSunday,
    //   salaryOnWorkingDay,
    //   workingDay,
    //   sundayInOT,
    //   sundayInWorking,
    //   sundayInAbsent,
    //   applySBeforeAbsent,
    //   applySAfterAbsent,
    //   applySBothAbsent,
    //   ot,
    //   hourCategoryCode,
    //   onDay,
    //   onHours,
    //   perPc,
    //   allowLunchBreak,
    //   sDate,
    //   logId,
    //   pcId,
    //   ever,
    //   companyCode,
    //   sortId,
    // ];

    // for (let field of requiredFields) {
    //   if (!field) {
    //     return res.status(400).json({ error: 'Missing required field' });
    //   }
    // }

    const existingEntry = await db.MasterSettingMst.findOne({ where: { DepCode: depCode } });
    if (existingEntry) {
      await db.MasterSettingMst.destroy({ where: { DepCode: depCode } });
    }

    const entry = await db.MasterSettingMst.create({
      DepCode: depCode,
      Holiday: holiday,
      HalfDay: halfday,
      Late: late,
      SalaryOnCalenderDay: salaryOnCalenderDay,
      SalaryOnCalenderDayNotSunday: salaryOnCalenderDayNotSunday,
      SalaryOnWorkingDay: salaryOnWorkingDay,
      WorkingDay: workingDay,
      SundayInOT: sundayInOT,
      SundayInWorking: sundayInWorking,
      SundayInAbsent: sundayInAbsent,
      ApplySBeforeAbsent: applySBeforeAbsent,
      ApplySAfterAbsent: applySAfterAbsent,
      ApplySBothAbsent: applySBothAbsent,
      O_T: ot,
      HourCategoryCode: hourCategoryCode,
      OnDay: onDay,
      OnHours: onHours,
      PerPc: perPc,
      AllowLunchBreak: allowLunchBreak,
      Sflag: 'I',
      SDate: sDate,
      LogID: logId,
      PcID: pcId,
      Ever: ever,
      CompanyCode: companyCode,
      SortId: sortId,
      Active: true,
      IsDelete: false,
    });

    return res.status(201).json({
      message: 'Master Setting added successfully',
      entry,
    });

  }
  catch (err) {
    console.log('Error:', err);
    return res.status(500).json({ error: err.message });
  }
};


exports.deleteMasterSetting = async (req, res) => {
  try {
    const { depCode } = req.params;

    // Check if the logged-in user has the admin role
    if (req.user.UserType !== 'Admin') {
      return res.status(403).json({ error: 'You do not have permission to delete Master Setting' });
    }

    const entry = await db.MasterSettingMst.findAll({ where: { DepCode: depCode } });
    console.log(entry);
    if (!entry || entry.length === 0) {
      return res.status(404).json({ error: "Master Setting Entry not found." });
    }

    await db.MasterSettingMst.destroy({ where: {DepCode: depCode } });

    return res.json({
      message: 'Master Setting deleted successfully',
    });
  } catch (err) {
    console.log('Error:', err);
    return res.status(500).json({ error: err.message });
  }
};