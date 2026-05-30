const cron = require("node-cron");

const {
    syncAttendanceData
} = require(
    "../services/punchSync.service"
);

function startPunchSyncJob() {

    // every hour
    cron.schedule(
        "0 * * * *",
        async () => {

            console.log("[CRON_SYNC_STARTED]");

            try {
                await syncAttendanceData();
                console.log("[CRON_SYNC_FINISHED]");
            }
            catch (err) {
                console.log("[CRON_SYNC_FAILED]", err.message);
            }
        }
    );
}

module.exports = {
    startPunchSyncJob
};