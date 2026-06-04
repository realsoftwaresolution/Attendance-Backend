const { Op } = require("sequelize");
const AttendanceEngine = require("../classes/AttendanceEngine");
const { AppError } = require("../utils/AppError");
const db = require("../config/dbConnection");
const { generateDailyAttendanceData } = require("./hoursCalculation.service");

async function generateAndSaveDailyAttendanceSummary(filters) {
    const { dailyRecords } = await generateDailyAttendanceData(filters);
    return saveDailyAttendanceSummary(dailyRecords);
}

async function saveDailyAttendanceSummary(records) {
    const CHUNK_SIZE = 50;
    const chunks = [];

    // 1. Divide records into chunks smoothly
    for (let i = 0; i < records.length; i += CHUNK_SIZE) {
        chunks.push(records.slice(i, i + CHUNK_SIZE));
    }

    // 2. Process chunks in parallel
    await Promise.all(chunks.map(async (chunk) => {
        const t = await db.sequelize.transaction();

        try {
            for (const r of chunk) {
                await db.DailyAttendanceSummary.upsert({
                    ...r,
                    attendanceDate: r.Date
                }, {
                    transaction: t,
                    conflictFields: ['EmpMstId', 'attendanceDate']
                });
            }
            await t.commit();
        } catch (error) {
            await t.rollback();
            throw error;
        }
    }));

    return { success: true, savedCount: records.length, records };
}

module.exports = { generateAndSaveDailyAttendanceSummary };