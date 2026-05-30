const { startPunchSyncJob } = require("./punchSync.job");
const { scheduleSalaryJob } = require("./salaryCalc.job");

const initAllJobs = () => {
    console.log('[JOBS] Initializing all schedulers...');

    scheduleSalaryJob();
    startPunchSyncJob()
};

module.exports = initAllJobs;