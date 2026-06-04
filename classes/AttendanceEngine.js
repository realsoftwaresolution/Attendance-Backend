const moment = require('moment-timezone');
const SalaryHelper = require('./SalaryHelper');

class AttendanceEngine {

    static TIMEZONE = 'Asia/Kolkata';



    static calculateDayMetrics(metrics, dateStr, logs, shift, isNightShift) {
        // --- 1. CALCULATE ORIGINAL CONFIGURATION TOTALS ---
        let rawShiftIn = SalaryHelper.parseTime(dateStr, shift.ShiftIn, 'ShiftIn');
        let rawShiftOut = SalaryHelper.parseTime(dateStr, shift.ShiftOut, 'ShiftOut');

        let configWorkMinutes = 0;
        let configOTMinutes = 0;
        let configLunchMinutes = 0;

        if (rawShiftIn && rawShiftOut) {
            if (isNightShift) rawShiftOut.add(1, 'day');
            configWorkMinutes = rawShiftOut.diff(rawShiftIn, 'minutes');
        }

        const alignToShift = (timeStr, name) => {
            let targetTime = SalaryHelper.parseTime(dateStr, timeStr, name);
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
        metrics.OriginalWorkingHours = SalaryHelper.minutesToHHMM(configWorkMinutes);
        metrics.OriginalOTHours = SalaryHelper.minutesToHHMM(configOTMinutes);

        // --- 2. RUN ACTUAL PUNCH CALCULATIONS ---------------------------------------------
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
        let lateDeductionMinutes = 0;
        let earlyOutDeductionMinutes = 0;

        /* LATE IN EVALUATION */
        if (actualIn.isAfter(shiftIn)) {
            const lateMinutes = actualIn.diff(shiftIn, 'minutes');
            if (lateMinutes > grace) {
                isLate = true;
                lateDeductionMinutes = lateMinutes;
                effectiveStart = actualIn.clone();
            }
        }

        /* EARLY OUT EVALUATION */
        if (actualOut.isBefore(shiftOut)) {
            const earlyMinutes = shiftOut.diff(actualOut, 'minutes');
            if (earlyMinutes > grace) {
                isEarly = true;
                earlyOutDeductionMinutes = earlyMinutes;
                effectiveEnd = actualOut.clone();
            }
        }

        totalWorkMinutes = effectiveEnd.diff(effectiveStart, 'minutes');
        if (totalWorkMinutes < 0) totalWorkMinutes = 0;

        /* ACTUAL LUNCH DEDUCTION (Using Configured Duration) */
        if (shift.IsLunchBreak && shift.LunchIn && shift.LunchOut) {
            metrics.LunchBreak = SalaryHelper.minutesToHHMM(configLunchMinutes);
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

        /* STATUS DEFINITION do not change order of status cal. */
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


        metrics.WorkHours = SalaryHelper.minutesToHHMM(totalWorkMinutes);
        totalWorkMinutes = Math.max(0, totalWorkMinutes + totalOTMinutes - workGapMinutes - otGapMinutes - configLunchMinutes);
        metrics.Status = status;
        metrics.OTHours = SalaryHelper.minutesToHHMM(totalOTMinutes);
        metrics.WorkGapMinutes = SalaryHelper.minutesToHHMM(workGapMinutes);
        metrics.OTGapMinutes = SalaryHelper.minutesToHHMM(otGapMinutes);
        metrics.FinalTotalHours = SalaryHelper.minutesToHHMM(Math.max(0, totalWorkMinutes));
        metrics.ShiftType = shift.ShiftType
        metrics.ShiftEntryMstId = shift.ShiftEntryMstId
        metrics.LateMinutes = SalaryHelper.minutesToHHMM(lateDeductionMinutes);
        metrics.EarlyOutMinutes = SalaryHelper.minutesToHHMM(earlyOutDeductionMinutes);

        return metrics;
    }
}

module.exports = AttendanceEngine;