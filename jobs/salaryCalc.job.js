const cron = require('node-cron');
const { payRollCalAndSaveSummary } = require('../services/payrollCalculation.service');
const db = require('../config/dbConnection');
const moment = require('moment-timezone');

const scheduleSalaryJob = () => {
    // Everyday at 10:00 PM
    cron.schedule('0 22 * * *', async () => {
        try {
            console.log('Starting Daily Salary Calculation for all departments......');

            // 1. Fetch all active departments
            const departments = await db.DepartmentMst.findAll({
                where: { Active: true },
                attributes: ['DepartmentMstId']
            });

            // 2.  Set yesterday's date
            const yesterday = moment().subtract(1, 'days').format('YYYY-MM-DD');
            // const yesterday = '2026-06-01';

            // 3. Process in batches to prevent database bottlenecks
            const BATCH_SIZE = 3;
            for (let i = 0; i < departments.length; i += BATCH_SIZE) {
                const batch = departments.slice(i, i + BATCH_SIZE);

                await Promise.all(batch.map(async (dept) => {
                    try {
                       const result= await payRollCalAndSaveSummary({
                            departmentId: dept.DepartmentMstId,
                            date: yesterday
                        });
                       console.log(`Department ${dept.DepartmentMstId} processed successfully. Records saved: ${result.savedCount}`);
                    } catch (deptErr) {
                        console.log(`[JOB ERROR] Dept ${dept.DepartmentMstId}:`, deptErr.message);
                    }
                }));
            }

            console.log('Salary Calculation Completed Successfully');
        } catch (err) {
            console.log('[CRON FATAL ERROR]:', err);
        }
    }, {
        scheduled: true,
        timezone: "Asia/Kolkata"
    });
};

module.exports = { scheduleSalaryJob }