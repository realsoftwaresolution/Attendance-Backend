const moment = require("moment");
const db = require("../../config/dbConnection");
const { AppError } = require("../../utils/AppError");
const { Op } = require("sequelize");

exports.createLeave = async (req, res) => {
    const transaction = req.transaction;
    const { LeaveType, DurationType, StartDate, EndDate, LeaveDate, Session, HourlyDuration, Reason } = req.body;
    
    // Get employee ID from authenticated user token
    const EmpMstId = req.user.EmpMstId;

    if (req.user.UserType !== 'Employee') {
        throw new AppError("Only Employees can submit leave applications", 403);
    }

    // Verify Employee exists
    const employee = await db.EmployeeMst.findOne({ where: { EmpMstId, Active: true }, transaction });
    if (!employee) throw new AppError("Employee not found or inactive", 404);

    let DurationDays = 0;

    if (DurationType === "Full_Day") {
        const start = moment(StartDate, "YYYY-MM-DD");
        const end = moment(EndDate, "YYYY-MM-DD");
        if (end.isBefore(start)) throw new AppError("EndDate cannot be before StartDate", 400);
        // Inclusive duration calculation
        DurationDays = end.diff(start, 'days') + 1; 
    } else if (DurationType === "Half_Day") {
        DurationDays = 0.5;
    } else if (DurationType === "Short_Leave_Hourly") {
        DurationDays = 0; // Doesn't consume full days
    }

    const leave = await db.LeaveMst.create({
        EmpMstId,
        LeaveType,
        DurationType,
        StartDate,
        EndDate,
        LeaveDate,
        Session,
        HourlyDuration,
        DurationDays,
        Reason,
        Status: "Pending",
        Sflag: "I",
        LogID: req.logId,
        PcID: req.pcId,
        Active: true
    }, { transaction });

    res.status(201).json({
        success: true,
        message: "Leave application submitted successfully",
        data: leave
    });
};

exports.updateLeave = async (req, res) => {
    const transaction = req.transaction;
    const { id } = req.params;
    const { LeaveType, DurationType, StartDate, EndDate, LeaveDate, Session, HourlyDuration, Reason, Status, ApprovalRemarks } = req.body;

    if (req.user.UserType !== 'Admin') {
        throw new AppError("Only Admins can update leave applications", 403);
    }

    const leave = await db.LeaveMst.findOne({ where: { LeaveMstId: id }, transaction });
    if (!leave) throw new AppError("Leave record not found", 404);

    let DurationDays = leave.DurationDays;
    
    // Recalculate duration if duration related fields changed
    if (DurationType) {
        if (DurationType === "Full_Day") {
            const start = moment(StartDate || leave.StartDate, "YYYY-MM-DD");
            const end = moment(EndDate || leave.EndDate, "YYYY-MM-DD");
            if (end.isBefore(start)) throw new AppError("EndDate cannot be before StartDate", 400);
            DurationDays = end.diff(start, 'days') + 1;
        } else if (DurationType === "Half_Day") {
            DurationDays = 0.5;
        } else if (DurationType === "Short_Leave_Hourly") {
            DurationDays = 0;
        }
    }

    await leave.update({
        LeaveType: LeaveType !== undefined ? LeaveType : leave.LeaveType,
        DurationType: DurationType !== undefined ? DurationType : leave.DurationType,
        StartDate: StartDate !== undefined ? StartDate : leave.StartDate,
        EndDate: EndDate !== undefined ? EndDate : leave.EndDate,
        LeaveDate: LeaveDate !== undefined ? LeaveDate : leave.LeaveDate,
        Session: Session !== undefined ? Session : leave.Session,
        HourlyDuration: HourlyDuration !== undefined ? HourlyDuration : leave.HourlyDuration,
        DurationDays,
        Reason: Reason !== undefined ? Reason : leave.Reason,
        Status: Status !== undefined ? Status : leave.Status,
        ApprovalRemarks: ApprovalRemarks !== undefined ? ApprovalRemarks : leave.ApprovalRemarks,
        ApprovedBy: Status !== undefined ? req.logId : leave.ApprovedBy,
        Sflag: "U",
        LogID: req.logId,
        PcID: req.pcId
    }, { transaction });

    res.status(200).json({
        success: true,
        message: "Leave updated successfully",
        data: leave
    });
};



exports.deleteLeave = async (req, res) => {
    const transaction = req.transaction;
    const { id } = req.params;

    if (req.user.UserType !== 'Admin') {
        throw new AppError("Only Admins can delete leave applications", 403);
    }

    const leave = await db.LeaveMst.findOne({ where: { LeaveMstId: id }, transaction });
    if (!leave) throw new AppError("Leave record not found", 404);

    await leave.destroy({ transaction });

    res.status(200).json({
        success: true,
        message: "Leave deleted successfully"
    });
};

exports.getAllLeaves = async (req, res) => {
    const isPagination = req.query.isPagination !== "false" && req.query.isPagination !== false;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;

    const departmentMstId = req.query.DepartmentMstId ? parseInt(req.query.DepartmentMstId, 10) : null;
    const designationMstId = req.query.DesignationMstId ? parseInt(req.query.DesignationMstId, 10) : null;
    const statusFilter = req.query.Status || null;
    
    let empMstIdFilter = null;
    if (req.user.UserType === "Employee") {
        empMstIdFilter = req.user.EmpMstId; 
    } else if (req.query.EmpMstId) {
        empMstIdFilter = parseInt(req.query.EmpMstId, 10);
    }

    let query = `
        SELECT l.*, 
               e.EmpFullName, e.EmpCode, e.DepartmentMstId, e.DesignationMstId,
               d.Department,
               ds.Designation,
               a.Username AS ApprovedByUsername
        FROM LeaveMst l
        INNER JOIN EmployeeMst e ON l.EmpMstId = e.EmpMstId
        LEFT JOIN DepartmentMst d ON e.DepartmentMstId = d.DepartmentMstId
        LEFT JOIN DesignationMst ds ON e.DesignationMstId = ds.DesignationMstId
        LEFT JOIN UserMst a ON l.ApprovedBy = a.UserMstId
        WHERE 1=1
    `;

    const replacements = {};

    const leaveTypeFilter = req.query.LeaveType || null;
    const monthFilter = req.query.Month || null; // Expected format: YYYY-MM

    if (statusFilter) {
        query += ` AND l.Status = :status`;
        replacements.status = statusFilter;
    }
    if (leaveTypeFilter) {
        query += ` AND l.LeaveType = :leaveType`;
        replacements.leaveType = leaveTypeFilter;
    }
    if (monthFilter) {
        // Find leaves that fall within this month. 
        // For Full_Day: StartDate <= endOfMonth AND EndDate >= startOfMonth
        // For Half/Short: LeaveDate starts with YYYY-MM
        const startOfMonth = `${monthFilter}-01`;
        const endOfMonth = `${monthFilter}-31`; // 31 is safe for string comparison YYYY-MM-DD
        
        query += ` AND (
            (l.DurationType = 'Full_Day' AND l.StartDate <= :endOfMonth AND l.EndDate >= :startOfMonth)
            OR
            (l.DurationType != 'Full_Day' AND l.LeaveDate LIKE :monthPrefix)
        )`;
        replacements.startOfMonth = startOfMonth;
        replacements.endOfMonth = endOfMonth;
        replacements.monthPrefix = `${monthFilter}-%`;
    }
    if (empMstIdFilter) {
        query += ` AND l.EmpMstId = :empId`;
        replacements.empId = empMstIdFilter;
    }
    if (departmentMstId) {
        query += ` AND e.DepartmentMstId = :deptId`;
        replacements.deptId = departmentMstId;
    }
    if (designationMstId) {
        query += ` AND e.DesignationMstId = :desigId`;
        replacements.desigId = designationMstId;
    }

    // Count query
    const countQuery = `SELECT COUNT(*) AS total FROM (${query}) AS subquery`;
    const countResult = await db.sequelize.query(countQuery, { replacements, type: db.sequelize.QueryTypes.SELECT });
    const count = countResult[0].total;

    query += ` ORDER BY l.LeaveMstId DESC`;

    if (isPagination) {
        query += ` OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY`;
        replacements.offset = offset;
        replacements.limit = limit;
    }

    const rows = await db.sequelize.query(query, { replacements, type: db.sequelize.QueryTypes.SELECT });

    res.status(200).json({
        success: true,
        count,
        data: rows,
        ...(isPagination && {
            totalPages: Math.ceil(count / limit),
            currentPage: page,
        })
    });
};
