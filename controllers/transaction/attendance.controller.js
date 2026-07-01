const { QueryTypes, Op } = require("sequelize");
const db = require("../../config/dbConnection");
const { syncAttendanceData } = require("../../services/punchSync.service");
const { generateAndSaveDailyAttendanceSummary } = require("../../services/dailyAttendanceSummary.service");
const { calculateDepartmentSalary } = require("../../services/salaryCalculation.service");
const { getFaceDistance, isFaceMatch, getEmbeddingFromImagePath, getEmbeddingFromBuffer } = require("../../utils/face.utils");
const fs = require('fs');

exports.getPunchLogs = async (req, res, next) => {
    const {
        EmpCode,
        DepartmentMstId,
        CompanyMstId,
        FromDate,
        ToDate
    } = req.query;

    /* ---------------------- DEFAULT CURRENT MONTH ---------------------- */

    let fromDate = FromDate;
    let toDate = ToDate;

    if (!fromDate || !toDate) {

        const today = new Date();

        // First day of current month
        fromDate = new Date(
            today.getFullYear(),
            today.getMonth(),
            1
        ).toISOString().split("T")[0];

        // Last day of current month
        toDate = new Date(
            today.getFullYear(),
            today.getMonth() + 1,
            0
        ).toISOString().split("T")[0];
    }

    /* ---------------------------- FILTERS ----------------------------- */

    let whereClause = `WHERE 1=1`;

    const replacements = {
        FromDate: fromDate,
        ToDate: toDate
    };

    if (EmpCode) {
        whereClause += ` AND P.EmpCode = :EmpCode`;
        replacements.EmpCode = EmpCode;
    }

    if (DepartmentMstId) {
        whereClause += ` AND E.DepartmentMstId = :DepartmentMstId`;
        replacements.DepartmentMstId = DepartmentMstId;
    }

    if (CompanyMstId) {
        whereClause += ` AND E.CompanyMstId = :CompanyMstId`;
        replacements.CompanyMstId = CompanyMstId;
    }

    // Always date filter
    whereClause += `
            AND CAST(P.punchTime AS DATE)
            BETWEEN :FromDate AND :ToDate
        `;

    /* ------------------------------ QUERY ----------------------------- */

    const rawData = await db.sequelize.query(`
        SELECT
            P.id,
            P.EmpCode,
            P.SyncTrackerId,
            E.EmpMstId,
            E.EmpFullName,
            D.Department,
            DG.Designation,
            CAST(P.punchTime AS DATE) AS AttendanceDate,
            CONVERT(VARCHAR(8), P.punchTime, 108) AS PunchTime,
            P.punchType,
            P.punchSource
        FROM PunchLogs P
        INNER JOIN EmployeeMst E ON P.EmpCode = E.EmpCode
        LEFT JOIN DepartmentMst D ON E.DepartmentMstId = D.DepartmentMstId
        LEFT JOIN DesignationMst DG ON E.DesignationMstId = DG.DesignationMstId
        ${whereClause}
        ORDER BY AttendanceDate DESC, P.EmpCode ASC, P.punchTime ASC
    `, { replacements, type: QueryTypes.SELECT });

    /* ----------------------- GROUP TRANSFORM -------------------------- */

    const groupedMap = {};

    for (const row of rawData) {
        const key = `${row.EmpMstId}_${row.AttendanceDate}`;

        if (!groupedMap[key]) {
            groupedMap[key] = {
                EmpMstId: row.EmpMstId,
                empCode: row.EmpCode,
                empName: row.EmpFullName,
                department: row.Department,
                designation: row.Designation,
                attendanceDate: row.AttendanceDate,
                punches: []
            };
        }

        const current = groupedMap[key];

        if (row.punchType === "IN") {
            // Create a new session for every IN
            current.punches.push({
                inSyncTrackerId: row.SyncTrackerId,
                inPunchId: row.id,
                in: row.PunchTime,
                outPunchId: null,
                out: null,
                source: row.punchSource
            });
        } else if (row.punchType === "OUT") {
            // Find the most recent IN that doesn't have an OUT yet
            const openSession = current.punches.find(p => p.in && !p.out);

            if (openSession) {
                // Pair the OUT with the open IN
                openSession.outSyncTrackerId = row.SyncTrackerId;
                openSession.outPunchId = row.id;
                openSession.out = row.PunchTime;
            } else {
                // No IN found? Add as an orphan OUT
                current.punches.push({
                    inPunchId: null,
                    in: null,
                    outPunchId: row.id,
                    outSyncTrackerId: row.SyncTrackerId,
                    out: row.PunchTime,
                    source: row.punchSource
                });
            }
        }
    }

    const groupedData = Object.values(groupedMap);

    return res.status(200).json({
        success: true,
        message: "Punch logs fetched successfully.",
        filter: {
            fromDate,
            toDate
        },
        data: groupedData
    });

};

exports.updatePunchDay = async (req, res) => {
    const { empCode: EmpCode, attendanceDate, punches } = req.body;
    const transaction = req.transaction;

    /* ---------------- VALIDATION ---------------- */

    if (!EmpCode || !attendanceDate || !Array.isArray(punches)) {
        throw new Error("EmpCode, attendanceDate, and punches array are required.");
    }

    /* ---------------- EXISTING PUNCHES ---------------- */

    const startDate = `${attendanceDate} 00:00:00 +05:30`;
    const endDate = `${attendanceDate} 23:59:59 +05:30`;

    const existingPunches = await db.PunchLogs.findAll({
        where: {
            EmpCode,
            punchTime: { [Op.between]: [startDate, endDate] }
        },
        transaction
    });

    const existingIds = existingPunches.map(x => x.id);
    const incomingIds = [];

    /* ---------------- PROCESS PUNCHES ---------------- */

    for (const punch of punches) {
        const source = punch.source || "MANUAL";

        /* ---------------- IN ---------------- */

        if (punch.in) {
            const inDateTime = `${attendanceDate} ${punch.in}:00 +05:30`;

            if (punch.inPunchId) {
                incomingIds.push(punch.inPunchId);
                await db.PunchLogs.update(
                    { punchTime: inDateTime, punchSource: source },
                    { where: { id: punch.inPunchId }, transaction }
                );
            } else {
                const created = await db.PunchLogs.create({
                    EmpCode,
                    SyncTrackerId: punch.inSyncTrackerId,
                    punchTime: inDateTime,
                    punchType: "IN",
                    punchSource: source
                }, { transaction });
                incomingIds.push(created.id);
            }
        }

        /* ---------------- OUT ---------------- */
        if (punch.out) {
            const outDateTime = `${attendanceDate} ${punch.out}:00 +05:30`;

            if (punch.outPunchId) {
                incomingIds.push(punch.outPunchId);
                await db.PunchLogs.update(
                    { punchTime: outDateTime, punchSource: source },
                    { where: { id: punch.outPunchId }, transaction }
                );
            } else {
                const created = await db.PunchLogs.create({
                    EmpCode,
                    SyncTrackerId: punch.outSyncTrackerId,
                    punchTime: outDateTime,
                    punchType: "OUT",
                    punchSource: source
                }, { transaction });
                incomingIds.push(created.id);
            }
        }
    }

    /* ---------------- DELETE REMOVED ---------------- */


    const deleteIds = existingIds.filter(x => !incomingIds.includes(x));

    if (deleteIds.length > 0) {
        await db.PunchLogs.destroy({
            where: { id: deleteIds },
            transaction
        });
    }

    /* ---------------- RESPONSE ---------------- */

    return res.status(200).json({
        success: true,
        message: "Punches updated successfully"
    });
};

exports.syncPunchNow = async (req, res, next) => {

    const result = await syncAttendanceData();

    return res.json({
        success: true,
        message: "Punch sync completed",
        data: result
    });

};

exports.addFacePunch = async (req, res) => {
    const { datetime } = req.body;
    const transaction = req.transaction;

    /* ---------------- VALIDATION ---------------- */
    if (!datetime) {
        throw new Error("datetime is required.");
    }

    let punchImageBuffer = null;
    let punchImagePath = null;

    if (req.files && req.files.punchImage && req.files.punchImage.length > 0) {
        punchImageBuffer = req.files.punchImage[0].buffer;
        punchImagePath = req.files.punchImage[0].path; // Depending on multer config, it might be on disk
    } else if (req.file) {
        punchImageBuffer = req.file.buffer;
        punchImagePath = req.file.path;
    }

    if (!punchImageBuffer && !punchImagePath) {
        throw new Error("punchImage is required. Please upload an image file.");
    }

    /* ---------------- 1. EXTRACT INCOMING EMBEDDING ---------------- */
    // If multer is configured to store in memory (req.file.buffer exists), use getEmbeddingFromBuffer.
    // If it stores to disk, use getEmbeddingFromImagePath.
    let incomingEmbedding = null;
    if (punchImageBuffer) {
        incomingEmbedding = await getEmbeddingFromBuffer(punchImageBuffer);
    } else {
        incomingEmbedding = await getEmbeddingFromImagePath(punchImagePath);
    }

    if (!incomingEmbedding) {
        // Clean up temp file if saved to disk
        if (punchImagePath && fs.existsSync(punchImagePath)) fs.unlinkSync(punchImagePath);
        throw new Error("Could not detect a face in the uploaded image.");
    }

    /* ---------------- 2. FETCH EMPLOYEES ---------------- */
    const employees = await db.EmployeeMst.findAll({
        where: { Active: true, BiometricVector: { [Op.ne]: null } },
        attributes: ['EmpMstId', 'EmpCode', 'EmpFullName', 'BiometricVector']
    });

    if (!employees || employees.length === 0) {
        if (punchImagePath && fs.existsSync(punchImagePath)) fs.unlinkSync(punchImagePath);
        throw new Error("No eligible employees with registered biometric images found.");
    }

    /* ---------------- 3. FACE MATCHING ---------------- */
    let matchedEmployee = null;
    let bestDistance = Infinity;

    for (const emp of employees) {
        if (!emp.BiometricVector) continue;
        
        let storedEmbedding;
        try {
            storedEmbedding = JSON.parse(emp.BiometricVector);
            if (!Array.isArray(storedEmbedding) && !(storedEmbedding instanceof Float32Array)) {
                storedEmbedding = Object.values(storedEmbedding);
            }
        } catch (e) {
            continue; // Corrupt stored JSON
        }

        const distance = getFaceDistance(incomingEmbedding, storedEmbedding);
        if (distance < bestDistance) {
            bestDistance = distance;
            matchedEmployee = emp;
        }
    }

    // Clean up temporary punch image
    if (punchImagePath && fs.existsSync(punchImagePath)) {
        fs.unlinkSync(punchImagePath);
    }

    // Threshold of 0.55 is generally a good balance for face-api.js
    if (!matchedEmployee || !isFaceMatch(bestDistance, 0.55)) { 
        return res.status(401).json({
            success: false,
            message: "Face not recognized or no match found"
        });
    }

    /* ---------------- 3. DETERMINE IN / OUT ---------------- */
    const targetEmpCode = matchedEmployee.EmpCode;
    // Use the native Date object directly
    const punchDate = new Date(datetime);
    if (isNaN(punchDate.getTime())) {
        throw new Error("Invalid datetime format provided.");
    }

    // Calculate start and end of day strictly using Date manipulation
    const startDate = new Date(punchDate);
    startDate.setUTCHours(0, 0, 0, 0);

    const endDate = new Date(punchDate);
    endDate.setUTCHours(23, 59, 59, 999);

    const existingPunches = await db.PunchLogs.findAll({
        where: {
            EmpCode: targetEmpCode,
            punchTime: { [Op.between]: [startDate, endDate] }
        },
        order: [['punchTime', 'ASC']],
        transaction
    });

    // If count is even (0, 2, 4...) -> IN, if odd (1, 3, 5...) -> OUT
    const nextPunchType = (existingPunches.length % 2 === 0) ? "IN" : "OUT";
    
    const newPunchTime = punchDate; 

    /* ---------------- 4. INSERT PUNCH LOG ---------------- */
    const newPunch = await db.PunchLogs.create({
        EmpCode: targetEmpCode,
        SyncTrackerId: 1, // Default 1 as per requirement
        punchTime: newPunchTime,
        punchType: nextPunchType,
        punchSource: "FACE_BIOMETRIC" // Stored as BIOMETRIC for face punches
    }, { transaction });

    return res.status(200).json({
        success: true,
        message: `Attendance marked successfully. Punch ${nextPunchType} for ${matchedEmployee.EmpFullName}.`,
        data: {
            punchType: nextPunchType,
            punchTime: newPunchTime,
            employee: matchedEmployee.EmpFullName,
            empCode: matchedEmployee.EmpCode
        }
    });
};

exports.manualCalculate = async (req, res, next) => {
    const { month, departmentId } = req.query;

    if (!month || !departmentId) {
        return res.status(400).json({
            success: false,
            message: "month and departmentId query parameters are required"
        });
    }

    try {
        const result = await generateAndSaveDailyAttendanceSummary({ month, departmentId });
        
        return res.status(200).json({
            success: true,
            message: "Attendance manually calculated and saved successfully.",
            data: result
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to calculate attendance manually",
        });
    }
};