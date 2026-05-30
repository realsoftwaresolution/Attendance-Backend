const jwt = require("jsonwebtoken");
const { secret } = require("../config/jwt.config");
const db = require("../config/dbConnection");
const { hashPassword, comparePassword } = require("../utils/hash.utils");
const { Op } = require("sequelize");
const upload = require('../middlewares/upload.middleware'); // Ensure you have the multer middleware
const fs = require('fs');
const path = require('path');
const moment = require('moment');  // Make sure to install moment.js or use any other library for date manipulation
const { error } = require("console");
const canvas = require("canvas");
const { euclideanDistance } = require("../utils/face.utils");

const faceapi = require("face-api.js");
// const faceapi = require("@vladmandic/face-api");

const crypto = require("crypto");


// Create Employee



function normalizeDescriptor(descriptor, decimals = 2) {
  return descriptor.map(v =>
    Number(v.toFixed(decimals))
  );
}

function hashDescriptor(descriptor) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(descriptor))
    .digest("hex");
}


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

exports.registerEmployeeFace = async (req, res) => {
  try {
    /* ---------- AUTH ---------- */
    if (req.user?.UserType !== "Admin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (!req.file?.path) {
      return res.status(400).json({ error: "Image file missing" });
    }

    // 👇 OPTIONAL EmpMstId (for ignore-duplicate logic)
    const currentEmpMstId = req.body.EmpMstId
      ? Number(req.body.EmpMstId)
      : null;

    /* ---------- FACE DETECTION ---------- */
    const img = await canvas.loadImage(req.file.path);

    const detection = await faceapi
      .detectSingleFace(img)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      return res.status(400).json({ error: "No face detected" });
    }

    const rawDescriptor = Array.from(detection.descriptor);

    /* ---------- DUPLICATE CHECK (IGNORE SAME EMP) ---------- */
    const whereClause = {
      Active: true,
      IsDelete: false,
      EmpFaceData: { [Op.ne]: null },
    };

    // 🔥 Ignore same EmpMstId (ALLOW UPDATE CASE)
    if (currentEmpMstId) {
      whereClause.EmpMstId = { [Op.ne]: currentEmpMstId };
    }

    const existingEmployees = await db.EmployeeMst.findAll({
      where: whereClause,
      attributes: ["EmpMstId", "EmpFaceData"],
    });

    for (const emp of existingEmployees) {
      try {
        const savedDescriptor = JSON.parse(emp.EmpFaceData);

        const distance = faceapi.euclideanDistance(
          new Float32Array(savedDescriptor),
          new Float32Array(rawDescriptor)
        );

        // 🔴 BLOCK: same face in another EmpMstId
        if (distance < 0.45) {
          return res.status(409).json({
            success: false,
            message: "This face is already registered with another employee",
            matchedEmpMstId: emp.EmpMstId,
            distance,
          });
        }
      } catch {
        console.warn("Skipping corrupted face data for Emp:", emp.EmpMstId);
      }
    }

    /* ---------- HASH (ONLY FOR RESPONSE) ---------- */
    const normalized = normalizeDescriptor(rawDescriptor, 2);
    const faceHash = hashDescriptor(normalized);

    /* ---------- RESPONSE ONLY (NO DB UPDATE) ---------- */
    return res.json({
      success: true,
      message: "Face processed successfully",
      faceData: rawDescriptor,
      faceHash,
    });

  } catch (err) {
    console.error("❌ Face process error:", err);
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

exports.verifyEmployeeFace = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Image required" });
    }

    const img = await canvas.loadImage(req.file.path);

    const detection = await faceapi
      .detectSingleFace(img)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      return res.status(400).json({ message: "No face detected" });
    }

    // 🔥 SAME FORMAT AS REGISTER
    const liveEmbedding = Array.from(detection.descriptor);

    const employees = await db.EmployeeMst.findAll({
      where: {
        EmpFaceData: { [Op.ne]: null },
        Active: true,
        IsDelete: false
      },
      attributes: ["EmpMstId", "EmpFaceData"]
    });

    let matchedEmployeeId = null;
    let minDistance = Infinity;

    for (const emp of employees) {
      try {
        // 🔥 FORCE NUMERIC ARRAY
        let stored = emp.EmpFaceData;

        if (typeof stored === 'string') {
          stored = JSON.parse(stored);
        }

        stored = stored.map(Number);

        const dist = faceapi.euclideanDistance(
          new Float32Array(stored),
          new Float32Array(liveEmbedding)
        );

        if (dist < minDistance) {
          minDistance = dist;
          matchedEmployeeId = emp.EmpMstId;
        }
      } catch {
        console.warn("Invalid face data for Emp:", emp.EmpMstId);
      }
    }

    // 🔥 REALISTIC THRESHOLD
    if (matchedEmployeeId && minDistance < 0.45) {
      return res.json({
        matched: true,
        EmpMstId: matchedEmployeeId,
        distance: minDistance
      });
    }

    return res.json({
      matched: false,
      distance: minDistance
    });

  } catch (err) {
    console.error(err);
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

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params; // User ID from URL

    // Check if the user exists
    const user = await db.UserMst.findByPk(id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Soft delete: mark user as deleted
    await user.update({
      IsDelete: true,
    });

    await db.UserMenuMst.destroy({
      where: { UserMstId: id },
    });


    await db.UserReportMst.destroy({
      where: { UserMstId: id },
    });

    return res.status(200).json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Delete User Error:', err);
    return res.status(500).json({ error: 'An error occurred while deleting the user' });
  }
};


exports.assignUserPermissions = async (req, res) => {
  const {
    userId,
    selectedMenuIds = [],
    selectedSubReportTypeIds = []
  } = req.body;

  try {
    // Step 1: Verify user exists
    const user = await db.UserMst.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Step 2: Handle Menu Assignments
    await db.UserMenuMst.destroy({ where: { UserMstId: userId } });

    if (selectedMenuIds.length > 0) {
      const menus = await db.MenuMst.findAll({
        where: { MenuMstId: selectedMenuIds },
        attributes: ['MenuMstId', 'MainMenuMstId']
      });

      const menuData = menus.map(menu => ({
        UserMstId: userId,
        MenuMstId: menu.MenuMstId,
        MainMenuMstId: menu.MainMenuMstId
      }));

      await db.UserMenuMst.bulkCreate(menuData);
    }

    // Step 3: Handle Report Assignments
    await db.UserReportMst.destroy({ where: { UserMstId: userId } });

    if (selectedSubReportTypeIds.length > 0) {
      const subReports = await db.SubReportTypeMst.findAll({
        where: { SubReportTypeMstId: selectedSubReportTypeIds },
        attributes: ['SubReportTypeMstId', 'ReportTypeMstId']
      });

      const reportData = subReports.map(rpt => ({
        UserMstId: userId,
        SubReportTypeMstId: rpt.SubReportTypeMstId,
        ReportTypeMstId: rpt.ReportTypeMstId
      }));

      await db.UserReportMst.bulkCreate(reportData);
    }

    return res.status(200).json({
      message: 'User permissions (menus & reports) assigned successfully'
    });
  } catch (err) {
    console.error('Error assigning user permissions:', err);
    return res.status(500).json({ error: 'Failed to assign user permissions' });
  }
};

exports.getUserPermissions = async (req, res) => {
  const { id } = req.params;

  try {
    // Step 1: Verify user exists
    const user = await db.UserMst.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Step 2: Get assigned menus
    const menuPermissions = await db.UserMenuMst.findAll({
      where: { UserMstId: id },
      attributes: ['MenuMstId', 'MainMenuMstId']
    });

    // Step 3: Get assigned reports
    const reportPermissions = await db.UserReportMst.findAll({
      where: { UserMstId: id },
      attributes: ['SubReportTypeMstId', 'ReportTypeMstId']
    });

    const editDeletePermissions = await db.UserMst.findOne({
      where: { UserMstId: id },
      attributes: ['Edit_Rights', 'Delete_Rights']
    });

    return res.status(200).json({
      message: 'User permissions fetched successfully',
      menus: menuPermissions,
      reports: reportPermissions,
      editDelete: editDeletePermissions
    });
  } catch (err) {
    console.error('Error fetching user permissions:', err);
    return res.status(500).json({ error: 'Failed to fetch user permissions' });
  }
};







exports.getAllMainMenu = async (req, res) => {
  try {
    // Check if the logged-in user has the admin role
    if (req.user.UserType !== 'Admin') {
      return res.status(403).json({ error: 'You do not have permission to view Main Menu' });
    }

    // Fetch all employees from the database
    const entry = await db.MainMenuMst.findAll({
      where: {
        Active: true, // Only fetch entry that are not marked as deleted
      }
    });
    return res.status(200).json({
      message: 'Main Menu fetched successfully',
      entry,
    });
  } catch (err) {
    console.log('Error:', err);
    return res.status(500).json({ error: err.message });
  }
};

exports.getAllReportType = async (req, res) => {
  try {
    // Check if the logged-in user has the admin role
    if (req.user.UserType !== 'Admin') {
      return res.status(403).json({ error: 'You do not have permission to view Report Type' });
    }

    // Fetch all employees from the database
    const entry = await db.ReportTypeMst.findAll({
      where: {
        Active: true, // Only fetch entry that are not marked as deleted
      }
    });
    return res.status(200).json({
      message: 'Report Type  fetched successfully',
      entry,
    });
  } catch (err) {
    console.log('Error:', err);
    return res.status(500).json({ error: err.message });
  }
};

exports.getAllMenu = async (req, res) => {
  try {
    // Check if the logged-in user has the admin role
    if (req.user.UserType !== 'Admin') {
      return res.status(403).json({ error: 'You do not have permission to view Menu' });
    }

    // Fetch all employees from the database
    const entry = await db.MenuMst.findAll({
      where: {
        Active: true, // Only fetch entry that are not marked as deleted
      }
    });
    return res.status(200).json({
      message: 'Menu fetched successfully',
      entry,
    });
  } catch (err) {
    console.log('Error:', err);
    return res.status(500).json({ error: err.message });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    // Check if the logged-in user has the admin role
    if (req.user.UserType !== 'Admin') {
      return res.status(403).json({ error: 'You do not have permission to view Users' });
    }

    // Fetch all employees from the database
    const entry = await db.UserMst.findAll({
      where: {
        IsDelete: false, // Only fetch entry that are not marked as deleted
      }
    });
    return res.status(200).json({
      message: 'Users fetched successfully',
      entry,
    });
  } catch (err) {
    console.log('Error:', err);
    return res.status(500).json({ error: err.message });
  }
};

exports.getAllSubReportType = async (req, res) => {
  try {
    // Check if the logged-in user has the admin role
    if (req.user.UserType !== 'Admin') {
      return res.status(403).json({ error: 'You do not have permission to view Sub Report Type' });
    }

    // Fetch all employees from the database
    const entry = await db.SubReportTypeMst.findAll({
      where: {
        Active: true, // Only fetch entry that are not marked as deleted
      }
    });
    return res.status(200).json({
      message: 'Sub Report Type fetched successfully',
      entry,
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
      date,
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

    if (inTime && outTime === null) {
      return res.status(400).json({ error: 'InTime/OutTime can not be null' });
    }
    const currentDate = moment(date, 'DD-MM-YYYY').format('YYYY-MM-DD');

    const processedInTime = inTime === '00:00' ? null : inTime;
    const processedOutTime = outTime === '00:00' ? null : outTime;



    const entry = await db.AttendanceMst.create({
      EmpId: empId,
      Department: department,
      Shift: shift,
      InTime: processedInTime,
      OutTime: processedOutTime,
      Date: currentDate,
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

exports.addAttendance1 = async (req, res) => {
  try {
    if (req.user.UserType !== 'Admin') {
      return res.status(403).json({ error: 'You do not have permission to add attendance records' });
    }

    const {
      empId,
      department,
      shift,
      time,
      date,
      sDate,
      logId,
      pcId,
      ever,
      companyCode,
      sortId
    } = req.body;

    if (!empId || !department || !shift || !date || !time) {
      return res.status(400).json({ error: 'Missing required field' });
    }

    const currentDate = moment(date, 'DD-MM-YYYY').format('YYYY-MM-DD');
    const yesterdayDate = moment(date, 'DD-MM-YYYY').subtract(1, 'days').format('YYYY-MM-DD');

    // Check if yesterday's entry exists without an outTime
    const yesterdayEntry = await db.AttendanceMst.findOne({
      where: {
        EmpId: empId,
        Date: yesterdayDate,
        OutTime: null,
        IsDelete: false,
      },
    });

    let warningMessage = null;
    if (yesterdayEntry) {
      warningMessage = "Yesterday's out time is missing. Please update it.";
    }

    // Find the last attendance entry for today
    const lastEntry = await db.AttendanceMst.findOne({
      where: {
        EmpId: empId,
        Date: currentDate,
        IsDelete: false,
      },
      order: [['InTime', 'DESC']], // Get the latest entry
    });

    if (lastEntry) {
      if (!lastEntry.OutTime) {
        // If last entry has no OutTime, update it
        lastEntry.OutTime = time;
        lastEntry.TotalHours = calculateTotalHours(lastEntry.InTime, time);
        await lastEntry.save();
        // logAttendance(empId, 'OUT', time, date);
        setImmediate(() => {
          logAttendance(empId, 'OUT', time, date);
        });
        return res.status(200).json({
          message: 'Out time recorded successfully',
          entry: lastEntry,
          warning: warningMessage,
        });
      } else {
        // If last entry has both InTime and OutTime, create a new InTime entry
        const newEntry = await db.AttendanceMst.create({
          EmpId: empId,
          Department: department,
          Shift: shift,
          InTime: time,
          OutTime: null,
          Date: currentDate,
          TotalHours: 0,
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

        // logAttendance(empId, 'IN', time, date);
        setImmediate(() => {
          logAttendance(empId, 'IN', time, date);
        });
        return res.status(201).json({
          message: 'New in time recorded successfully',
          entry: newEntry,
          warning: warningMessage,
        });
      }
    }

    // No entry exists, create first InTime entry for today
    const newEntry = await db.AttendanceMst.create({
      EmpId: empId,
      Department: department,
      Shift: shift,
      InTime: time,
      OutTime: null,
      Date: currentDate,
      TotalHours: 0,
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

    // logAttendance(empId, 'IN', time, date);
    setImmediate(() => {
      logAttendance(empId, 'IN', time, date);
    });
    return res.status(201).json({
      message: 'In time recorded successfully',
      entry: newEntry,
      warning: warningMessage,
    });

  } catch (err) {
    console.error('Error:', err);
    return res.status(500).json({ error: err.message });
  }
};

function logAttendance(empCode, status, time, date) {
  const logDir = path.join(__dirname, 'logs');

  fs.promises.mkdir(logDir, { recursive: true })
    .then(() => {
      const logFile = path.join(logDir, 'attendance-log.txt');
      const logLine = `${empCode} - ${status} - ${time} - ${date}\n`;
      return fs.promises.appendFile(logFile, logLine, 'utf8');
    })
    .catch(err => console.error('Log error:', err));
}

const calculateTotalHours = (inTime, outTime) => {
  const start = moment(inTime, 'HH:mm:ss');
  const end = moment(outTime, 'HH:mm:ss');
  return end.diff(start, 'hours', true);
};

exports.updateAttendance1 = async (req, res) => {
  try {
    // Check if the logged-in user has admin permissions
    if (req.user.UserType !== 'Admin') {
      return res.status(403).json({ error: 'You do not have permission to update attendance records' });
    }

    const { id } = req.params; // Attendance ID passed as a route parameter
    let { inTime, outTime } = req.body;

    // Ensure the attendance record exists
    const attendance = await db.AttendanceMst.findByPk(id);
    if (!attendance) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

    const currentDate = moment(attendance.Date, 'YYYY-MM-DD').format('YYYY-MM-DD');
    const yesterdayDate = moment(attendance.Date, 'YYYY-MM-DD').subtract(1, 'days').format('YYYY-MM-DD');

    // Check if there's an entry from yesterday without an outTime
    const yesterdayEntry = await db.AttendanceMst.findOne({
      where: {
        EmpId: attendance.EmpId,
        Date: yesterdayDate,
        OutTime: null,
        IsDelete: false,
      },
    });

    let warningMessage = null;
    if (yesterdayEntry) {
      warningMessage = "Yesterday's out time is missing. Please update it.";
    }
    if (outTime === '00:00') {
      outTime = null;
    }

    // If updating outTime, ensure there's a valid InTime
    if (outTime && !attendance.InTime) {
      return res.status(400).json({ error: 'Cannot set out time without a valid in time' });
    }

    // If updating both inTime and outTime, recalculate total hours
    let totalHours = attendance.TotalHours;
    if (inTime && outTime) {
      totalHours = calculateTotalHours(inTime, outTime);
    } else if (outTime) {
      totalHours = calculateTotalHours(attendance.InTime, outTime);
    }

    // Update the attendance record
    await attendance.update({
      InTime: inTime ?? attendance.InTime,
      OutTime: outTime ?? attendance.OutTime,
      TotalHours: totalHours,
      Sflag: 'U', // Marking as updated
    }, { logging: console.log });

    return res.status(200).json({
      message: 'Attendance updated successfully',
      attendance,
      warning: warningMessage,
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

exports.deleteAttLog = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if the logged-in user has the admin role
    if (req.user.UserType !== 'Admin') {
      return res.status(403).json({ error: 'You do not have permission to delete Attendance' });
    }

    const entry = await db.AttendanceMst.findByPk(id);
    if (!entry) {
      return res.status(404).json({ error: "Attendance Log not found" });
    }

    await entry.destroy();

    return res.json({
      message: 'Attendance Log deleted successfully',
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

    await db.MasterSettingMst.destroy({ where: { DepCode: depCode } });

    return res.json({
      message: 'Master Setting deleted successfully',
    });
  } catch (err) {
    console.log('Error:', err);
    return res.status(500).json({ error: err.message });
  }
};

exports.addAttMst = async (req, res) => {
  try {
    // Check for admin permissions
    if (req.user.UserType !== 'Admin') {
      return res.status(403).json({ error: 'You do not have permission to add att mst records' });
    }

    const attendanceRecords = req.body; // Expecting an array of records

    if (!Array.isArray(attendanceRecords) || attendanceRecords.length === 0) {
      return res.status(400).json({ error: 'Request body must contain a non-empty array of attendance records' });
    }

    const entries = []; // To store successfully created entries
    const errors = [];  // To store errors for specific records

    for (const record of attendanceRecords) {
      try {
        const {
          EmpId: empId,
          Department: department,
          Date: date,
          WorkHours: workHours,
          WorkH: workH,
          OTHours: otHours,
          TotalSalary: totalSalary,
          OTSalary: otSalary,
          Work: work,
          Hoiliday: holiday,
          OffType: offType,
          SWork: sWork,
          LunchBreak: lunchBreak,
          LastOutTime: lastOutTime,
          SDate: sDate,
          LogId: logId,
          PcId: pcId,
          Ever: ever,
          CompanyCode: companyCode,
          SortId: sortId,
          InTime1: inTime1,
          OutTime1: outTime1,
          InTime2: inTime2,
          OutTime2: outTime2,
          InTime3: inTime3,
          OutTime3: outTime3,
          InTime4: inTime4,
          OutTime4: outTime4,
          InTime5: inTime5,
          OutTime5: outTime5,
          InTime6: inTime6,
          OutTime6: outTime6,
          InTime7: inTime7,
          OutTime7: outTime7,
          InTime8: inTime8,
          OutTime8: outTime8,
          InTime9: inTime9,
          OutTime9: outTime9,
        } = record;

        // Ensure all required fields are provided
        if (!empId || !department || !date) {
          throw new Error('Missing required fields: EmpId, Department, or Date');
        }

        // Format the date
        const currentDate = moment(date, 'YYYY-MM-DD').format('YYYY-MM-DD');

        const existingEntry = await db.AttMst.findOne({ where: { AttDate: currentDate, Department: department, EmpId: empId } });
        if (existingEntry) {
          await db.AttMst.destroy({ where: { AttDate: currentDate, Department: department, EmpId: empId } });
        }

        // Create the attendance entry
        const entry = await db.AttMst.create({
          AttDate: currentDate,
          EmpId: empId,
          Department: department,
          InTime1: inTime1,
          OutTime1: outTime1,
          InTime2: inTime2,
          OutTime2: outTime2,
          InTime3: inTime3,
          OutTime3: outTime3,
          InTime4: inTime4,
          OutTime4: outTime4,
          InTime5: inTime5,
          OutTime5: outTime5,
          InTime6: inTime6,
          OutTime6: outTime6,
          InTime7: inTime7,
          OutTime7: outTime7,
          InTime8: inTime8,
          OutTime8: outTime8,
          InTime9: inTime9,
          OutTime9: outTime9,
          WorkHours: workHours,
          WorkH: workH,
          OTHours: otHours,
          Work: work,
          TotalSalary: totalSalary,
          OTSalary: otSalary,
          Hoiliday: holiday,
          OffType: offType,
          SWork: sWork,
          LunchBreak: lunchBreak,
          LastOutTime: lastOutTime,
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

        entries.push(entry);
      } catch (error) {
        errors.push({
          record,
          error: error.message,
        });
      }
    }

    // Send a response summarizing the results
    return res.status(207).json({
      message: 'Work Hour Calculated',
      successCount: entries.length,
      errorCount: errors.length,
      errors,
    });
  } catch (err) {
    console.error('Error:', err);
    return res.status(500).json({ error: err.message });
  }
};

exports.getAllAttMst = async (req, res) => {
  try {
    // Check if the logged-in user has the admin role
    if (req.user.UserType !== 'Admin') {
      return res.status(403).json({ error: 'You do not have permission to view Att Mst' });
    }

    // Fetch all employees from the database
    const entry = await db.AttMst.findAll({
      where: {
        IsDelete: false, // Only fetch entry that are not marked as deleted
      }
    });
    return res.status(200).json({
      message: 'Att Mst Data fetched successfully',
      entry,
    });
  } catch (err) {
    console.log('Error:', err);
    return res.status(500).json({ error: err.message });
  }
};

exports.calculateSalary = async (req, res) => {
  let { Month, Year, FirmName, DepartmentName, BranchName } = req.body;

  try {
    // Convert empty strings and undefined values to NULL
    FirmName = FirmName?.trim() || null;
    DepartmentName = DepartmentName?.trim() || null;
    BranchName = BranchName?.trim() || null;

    // Execute the stored procedure using Sequelize
    const result = await db.sequelize.query(
      `EXEC CalculateSalary 
        @Month = :Month, 
        @Year = :Year, 
        @FirmName = :FirmName, 
        @DepartmentName = :DepartmentName, 
        @BranchName = :BranchName`,
      {
        replacements: { Month, Year, FirmName, DepartmentName, BranchName },
        type: db.Sequelize.QueryTypes.SELECT,
      }
    );

    // Ensure the result is a valid array
    if (!result || !Array.isArray(result)) {
      return res.status(500).json({ success: false, message: "Invalid response from stored procedure" });
    }

    // Format numeric fields (if applicable)
    const modifiedResult = result.map((item) => ({
      ...item,
    }));

    res.status(200).json({ success: true, data: modifiedResult });
  } catch (error) {
    console.error("Error executing stored procedure:", error);
    res.status(500).json({ success: false, message: "Something went wrong", error: error.message });
  }
};

exports.addSalaryMst = async (req, res) => {
  try {
    if (req.user.UserType !== 'Admin') {
      return res.status(403).json({ error: 'You do not have permission to add salary records' });
    }

    const { month, department, firm, branch, depositDate, salaries, sDate, logId, pcId, ever, companyCode, sortId } = req.body;

    if (!month || !Array.isArray(salaries) || salaries.length === 0) {
      return res.status(400).json({ error: 'Missing required fields or invalid salaries data' });
    }

    const formattedMonth = moment(month, 'MMMM, YYYY').format('YYYY-MM');

    let salaryMst = await db.SalaryMst.findOne({
      where: { Month: formattedMonth, Department: department, FirmName: firm, BranchName: branch },
    });

    if (!salaryMst) {
      salaryMst = await db.SalaryMst.create({
        Month: formattedMonth,
        Department: department,
        FirmName: firm,
        BranchName: branch,
        DepositDate: depositDate,
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
    } else {
      await db.SalaryDetMst.destroy({ where: { SalaryMstId: salaryMst.SalaryMstId } });
    }

    function roundToTwo(num) {
      return Math.round((num + Number.EPSILON) * 100) / 100;
    }

    async function storeSalariesParallel(salaries) {
      try {
        await Promise.all(
          salaries.map(salary =>
            db.SalaryDetMst.create({
              SalaryMstId: salaryMst.SalaryMstId,
              EmployeeCode: salary.EmployeeCode,
              EmployeeName: salary.EmployeeName,
              Month: salary.Month,
              Year: salary.Year,
              FirmName: salary.FirmName,
              BranchName: salary.BranchName,
              Department: salary.Department,
              DepartmentCode: salary.DepartmentCode,
              Designation: salary.Designation,
              BankName: salary.BankName,
              IFSCCode: salary.IFSCCode,
              BankAccountNo: salary.BankAccountNo,
              WorkingHoursPerDay: salary.WorkingHoursPerDay,
              TotalHours: salary.TotalHours,
              TotalWorkingDays: salary.TotalWorkingDays,
              TotalWorkHours: roundToTwo(salary.TotalWorkHours),
              TotalOvertimeHours: roundToTwo(salary.TotalOvertimeHours),
              PresentDays: salary.PresentDays,
              AbsentDays: salary.AbsentDays,
              HalfDays: salary.HalfDays,
              LateDays: salary.LateDays,
              WorkingDays: salary.WorkingDays,
              BasicSalary: salary.BasicSalary,
              WorkSalary: roundToTwo(salary.WorkSalary),
              OTSalary: roundToTwo(salary.OTSalary),
              SundayOT: roundToTwo(salary.SundayOT),
              TotalSalary: roundToTwo(salary.TotalSalary),
              PT: roundToTwo(salary.PT),
              NetSalary: roundToTwo(salary.NetSalary),
              Sflag: 'I',
              SDate: sDate,
              LogID: logId,
              PcID: pcId,
              Ever: ever,
              CompanyCode: companyCode,
              SortId: sortId,
              Active: true,
              IsDelete: false,
            })
          )
        );
        console.log('All salaries stored successfully.');
      } catch (error) {
        console.error('Error storing salaries:', error);
      }
    }

    await storeSalariesParallel(salaries);

    return res.status(201).json({ message: 'Salaries calculation stored successfully' });
  } catch (err) {
    console.error('Error:', err);
    return res.status(500).json({ error: err.message });
  }
};

exports.getAllSalaryMst = async (req, res) => {
  try {
    // Check if the logged-in user has the admin role
    if (req.user.UserType !== 'Admin') {
      return res.status(403).json({ error: 'You do not have permission to view Salary Mst' });
    }

    // Fetch all employees from the database
    const entry = await db.SalaryMst.findAll({
      where: {
        IsDelete: false, // Only fetch entry that are not marked as deleted
      }
    });
    return res.status(200).json({
      message: 'Salary Mst Data fetched successfully',
      entry,
    });
  } catch (err) {
    console.log('Error:', err);
    return res.status(500).json({ error: err.message });
  }
};

exports.getAllSalaryDetMst = async (req, res) => {
  try {
    // Check if the logged-in user has the admin role
    if (req.user.UserType !== 'Admin') {
      return res.status(403).json({ error: 'You do not have permission to view Salary Det Mst' });
    }

    // Fetch all employees from the database
    const entry = await db.SalaryDetMst.findAll({
      where: {
        IsDelete: false, // Only fetch entry that are not marked as deleted
      }
    });
    return res.status(200).json({
      message: 'Salary Det Mst Data fetched successfully',
      entry,
    });
  } catch (err) {
    console.log('Error:', err);
    return res.status(500).json({ error: err.message });
  }
};

exports.deleteSalaryMst = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if the logged-in user has the admin role
    if (req.user.UserType !== 'Admin') {
      return res.status(403).json({ error: 'You do not have permission to delete Salary Mst' });
    }

    const entry = await db.SalaryMst.findByPk(id);
    if (!entry) {
      return res.status(404).json({ error: "Firm not found" });
    }

    await entry.destroy();

    return res.json({
      message: 'Salary Mst deleted successfully',
    });
  } catch (err) {
    console.log('Error:', err);
    return res.status(500).json({ error: err.message });
  }
};


