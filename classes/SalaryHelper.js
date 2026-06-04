const moment = require('moment-timezone');

class SalaryHelper {
    static TIMEZONE = 'Asia/Kolkata';

    /* ----------------------------- Time Conversion ---------------------------- */

    static parseHHMMToMinutes(hhmm) {
        if (!hhmm || hhmm === '00:00') return 0;
        const [hours = 0, minutes = 0] = hhmm.split(':').map(Number);
        return (hours * 60) + minutes;
    }

    static minutesToHHMM(totalMinutes) {
        if (!totalMinutes || totalMinutes <= 0) return '00:00';

        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }

    static parseTime(dateStr, timeStr, fieldName = 'Time Field') {
        if (!timeStr) return null;

        const cleanTimeStr = this.normalizeTimeToZone(timeStr, fieldName);
        const parsed = moment.tz(
            `${dateStr} ${cleanTimeStr}`,
            'YYYY-MM-DD HH:mm:ss',
            this.TIMEZONE
        );

        return parsed;
    }

    /* -------------------------- Financial Formatting -------------------------- */

    static roundMoney(value) {
        return Math.round((parseFloat(value) || 0) * 100) / 100;
    }

    static roundRate(value) {
        return Math.round((parseFloat(value) || 0) * 10000) / 10000;
    }

    /* ------------------------ Date & Time Normalization ----------------------- */

    static normalizeTimeToZone(timeInput) {
        if (!timeInput) return null;

        // If Date object, convert directly
        if (timeInput instanceof Date) {
            return new Intl.DateTimeFormat('en-GB', {
                timeZone: this.TIMEZONE,
                hour: '2-digit', minute: '2-digit', second: '2-digit',
                hour12: false
            }).format(timeInput);
        }

        // Handle string inputs (ISO or space-delimited)
        const inputStr = String(timeInput).trim();
        if (inputStr.includes('T')) return inputStr.split('T')[1].substring(0, 8);
        if (inputStr.includes(' ')) return inputStr.split(/\s+/)[1].substring(0, 8);

        return inputStr;
    }

    /* -------------------------- Payroll Calculations -------------------------- */

    static getDaysInMonth(monthStr) {
        const [year, month] = monthStr.split('-').map(Number);
        return new Date(year, month, 0).getDate();
    }

    static getSundayCount(monthStr) {
        const [year, month] = monthStr.split('-').map(Number);
        let count = 0;
        const days = new Date(year, month, 0).getDate();

        for (let i = 1; i <= days; i++) {
            if (new Date(year, month - 1, i).getDay() === 0) count++;
        }
        return count;
    }

    static getMonthWorkingDays(monthStr) {
        return this.getDaysInMonth(monthStr) - this.getSundayCount(monthStr);
    }

    static isAbsentLikeStatus(status) {
        return ['Absent', 'Invalid Log'].includes(status);
    }

    static getPayableDaysForDayWiseCal(day, attendanceRecords, setting) {

        /* --------------------------- 1. Sunday Handling --------------------------- */

        const isSunday = moment(day.attendanceDate).day() === 0;

        // Sunday as Present
        if (isSunday && setting.ApplySundayAsPresentDay) {
            return this.shouldPaySunday(
                day,
                attendanceRecords,
                setting
            )
                ? 1
                : 0;
        }

        // Sunday as Absent
        if (isSunday && setting.ApplySundayInAbsentDay) {
            return 0;
        }

        // Sunday as Overtime
        if (isSunday && setting.ApplySundayInOvertime) {
            return 1;
        }

        /* --------------------------- 2. Handle Holidays --------------------------- */
        if (day.IsHoliday) {
            return setting.ApplyHolidayOnSalaryCalculation ? 1 : 0;
        }

        // 3. Handle Absent/Invalid
        if (['Absent', 'Invalid Log'].includes(day.Status)) {
            return 0;
        }

        // 4. Handle Half Days
        if (day.Status === 'Half Day') {
            return setting.ApplyHalfDayOnSalaryCalculation ? 0.5 : 1;
        }

        // 5. Default (Present/Other)
        return 1;
    }

    static shouldPaySunday(day, attendanceRecords, setting) {

        if (!setting.ApplySundayAsPresentDay) {
            return false;
        }

        const currentDate = moment(day.attendanceDate);

        const previousDay = attendanceRecords.find(x =>
            moment(x.attendanceDate).isSame(
                currentDate.clone().subtract(1, 'day'),
                'day'
            )
        );

        const nextDay = attendanceRecords.find(x =>
            moment(x.attendanceDate).isSame(
                currentDate.clone().add(1, 'day'),
                'day'
            )
        );

        const prevAbsent =
            previousDay
                ? this.isAbsentLikeStatus(previousDay.Status)
                : false;

        const nextAbsent =
            nextDay
                ? this.isAbsentLikeStatus(nextDay.Status)
                : false;

        if (
            setting.MarkSundayAbsentIfBothDaysAbsent &&
            prevAbsent &&
            nextAbsent
        ) {
            return false;
        }

        if (
            setting.MarkSundayAbsentIfPreviousDayAbsent &&
            prevAbsent
        ) {
            return false;
        }

        if (
            setting.MarkSundayAbsentIfNextDayAbsent &&
            nextAbsent
        ) {
            return false;
        }

        return true;
    }
}

module.exports = SalaryHelper;