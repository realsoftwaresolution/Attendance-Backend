const { startPunchSyncJob } = require("./punchSync.job");
const { scheduleDailyAttendanceSummaryJob } = require("./scheduleDailyAttendanceSummary.job");

const initAllJobs = () => {
    console.log('✔ Initializing all schedulers...');

    scheduleDailyAttendanceSummaryJob();
    startPunchSyncJob()
};

module.exports = initAllJobs;