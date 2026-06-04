const { QueryTypes, Op } = require("sequelize");
const db = require("../../config/dbConnection");
const { syncAttendanceData } = require("../../services/punchSync.service");
const { generateAndSaveDailyAttendanceSummary } = require("../../services/dailyAttendanceSummary.service");
const { calculateDepartmentSalary } = require("../../services/salaryCalculation.service");

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

exports.manualCalculateDailySummary = async (req, res, next) => {
    const { departmentId, month } = req.query;

    if (!departmentId || !month) {
        return res.status(400).json({ success: false, message: "DepartmentId and month are required." });
    }

   const result = await calculateDepartmentSalary({ departmentId, month });

    res.json({
        success: true,
        message: `Summary calculation completed for department ${departmentId} for ${month}`,
        result
    });
}