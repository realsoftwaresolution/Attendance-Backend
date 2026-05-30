const { QueryTypes, Op } = require("sequelize");
const db = require("../../config/dbConnection");
const { syncAttendanceData } = require("../../services/punchSync.service");
const { payRollCalAndSaveSummary } = require("../../services/payrollCalculation.service");

exports.getPunchLogs = async (req, res, next) => {
    const {
        EmpMstId,
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

    if (EmpMstId) {
        whereClause += ` AND P.EmpMstId = :EmpMstId`;
        replacements.EmpMstId = EmpMstId;
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
                P.EmpMstId,

                E.EmpCode,
                E.EmpFullName,

                D.Department,

                DG.Designation,

                CAST(P.punchTime AS DATE) AS AttendanceDate,
                CONVERT(VARCHAR(8), P.punchTime, 108) AS PunchTime,

                P.punchType,
                P.punchSource

            FROM PunchLogs P

            INNER JOIN EmployeeMst E
                ON P.EmpMstId = E.EmpMstId

            LEFT JOIN DepartmentMst D
                ON E.DepartmentMstId = D.DepartmentMstId

            LEFT JOIN DesignationMst DG
                ON E.DesignationMstId = DG.DesignationMstId

            ${whereClause}

            ORDER BY
                AttendanceDate DESC,
                P.EmpMstId ASC,
                P.punchTime ASC

        `, {
        replacements,
        type: QueryTypes.SELECT
    });

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
                punches: [],
                totalPunches: 0
            };
        }

        const current = groupedMap[key];

        if (row.punchType === "IN") {

            current.punches.push({
                inPunchId: row.id,
                in: row.PunchTime,
                outPunchId: null,
                out: null,
                source: row.punchSource
            });

        } else {

            const lastPunch =
                current.punches[current.punches.length - 1];

            if (
                lastPunch &&
                !lastPunch.out
            ) {

                lastPunch.out = row.PunchTime;
                lastPunch.outPunchId = row.id;

            } else {

                current.punches.push({

                    inPunchId: null,
                    in: null,

                    outPunchId: row.id,
                    out: row.PunchTime,

                    source: row.punchSource
                });
            }
        }

        current.totalPunches++;
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

    const {
        EmpMstId,
        attendanceDate,
        punches
    } = req.body;

    const transaction = req.transaction;

    /* ---------------- VALIDATION ---------------- */

    if (!EmpMstId)
        throw new Error("EmpMstId required");

    if (!attendanceDate)
        throw new Error("attendanceDate required");

    if (!Array.isArray(punches))
        throw new Error("punches must be array");


    /* ---------------- EXISTING PUNCHES ---------------- */

    const startDate =
        `${attendanceDate} 00:00:00 +05:30`;

    const endDate =
        `${attendanceDate} 23:59:59 +05:30`;

    const existingPunches =
        await db.PunchLogs.findAll({

            where: {

                EmpMstId,

                punchTime: {
                    [Op.between]: [
                        startDate,
                        endDate
                    ]
                }
            },

            transaction
        });

    const existingIds =
        existingPunches.map(x => x.id);

    const incomingIds = [];


    /* ---------------- PROCESS PUNCHES ---------------- */

    for (const punch of punches) {

        const source =
            punch.source || "MANUAL";


        /* ---------------- IN ---------------- */

        if (punch.in) {

            // datetimeoffset format
            const inDateTime =
                `${attendanceDate} ${punch.in}:00 +05:30`;

            if (punch.inPunchId) {

                incomingIds.push(
                    punch.inPunchId
                );

                await db.PunchLogs.update({

                    punchTime: inDateTime,
                    punchSource: source

                }, {
                    where: {
                        id: punch.inPunchId
                    },
                    transaction
                });

            } else {

                const created =
                    await db.PunchLogs.create({

                        EmpMstId,
                        punchTime: inDateTime,
                        punchType: "IN",
                        punchSource: source

                    }, {
                        transaction
                    });

                incomingIds.push(
                    created.id
                );
            }
        }


        /* ---------------- OUT ---------------- */

        if (punch.out) {

            const outDateTime =
                `${attendanceDate} ${punch.out}:00 +05:30`;

            if (punch.outPunchId) {

                incomingIds.push(
                    punch.outPunchId
                );

                await db.PunchLogs.update({

                    punchTime: outDateTime,
                    punchSource: source

                }, {
                    where: {
                        id: punch.outPunchId
                    },
                    transaction
                });

            } else {

                const created =
                    await db.PunchLogs.create({

                        EmpMstId,
                        punchTime: outDateTime,
                        punchType: "OUT",
                        punchSource: source

                    }, {
                        transaction
                    });

                incomingIds.push(
                    created.id
                );
            }
        }
    }


    /* ---------------- DELETE REMOVED ---------------- */

    const deleteIds =
        existingIds.filter(
            x => !incomingIds.includes(x)
        );

    if (deleteIds.length > 0) {

        await db.PunchLogs.destroy({

            where: {
                id: deleteIds
            },

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

    await payRollCalAndSaveSummary({ departmentId, month });

    res.json({
        success: true,
        message: `Summary calculation completed for department ${departmentId} for ${month}`
    });
}