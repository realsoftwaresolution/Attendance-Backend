const jwt = require("jsonwebtoken");
const { secret } = require("../config/jwt.config");
const  db = require("../models"); // Import the model
const { hashPassword, comparePassword } = require("../utils/hash.util");
const { Op } = require("sequelize");
const upload = require('../middlewares/upload.middleware'); // Ensure you have the multer middleware

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

exports.addHoursCategory = async (req, res) => {
  try {
    // Check if the logged-in user has the admin role
    console.log('Started:');
    if (req.user.UserType !== 'Admin') {
      return res.status(403).json({ error: 'You do not have permission to add a Hours Category' });
    }
    console.log('Validated Admin User:');
    // Destructure and validate the request body
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

    console.log('Validated Params:');


    // Hash the password before saving
    // const hashedPassword = await hashPassword(empPassword);

    // Extract file paths from multer's response and serialize them as JSON strings
    // const imagePaths = req.files?.images ? JSON.stringify(req.files.images.map((file) => file.path)) : null;
    // const documentPaths = req.files?.documents ? JSON.stringify(req.files.documents.map((file) => file.path)) : null;

    // Check if username already exists
    const existingEntry = await db.HoursCategoryMst.findOne({ where: { Code: code } });
    if (existingEntry) {
      return res.status(400).json({ message: "Code already exists" });
    }

    console.log('Checked Existing Entry:');


    // Create the new employee
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

    console.log('Entry Added:');


    // Respond with the created employee
    return res.status(201).json({
      message: 'Hours Category added successfully',
      entry,
    });
  } catch (err) {
    console.log('Error:', err);
    return res.status(500).json({ error: err.message });
  }
};


exports.getAllEmployees = async (req, res) => {
  try {
    // Check if the logged-in user has the admin role
    if (req.user.UserType !== 'Admin') {
      return res.status(403).json({ error: 'You do not have permission to view employees' });
    }

    // Fetch all employees from the database
    const employees = await db.EmployeeMst.findAll({
      where: {
        IsDelete: false, // Only fetch employees that are not marked as deleted
      },
      attributes: [
        'EmpMstId','EmpFullName', 'EmpUsername', 'EmpType', 'EmpBranch', 'EmpDepartment', 'EmpFirm', 'EmpDesignation',
        'EmpSalary', 'EmpPhoneNo', 'EmpBankName', 'EmpBankACNo', 'EmpBankIFSCode',
        'EmpSalaryType', 'EmpCode', 'EmpPANNo', 'EmpESINo', 'EmpAddress', 'DateOfJoinng',
        'DocumentPaths', 'EmpGrp', 'Sflag', 'SDate', 'LogID', 'PcID', 'Ever',
        'CompanyCode', 'SortId', 'Active',
      ]
    });

    // Check if no employees found
    // if (employees.length === 0) {
    //   return res.status(404).json({ message: 'No employees found' });
    // }

    // Respond with the list of employees
    return res.status(200).json({
      message: 'Employees fetched successfully.',
      employees,
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
      return res.status(403).json({ error: 'You do not have permission to view employees' });
    }

    // Fetch all employees from the database
    const employees = await db.EmployeeMst.findAll({
      where: {
        IsDelete: false, // Only fetch employees that are not marked as deleted
      },
      attributes: [
        'EmpMstId','EmpUsername','EmpFaceData'
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
      return res.status(403).json({ error: 'You do not have permission to view employees' });
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
      return res.status(403).json({ error: 'You do not have permission to view employees' });
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
      return res.status(403).json({ error: 'You do not have permission to view employees' });
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
      return res.status(403).json({ error: 'You do not have permission to view employees' });
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
      return res.status(403).json({ error: 'You do not have permission to view employees' });
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


// Update Employee
// exports.updateEmployee = async (req, res) => {
//   try {
//     const { id } = req.params;
//     await Employee.update(req.body, { where: { id } });
//     return res.json({ message: "Employee updated successfully" });
//   } catch (err) {
//     return res.status(500).json({ error: err.message });
//   }
// };


exports.updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if the logged-in user has the admin role
    if (req.user.UserType !== 'Admin') {
      return res.status(403).json({ error: 'You do not have permission to update an employee' });
    }

    // Proceed with employee update
    const { EmpName, EmpType, EmpGrp, Sflag, Active } = req.body;

    // Check if the employee exists
    const employee = await db.EmployeeMst.findByPk(id);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // Update the employee fields
    await employee.update({
      EmpName,
      EmpType,
      EmpGrp,
      Sflag,
      Active,
    });

    return res.json({ message: "Employee updated successfully", employee });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};