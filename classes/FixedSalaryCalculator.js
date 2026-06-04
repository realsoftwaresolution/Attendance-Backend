const SalaryHelper = require('./SalaryHelper');
const moment = require('moment-timezone');

class FixedSalaryCalculator {

    calculate(context) {

        const {
            setting,
            salaryRecord,
            attendanceRecords,
            month
        } = context;

        const totalSalary = Number(
            salaryRecord?.TotalSalary || 0
        );

        context.baseSalary = totalSalary;

        if (!totalSalary) {
            return context;
        }

        if (setting.SalaryCalculateOnDay) {
            this.calculateDaySalary(context);
        }

        if (setting.SalaryCalculateOnHours) {
            this.calculateHourlySalary(context);
        }

        return context;
    }

    calculateDaySalary(context) {

        const {
            setting,
            attendanceRecords,
            baseSalary,
            month
        } = context;

        let divisorDays = 0;

        if (setting.SalaryCalculateOnCalendarDay) {
            divisorDays =
                SalaryHelper.getDaysInMonth(month);
        }
        else if (
            setting.SalaryCalculateOnCalendarDayWithoutSunday
        ) {
            divisorDays =
                SalaryHelper.getMonthWorkingDays(month);
        }
        else if (
            setting.SalaryCalculateOnWorkingDay
        ) {
            divisorDays =
                Number(setting.WorkingDays || 0);
        }

        let payableDays = 0;

        for (const day of attendanceRecords) {
            payableDays += SalaryHelper.getPayableDaysForDayWiseCal(day, attendanceRecords, setting);
        }

        const perDaySalary =
            divisorDays > 0
                ? baseSalary / divisorDays
                : 0;

        const grossSalary =
            payableDays * perDaySalary;

        context.divisorDays = divisorDays;
        context.payableDays = payableDays;

        context.perDaySalary =
            SalaryHelper.roundMoney(
                perDaySalary
            );

        context.grossSalary =
            SalaryHelper.roundMoney(
                grossSalary
            );
    }

    calculateHourlySalary(context) {

        const {
            setting,
            attendanceRecords,
            baseSalary,
            month
        } = context;

        let divisorDays = 0;

        if (setting.SalaryCalculateOnCalendarDay) {
            divisorDays =
                SalaryHelper.getDaysInMonth(month);
        }
        else if (
            setting.SalaryCalculateOnCalendarDayWithoutSunday
        ) {
            divisorDays =
                SalaryHelper.getMonthWorkingDays(month);
        }
        else if (
            setting.SalaryCalculateOnWorkingDay
        ) {
            divisorDays =
                Number(setting.WorkingDays || 0);
        }

        const perDayHours = Number(setting.PerDayHours || 8);

        let expectedMinutes =
            divisorDays * perDayHours * 60;

        let actualMinutes = 0;

        for (const day of attendanceRecords) {
            const isSunday = moment(day.attendanceDate).day() === 0;
            let workedMinutes = SalaryHelper.parseHHMMToMinutes(day.FinalTotalHours);
            const standardMinutes = perDayHours * 60;


            /* ------------ 0. Prepare worked minutes by restoring deductions ----------- */

            if (setting.AllowLunchBreak) {
                workedMinutes += SalaryHelper.parseHHMMToMinutes(day.LunchBreak);
            }

            if (!setting.ApplyLateOnSalaryCalculation) {
                workedMinutes += SalaryHelper.parseHHMMToMinutes(day.LateMinutes);
                workedMinutes += SalaryHelper.parseHHMMToMinutes(day.EarlyOutMinutes);
            }

            /* --------- 1. Skip processing entirely if configured for "Absent" --------- */
            if (isSunday && setting.ApplySundayInAbsentDay) {
                continue;
            }

            /* -------------------- 2. Determine payment for the day -------------------- */
            let dailyMinutes = 0;

            if (isSunday && setting.ApplySundayAsPresentDay) {
                const shouldPaySunday = SalaryHelper.shouldPaySunday(day, attendanceRecords, setting);
                if (!shouldPaySunday) continue;
                dailyMinutes = standardMinutes;
            }
            else if (isSunday && setting.ApplySundayInOvertime) {
                dailyMinutes = workedMinutes;
            }
            else if (day.IsHoliday && setting.ApplyHolidayOnSalaryCalculation) {
                dailyMinutes = standardMinutes;
            }
            else {
                dailyMinutes = workedMinutes;
            }

            actualMinutes += dailyMinutes;
        }


        const perMinuteRate =
            expectedMinutes > 0
                ? baseSalary / expectedMinutes
                : 0;

        const grossSalary =
            actualMinutes * perMinuteRate;

        context.expectedMinutes =
            expectedMinutes;

        context.totalMinutesWorked =
            actualMinutes;

        context.perMinuteRate =
            SalaryHelper.roundRate(
                perMinuteRate
            );

        context.grossSalary =
            SalaryHelper.roundMoney(
                grossSalary
            );
    }
}

module.exports = FixedSalaryCalculator;