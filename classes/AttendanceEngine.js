const moment = require('moment-timezone');

class AttendanceEngine {

    static TIMEZONE = 'Asia/Kolkata';

    static parseHHMMToMinutes(hhmm) {
        if (!hhmm || hhmm === "00:00") return 0;
        const [h, m] = hhmm.split(':').map(Number);
        return (h * 60) + (m || 0);
    };

    static normalizeTimeToZone(timeInput, fieldName = 'Unknown Field') {
        if (!timeInput) return null;

        if (timeInput instanceof Date) {
            const formatted = moment.tz(timeInput, this.TIMEZONE).format('HH:mm:ss');
            console.log('[NORMALIZE_DATE_OBJ]', { fieldName, input: timeInput, output: formatted });
            return formatted;
        }

        const inputStr = String(timeInput);

        if (inputStr.includes('T')) {
            return inputStr.split('T')[1].substring(0, 8);
        }
        if (inputStr.includes(' ')) {
            const parts = inputStr.trim().split(/\s+/);
            if (parts[1]) return parts[1].substring(0, 8);
        }

        return inputStr;
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

    static minutesToHHMM(totalMinutes) {
        if (!totalMinutes || totalMinutes <= 0) return "00:00";
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }

    static calculateDayMetrics(metrics, dateStr, logs, shift, isNightShift) {
        // --- 1. CALCULATE ORIGINAL CONFIGURATION TOTALS ---
        let rawShiftIn = this.parseTime(dateStr, shift.ShiftIn, 'ShiftIn');
        let rawShiftOut = this.parseTime(dateStr, shift.ShiftOut, 'ShiftOut');

        let configWorkMinutes = 0;
        let configOTMinutes = 0;
        let configLunchMinutes = 0;

        if (rawShiftIn && rawShiftOut) {
            if (isNightShift) rawShiftOut.add(1, 'day');
            configWorkMinutes = rawShiftOut.diff(rawShiftIn, 'minutes');
        }

        const alignToShift = (timeStr, name) => {
            let targetTime = this.parseTime(dateStr, timeStr, name);
            if (!targetTime) return null;

            if (isNightShift) {
                const shiftStartMinutes = rawShiftIn.hours() * 60 + rawShiftIn.minutes();
                const targetMinutes = targetTime.hours() * 60 + targetTime.minutes();

                // Checks for 'PreShiftOT' perfectly now
                const isPreShiftWindow = name.includes('PreShiftOT');

                if (!isPreShiftWindow && targetMinutes < shiftStartMinutes) {
                    targetTime.add(1, 'day');
                }
            }
            return targetTime;
        };

        // Calculate Configured Lunch Minutes safely using 'LunchIn' / 'LunchOut'
        if (shift.IsLunchBreak && shift.LunchIn && shift.LunchOut) {
            let lStart = alignToShift(shift.LunchIn, 'LunchIn');
            let lEnd = alignToShift(shift.LunchOut, 'LunchOut');
            if (lStart && lEnd) {
                if (lEnd.isBefore(lStart)) lEnd.add(1, 'day');
                configLunchMinutes = lEnd.diff(lStart, 'minutes');
                configWorkMinutes = Math.max(0, configWorkMinutes - configLunchMinutes);
            }
        }

        // Calculate Configured Pre-Shift OT Capacity using exact name 'PreShiftOTIn'
        if (shift.IsPreShiftOT && shift.PreShiftOTIn && shift.PreShiftOTOut) {
            let preStart = alignToShift(shift.PreShiftOTIn, 'PreShiftOTIn');
            let preEnd = alignToShift(shift.PreShiftOTOut, 'PreShiftOTOut');
            if (preStart && preEnd) {
                if (preEnd.isBefore(preStart)) preEnd.add(1, 'day');
                configOTMinutes += preEnd.diff(preStart, 'minutes');
            }
        }

        // Calculate Configured Post-Shift OT Capacity using exact name 'PostShiftOTIn'
        if (shift.IsPostShiftOT && shift.PostShiftOTIn && shift.PostShiftOTOut) {
            let postStart = alignToShift(shift.PostShiftOTIn, 'PostShiftOTIn');
            let postEnd = alignToShift(shift.PostShiftOTOut, 'PostShiftOTOut');
            if (postStart && postEnd) {
                if (postEnd.isBefore(postStart)) postEnd.add(1, 'day');
                configOTMinutes += postEnd.diff(postStart, 'minutes');
            }
        }

        // Set baseline original capacities
        metrics.OriginalWorkingHours = this.minutesToHHMM(configWorkMinutes);
        metrics.OriginalOTHours = this.minutesToHHMM(configOTMinutes);

        // --- 2. RUN ACTUAL PUNCH CALCULATIONS ---
        if (!logs?.length) {
            console.log('[ENGINE_EMPTY_LOGS]', { dateStr });
            return metrics;
        }

        const sortedLogs = [...logs]
            .map(log => ({ ...log, parsedTime: moment.tz(log.punchTime, 'YYYY-MM-DD HH:mm:ss', this.TIMEZONE) }))
            .sort((a, b) => a.parsedTime.valueOf() - b.parsedTime.valueOf());

        /* -------------------------------- punch gap count ------------------------------- */
        let workGapMinutes = 0;
        let otGapMinutes = 0;

        const shiftStart = rawShiftIn;
        const shiftEnd = rawShiftOut;

        for (let i = 0; i < sortedLogs.length - 1; i++) {
            const current = sortedLogs[i];
            const next = sortedLogs[i + 1];

            if (current.punchType?.toUpperCase() === 'OUT' && next.punchType?.toUpperCase() === 'IN') {
                const gapStart = current.parsedTime;
                const gapEnd = next.parsedTime;
                const gapDuration = gapEnd.diff(gapStart, 'minutes');

                if (gapStart.isSameOrAfter(shiftStart) && gapEnd.isSameOrBefore(shiftEnd)) {
                    workGapMinutes += gapDuration;
                }
                else {
                    otGapMinutes += gapDuration;
                }
            }
        }

        const firstInLog = sortedLogs.find(x => x.punchType?.toUpperCase() === 'IN');
        const lastOutLog = [...sortedLogs].reverse().find(x => x.punchType?.toUpperCase() === 'OUT');

        if (!firstInLog || !lastOutLog) {
            metrics.Status = "Invalid Logs";
            return metrics;
        }

        const actualIn = firstInLog.parsedTime;
        const actualOut = lastOutLog.parsedTime;

        let shiftIn = rawShiftIn.clone();
        let shiftOut = rawShiftOut.clone();

        let totalWorkMinutes = 0;
        let totalOTMinutes = 0;

        const grace = shift.IsGraceTime ? (shift.GraceMinutes || 0) : 0;
        let isLate = false;
        let isEarly = false;

        let effectiveStart = shiftIn.clone();
        let effectiveEnd = shiftOut.clone();

        /* LATE IN EVALUATION */
        if (actualIn.isAfter(shiftIn)) {
            const lateMinutes = actualIn.diff(shiftIn, 'minutes');
            if (lateMinutes > grace) {
                isLate = true;
                effectiveStart = actualIn.clone();
            }
        }

        /* EARLY OUT EVALUATION */
        if (actualOut.isBefore(shiftOut)) {
            const earlyMinutes = shiftOut.diff(actualOut, 'minutes');
            if (earlyMinutes > grace) {
                isEarly = true;
                effectiveEnd = actualOut.clone();
            }
        }

        totalWorkMinutes = effectiveEnd.diff(effectiveStart, 'minutes');
        if (totalWorkMinutes < 0) totalWorkMinutes = 0;

        /* ACTUAL LUNCH DEDUCTION (Using Configured Duration) */
        if (shift.IsLunchBreak && shift.LunchIn && shift.LunchOut) {
            metrics.LunchBreak = this.minutesToHHMM(configLunchMinutes);
        }

        /* ACTUAL PRE SHIFT OT TRACKING */
        if (shift.IsPreShiftOT && shift.PreShiftOTIn && shift.PreShiftOTOut) {
            let start = alignToShift(shift.PreShiftOTIn, 'PreShiftOTIn');
            let end = alignToShift(shift.PreShiftOTOut, 'PreShiftOTOut');

            if (start && end) {
                if (end.isBefore(start)) end.add(1, 'day');
                const overlapStart = moment.max(actualIn, start);
                const overlapEnd = moment.min(actualOut, end);

                if (overlapEnd.isAfter(overlapStart)) {
                    totalOTMinutes += overlapEnd.diff(overlapStart, 'minutes');
                }
            }
        }

        /* ACTUAL POST SHIFT OT TRACKING */
        if (shift.IsPostShiftOT && shift.PostShiftOTIn && shift.PostShiftOTOut) {
            let start = alignToShift(shift.PostShiftOTIn, 'PostShiftOTIn');
            let end = alignToShift(shift.PostShiftOTOut, 'PostShiftOTOut');

            if (start && end) {
                if (end.isBefore(start)) end.add(1, 'day');
                const overlapStart = moment.max(actualIn, start);
                const overlapEnd = moment.min(actualOut, end);

                if (overlapEnd.isAfter(overlapStart)) {
                    totalOTMinutes += overlapEnd.diff(overlapStart, 'minutes');
                }
            }
        }

        /* STATUS DEFINITION */
        let status = 'Present';
        const hours = totalWorkMinutes / 60;

        if (totalWorkMinutes <= 0) {
            status = 'Absent';
        } else if (shift.IsHalfDayRule && hours < shift.HalfDayHours) {
            status = 'Half Day';
        } else if (isLate && isEarly) {
            status = 'Late & Early Out';
        } else if (isLate) {
            status = 'Late In';
        } else if (isEarly) {
            status = 'Early Out';
        }


        metrics.WorkHours = this.minutesToHHMM(totalWorkMinutes);
        totalWorkMinutes = Math.max(0, totalWorkMinutes + totalOTMinutes - workGapMinutes - otGapMinutes - configLunchMinutes);
        metrics.Status = status;
        metrics.OTHours = this.minutesToHHMM(totalOTMinutes);
        metrics.WorkGapMinutes = this.minutesToHHMM(workGapMinutes);
        metrics.OTGapMinutes = this.minutesToHHMM(otGapMinutes);
        metrics.FinalTotalHours = this.minutesToHHMM(Math.max(0, totalWorkMinutes));
        metrics.ShiftType = shift.ShiftType
        metrics.ShiftEntryMstId = shift.ShiftEntryMstId
        metrics.MonthlyTargetHours = shift.MonthlyTargetHours

        return metrics;
    }
}

module.exports = AttendanceEngine;