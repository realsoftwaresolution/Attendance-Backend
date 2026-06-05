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

    /* --------------------------- Audit metrix update -------------------------- */
    static updateSundayAudit(day, context, setting) {

        if (!day.isSunday) {
            return;
        }

        const isPaidSunday =
            this.shouldPaySunday(
                day,
                context.attendanceMap,
                setting
            );

        if (setting.ApplySundayInOvertime) {

            if (
                this.parseHHMMToMinutes(day.FinalTotalHours) > 0
            ) {
                context.paidSundayCount++;
            } else {
                context.unpaidSundayCount++;
            }

            return;
        }

        if (isPaidSunday) {
            context.paidSundayCount++;
        } else {
            context.unpaidSundayCount++;
        }
    }

    static updateHolidayAudit(day, context, setting) {

        if (!day.IsHoliday) {
            return;
        }

        if (setting.ApplyHolidayOnSalaryCalculation) {
            context.paidHolidayCount++;
        } else {
            context.unpaidHolidayCount++;
        }
    }

    /* ---------------------------- attendance metrix --------------------------- */
    static updateAttendanceAudit(day, context, setting) {
        const status = this.getAttendanceStatus(day, context, setting);

        switch (status) {
            case 'PRESENT':
                context.totalPresentDays++;
                if (!day.isSunday && !day.IsHoliday) {
                    context.totalNormalPresentDays++;
                }
                break;
            case 'ABSENT': context.totalAbsentDays += 1; break;
            case 'HALF': context.totalHalfDays += 1; break;
        }
    }

    static getAttendanceStatus(day, context, setting) {
        // 1. Sunday Handling
        if (day.isSunday) {
            if (setting.ApplySundayInAbsentDay) return 'ABSENT';
            if (setting.ApplySundayAsPresentDay) {
                return this.shouldPaySunday(day, context.attendanceMap, setting) ? 'PRESENT' : 'ABSENT';
            }
            return null; // Sunday Overtime or ignored
        }

        // 2. Holiday Handling
        if (day.IsHoliday) {
            return setting.ApplyHolidayOnSalaryCalculation ? 'PRESENT' : 'ABSENT';
        }

        // 3. Absenteeism Handling
        const isAbsent = ['Absent', 'Invalid Log'].includes(day.Status);
        if (isAbsent) return 'ABSENT';

        // 4. Half-Day Handling
        if (day.Status === 'Half Day') {
            return setting.ApplyHalfDayOnSalaryCalculation ? 'HALF' : 'PRESENT';
        }

        // 5. Default: Present
        return 'PRESENT';
    }

    static isAbsentLikeStatus(status) {
        return status === 'Absent' || status === 'Invalid Log';
    }

    static getPayableDaysForDayWiseCal(day, attendanceMap, setting) {

        /* --------------------------- 1. Sunday Handling --------------------------- */

        const isSunday = day.isSunday;

        // Sunday as Present
        if (isSunday && setting.ApplySundayAsPresentDay) {
            return this.shouldPaySunday(day, attendanceMap, setting) ? 1 : 0;
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

    static shouldPaySunday(day, attendanceMap, setting) {
        // 1. Guard Clause: Policy check
        if (!setting.ApplySundayAsPresentDay) return false;

        // 2. Cache check: Return memoized result if already computed
        if (day.isPaidSunday !== undefined) return day.isPaidSunday;

        // 3. Status retrieval
        const prevStatus = attendanceMap.get(day.prevDateKey)?.Status;
        const nextStatus = attendanceMap.get(day.nextDateKey)?.Status;

        const prevAbsent = this.isAbsentLikeStatus(prevStatus);
        const nextAbsent = this.isAbsentLikeStatus(nextStatus);

        // 4. Rule Evaluation
        const isDisqualified =
            (setting.MarkSundayAbsentIfBothDaysAbsent && prevAbsent && nextAbsent) ||
            (setting.MarkSundayAbsentIfPreviousDayAbsent && prevAbsent) ||
            (setting.MarkSundayAbsentIfNextDayAbsent && nextAbsent);

        // 5. Cache and return
        day.isPaidSunday = !isDisqualified;
        return day.isPaidSunday;
    }

    static getSalaryDivisor(setting, month) {
        if (setting.SalaryCalculateOnCalendarDay) {
            return this.getDaysInMonth(month);
        }
        if (setting.SalaryCalculateOnCalendarDayWithoutSunday) {
            return this.getMonthWorkingDays(month);
        }
        if (setting.SalaryCalculateOnWorkingDay) {
            return Number(setting.WorkingDays || 0);
        }
        return 0;
    }
}

module.exports = SalaryHelper;