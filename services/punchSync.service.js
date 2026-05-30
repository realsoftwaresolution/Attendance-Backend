const db = require("../config/dbConnection");
const { Op } = require("sequelize");
const { requestLocalPC } = require("../socket");

async function syncAttendanceData() {
    const transaction = await db.sequelize.transaction();

    try {
        const tracker = await db.SyncTracker.findOne({
            where: { SyncName: "ManishbhaiDB" },
            lock: true,
            transaction
        });

        const lastAutoId = tracker?.LastAutoId || 0;
        console.log("[SYNC_START]", { trackerId: tracker.SyncTrackerId, lastAutoId });

        const response = await requestLocalPC("getPunchData", { lastAutoId });
        const rows = response.rows || [];
        console.log("[SOCKET_RESPONSE]", { rows: rows.length, latestAutoId: response.latestAutoId });

        if (!rows.length) {
            console.log("[NO_NEW_RECORDS]");
            await transaction.commit();
            return { inserted: 0 };
        }

        const punchRows = [];
        rows.forEach(row => {
            if (row.In_Time) {
                punchRows.push({
                    EmpCode: row.Emp_ID,
                    SyncTrackerId: tracker.SyncTrackerId,
                    punchTime: row.In_Time,
                    punchType: "IN",
                    punchSource: "ManishbhaiDB"
                });
            }
            if (row.Out_Time) {
                punchRows.push({
                    EmpCode: row.Emp_ID,
                    SyncTrackerId: tracker.SyncTrackerId,
                    punchTime: row.Out_Time,
                    punchType: "OUT",
                    punchSource: "ManishbhaiDB"
                });
            }
        });

        console.log("[PUNCH_ROWS]", punchRows.length);

        const batchSize = 500;
        let totalInserted = 0;

        for (let i = 0; i < punchRows.length; i += batchSize) {
            const batch = punchRows.slice(i, i + batchSize);

            const existing = await db.PunchLogs.findAll({
                attributes: ["EmpCode", "SyncTrackerId", "punchTime", "punchType"],
                where: {
                    [Op.or]: batch.map(x => ({
                        EmpCode: x.EmpCode,
                        SyncTrackerId: x.SyncTrackerId,
                        punchTime: x.punchTime,
                        punchType: x.punchType
                    }))
                },
                transaction,
                raw: true
            });

            const existingSet = new Set(
                existing.map(x => `${x.EmpCode}_${x.SyncTrackerId}_${new Date(x.punchTime).getTime()}_${x.punchType}`)
            );

            const insertRows = batch.filter(
                x => !existingSet.has(`${x.EmpCode}_${x.SyncTrackerId}_${new Date(x.punchTime).getTime()}_${x.punchType}`)
            );

            if (insertRows.length) {
                const placeholders = insertRows.map(() => "(?,?,?,?,?)").join(",");
                const replacements = insertRows.flatMap(x => [
                    x.SyncTrackerId,
                    x.EmpCode,
                    x.punchTime,
                    x.punchType,
                    x.punchSource
                ]);

                await db.sequelize.query(
                    `INSERT INTO PunchLogs (SyncTrackerId, EmpCode, punchTime, punchType, punchSource) VALUES ${placeholders}`,
                    {
                        replacements,
                        type: db.Sequelize.QueryTypes.INSERT,
                        transaction
                    }
                );

                totalInserted += insertRows.length;
            }

            console.log("[BATCH_INSERTED]", insertRows.length);
        }

        await tracker.update({
            LastAutoId: response.latestAutoId,
            LastSyncTime: new Date()
        }, { transaction });

        await transaction.commit();
        console.log("[SYNC_DONE]", { inserted: totalInserted, latestAutoId: response.latestAutoId });

        return {
            inserted: totalInserted,
            latestAutoId: response.latestAutoId
        };

    } catch (err) {
        await transaction.rollback();
        console.log("[SYNC_ERROR]", err.message);
        throw err;
    }
}

module.exports = { syncAttendanceData };