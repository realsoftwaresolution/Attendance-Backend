const cron = require('node-cron');
const moment = require('moment-timezone');
const db = require('../config/dbConnection');
const { generateAndSaveDailyAttendanceSummary } = require('../services/dailyAttendanceSummary.service');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const scheduleDailyAttendanceSummaryJob = () => {
    // Runs every day at 10:00 PM IST '0 22 * * *'
    cron.schedule('0 22 * * *', async () => {
        try {
            console.log('Starting Daily Attendance Summary Generation...');

            const departments = await db.DepartmentMst.findAll({
                where: { Active: true },
                attributes: ['DepartmentMstId']
            });

            const yesterday = moment().subtract(1, 'days').format('YYYY-MM-DD');
            const BATCH_SIZE = 3;
            const totalBatches = Math.ceil(departments.length / BATCH_SIZE);

            for (let i = 0; i < departments.length; i += BATCH_SIZE) {
                const batch = departments.slice(i, i + BATCH_SIZE);
                const currentBatchNum = Math.floor(i / BATCH_SIZE) + 1;
                
                console.log(`Processing batch ${currentBatchNum} of ${totalBatches}`);

                await Promise.all(batch.map(async (dept) => {
                    try {
                        const result = await generateAndSaveDailyAttendanceSummary({
                            departmentId: dept.DepartmentMstId,
                            date: yesterday
                        });
                        console.log(`Dept ${dept.DepartmentMstId} done. Records saved: ${result.savedCount} for ${yesterday}`);
                    } catch (deptErr) {
                        console.error(`[JOB ERROR] Dept ${dept.DepartmentMstId}:`, deptErr.message);
                    }
                }));

                // Wait 5 seconds between batches if it's not the final batch
                if (currentBatchNum < totalBatches) {
                    console.log('Batch completed. Waiting 10 seconds before next batch...');
                    await sleep(10000);
                }
            }

            console.log('Daily Attendance Summary Generation Completed Successfully');
        } catch (err) {
            console.error('[CRON FATAL ERROR]:', err);
        }
    }, {
        scheduled: true,
        timezone: 'Asia/Kolkata'
    });
};



module.exports = { scheduleDailyAttendanceSummaryJob };