const AdvanceManager = require('./AdvanceManager');
const FinalSalaryManager = require('./FinalSalaryManager');
const SalaryHelper = require('./SalaryHelper');
const TaxManager = require('./taxes/TaxManager');

class FixedSalaryCalculator {

    async calculate(context) {
        const { setting, salaryRecord } = context;
        const totalSalary = Number(salaryRecord?.TotalSalary || 0);

        /* ----------- 1. Guard Clause: Handle zero salary immediately ----------- */
        if (totalSalary <= 0) {
            context.baseSalary = 0;
            context.message = 'Salary calculation skipped because employee salary is zero.';
            context.isSkipped = true;
            return context;
        }
        context.baseSalary = totalSalary;

        /* --------------------- 2. Select and Execute Strategy --------------------- */
        if (setting.SalaryCalculateOnDay) {
            context.salaryCalculationMethod = 'DAY';
            this.calculateDaySalary(context);
            context.message = 'Salary calculated using day-wise method.';
        } else if (setting.SalaryCalculateOnHours) {
            context.salaryCalculationMethod = 'HOUR';
            this.calculateHourlySalary(context);
            context.message = 'Salary calculated using hourly method.';
        }

        /* ---------------- 3. Salary Distribution ---------------- */
        this.calculateSalaryDistribution(context);

        /* ---------------- 4. Tax Calculation ---------------- */
        await TaxManager.calculate(context);
        /* ---------------- 5. Advanced Calculation ---------------- */
        await AdvanceManager.calculate(context);
        /* ---------------- 6. Fianl Salary Calculation ---------------- */
        FinalSalaryManager.calculate(context);

        return context;
    }

    calculateDaySalary(context) {
        const { setting, attendanceRecords, baseSalary, month } = context;

        // 1. Resolve divisor using the extracted helper
        context.salaryDivisorDays = SalaryHelper.getSalaryDivisor(setting, month);

        // 2. Aggregate payable days
        let salaryPayableDays = 0;
        for (const day of attendanceRecords) {
            // Run audit hooks
            SalaryHelper.updateSundayAudit(day, context, setting);
            SalaryHelper.updateHolidayAudit(day, context, setting);
            SalaryHelper.updateAttendanceAudit(day, context, setting);

            salaryPayableDays += SalaryHelper.getPayableDaysForDayWiseCal(
                day,
                context.attendanceMap,
                setting
            );
        }

        // 3. Financial calculations
        const salaryPerDayRate = context.salaryDivisorDays > 0
            ? baseSalary / context.salaryDivisorDays
            : 0;

        context.salaryPayableDays = salaryPayableDays;
        context.salaryPerDayRate = SalaryHelper.roundMoney(salaryPerDayRate);
        context.grossSalary = SalaryHelper.roundMoney(salaryPayableDays * salaryPerDayRate);
    }

    calculateHourlySalary(context) {
        const { setting, attendanceRecords, baseSalary, month } = context;

        // 1. Calculate Expected Minutes (Divisor logic reused)
        const salaryDivisorDays = SalaryHelper.getSalaryDivisor(setting, month);
        const perDayHours = Number(setting.PerDayHours || 8);
        context.salaryExpectedMinutes = salaryDivisorDays * perDayHours * 60;

        // 2. Aggregate Actual Minutes
        let actualMinutes = 0;
        for (const day of attendanceRecords) {
            // Run audit hooks
            SalaryHelper.updateSundayAudit(day, context, setting);
            SalaryHelper.updateHolidayAudit(day, context, setting);
            SalaryHelper.updateAttendanceAudit(day, context, setting);

            actualMinutes += this.getDailyPayableMinutes(day, context, setting, perDayHours * 60);
        }

        // 3. Financial calculations
        const salaryPerMinuteRate = context.salaryExpectedMinutes > 0
            ? baseSalary / context.salaryExpectedMinutes
            : 0;

        context.salaryPayableMinutes = actualMinutes;
        context.salaryPerMinuteRate = SalaryHelper.roundRate(salaryPerMinuteRate);
        context.grossSalary = SalaryHelper.roundMoney(actualMinutes * salaryPerMinuteRate);
    }

    getDailyPayableMinutes(day, context, setting, standardMinutes) {
        // 0. Prepare worked minutes with restored deductions
        let workedMinutes = SalaryHelper.parseHHMMToMinutes(day.FinalTotalHours);
        if (setting.AllowLunchBreak) workedMinutes += SalaryHelper.parseHHMMToMinutes(day.LunchBreak);
        if (!setting.ApplyLateOnSalaryCalculation) {
            workedMinutes += SalaryHelper.parseHHMMToMinutes(day.LateMinutes);
            workedMinutes += SalaryHelper.parseHHMMToMinutes(day.EarlyOutMinutes);
        }

        // 1. Skip if configured for "Absent"
        if (day.isSunday && setting.ApplySundayInAbsentDay) return 0;

        // 2. Determine payment
        if (day.isSunday && setting.ApplySundayAsPresentDay) {
            return SalaryHelper.shouldPaySunday(day, context.attendanceMap, setting) ? standardMinutes : 0;
        }

        if (day.isSunday && setting.ApplySundayInOvertime) return workedMinutes;

        if (day.IsHoliday && setting.ApplyHolidayOnSalaryCalculation) return standardMinutes;

        return workedMinutes;
    }

    calculateSalaryDistribution(context) {

        const grossSalary =
            Number(context.grossSalary || 0);

        const bankLimit =
            Number(context.salaryRecord?.BankSalary || 0);

        if (grossSalary <= 0) {
            context.bankPayableSalary = 0;
            context.cashPayableSalary = 0;
            return;
        }

        /* ----------------------------- First fill bank ---------------------------- */
        const bankPayable =
            Math.min(grossSalary, bankLimit);

        /* ------------------------- Remaining goes to cash ------------------------- */
        const cashPayable =
            Math.max(0, grossSalary - bankPayable);

        context.bankPayableSalary =
            SalaryHelper.roundMoney(bankPayable);
        context.cashPayableSalary =
            SalaryHelper.roundMoney(cashPayable);
    }
}

module.exports = FixedSalaryCalculator;