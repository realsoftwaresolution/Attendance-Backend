const { Op, QueryTypes } = require("sequelize");
const moment = require("moment-timezone");
const AttendanceEngine = require("../classes/AttendanceEngine");
const db = require("../config/dbConnection");
const { AppError } = require("../utils/AppError");

async function generateDailyAttendanceData({
  departmentId,
  date,
  month,
  isAuto = false,
}) {
  const TIMEZONE = "Asia/Kolkata";
  const departmentMstId = parseInt(departmentId, 10);

  let start, end;
  if (month) {
    start = moment.tz(month, "YYYY-MM", TIMEZONE).startOf("month").format("YYYY-MM-DD HH:mm:ss");
    // Fetch +2 days at the end of the month to capture deep crossing-midnight/post-OT punches safely
    end = moment.tz(month, "YYYY-MM", TIMEZONE).endOf("month").add(2, "days").endOf("day").format("YYYY-MM-DD HH:mm:ss");
  } else if (date) {
    start = moment.tz(date, TIMEZONE).startOf("day").format("YYYY-MM-DD HH:mm:ss");
    end = moment.tz(date, TIMEZONE).endOf("day").add(2, "days").endOf("day").format("YYYY-MM-DD HH:mm:ss");
  } else {
    throw new AppError("Either 'month' or 'date' must be provided.", 500);
  }

  const employees = await db.EmployeeMst.findAll({
    where: { DepartmentMstId: departmentMstId, Active: true },
    attributes: ["EmpMstId", "EmpCode", "EmpFullName", "CompanyMstId"],
    raw: true,
  });

  if (!employees.length) return { employees: [], dailyRecords: [] };

  const empCodes = employees.map((x) => x.EmpCode);
  const companyMstId = employees[0].CompanyMstId;

  // 1. FETCH FLAT PUNCHES CHRONOLOGICALLY
  const rawPunches = await db.sequelize.query(
    `
        SELECT id, EmpCode, FORMAT(punchTime, 'yyyy-MM-dd HH:mm:ss') AS punchTime, punchType, punchSource
        FROM PunchLogs WHERE EmpCode IN (:empCodes) AND punchTime BETWEEN :start AND :end ORDER BY punchTime ASC
    `,
    {
      replacements: { empCodes, start, end },
      type: QueryTypes.SELECT,
      raw: true,
    },
  );

  // Group into a flat chronological stream per individual employee
  const employeePunchesMap = {};
  rawPunches.forEach((punch) => {
    employeePunchesMap[punch.EmpCode] ??= [];
    employeePunchesMap[punch.EmpCode].push(punch);
  });

  const departmentShifts = await db.sequelize.query(
    `
        SELECT ShiftEntryMstId, FromDate, ToDate, CompanyMstId, DepartmentMstId, ShiftType,
            CONVERT(VARCHAR(8), ShiftIn, 108) AS ShiftIn, CONVERT(VARCHAR(8), ShiftOut, 108) AS ShiftOut,
            IsPreShiftOT, CONVERT(VARCHAR(8), PreShiftOTIn,108) AS PreShiftOTIn, CONVERT(VARCHAR(8), PreShiftOTOut,108) AS PreShiftOTOut,
            IsPostShiftOT, CONVERT(VARCHAR(8), PostShiftOTIn,108) AS PostShiftOTIn, CONVERT(VARCHAR(8), PostShiftOTOut,108) AS PostShiftOTOut,
            IsLunchBreak, CONVERT(VARCHAR(8), LunchIn,108) AS LunchIn, CONVERT(VARCHAR(8), LunchOut,108) AS LunchOut,
            IsHalfDayRule, HalfDayHours, IsGraceTime, GraceMinutes
        FROM ShiftEntryMst WHERE CompanyMstId=:companyMstId AND DepartmentMstId=:departmentMstId AND Active=1
        AND FromDate<=:end AND (ToDate IS NULL OR ToDate>=:start)
    `,
    {
      replacements: { companyMstId, departmentMstId, end, start },
      type: db.Sequelize.QueryTypes.SELECT,
    },
  );

  const holidaysQuery = await db.sequelize.query(
    `
        SELECT Date, Holiday FROM HolidayMst WHERE Date BETWEEN :start AND :end AND Active = 1 AND IsDelete = 0
    `,
    { replacements: { start, end }, type: QueryTypes.SELECT },
  );

  const holidayMap = {};
  holidaysQuery.forEach((h) => {
    holidayMap[moment.tz(h.Date, TIMEZONE).format("YYYY-MM-DD")] = h.Holiday;
  });

  let targetDates = [];
  if (month) {
    const totalDaysInMonth = moment.tz(month, "YYYY-MM", TIMEZONE).daysInMonth();
    targetDates = Array.from({ length: totalDaysInMonth }, (_, i) =>
      moment.tz(month, "YYYY-MM", TIMEZONE).startOf("month").add(i, "days").format("YYYY-MM-DD")
    );
  } else if (date) {
    targetDates = [moment.tz(date, TIMEZONE).format("YYYY-MM-DD")];
  }

  const dailyRecords = [];

  for (const emp of employees) {
    const allEmpPunches = employeePunchesMap[emp.EmpCode] || [];
    const businessDateRecords = {};
    
    // Initialize target calendar dates with base attendance templates
    targetDates.forEach(dStr => {
      const holidayName = holidayMap[dStr] || null;
      const isHoliday = !!holidayName;
      
      businessDateRecords[dStr] = {
        Date: dStr,
        EmpCode: emp.EmpCode,
        EmployeeName: emp.EmpFullName,
        EmpMstId: emp.EmpMstId,
        WorkHours: "00:00",
        OTHours: "00:00",
        LunchBreak: "00:00",
        GapMinutes: "00:00",
        LateMinutes: "00:00",
        EarlyOutMinutes: "00:00",
        FinalTotalHours: "00:00",
        Status: isHoliday ? "Holiday" : "Absent",
        IsHoliday: isHoliday,
        HolidayName: holidayName,
        ShiftType: null,
        ShiftEntryMstId: null,
        Remark: isAuto ? `By Auto Job Generated` : "-",
        _punches: [] // Temporary allocation bucket
      };
    });

    // 2. CHRONOLOGICAL ALLOCATION USING DYNAMIC DAY-BREAK FENCE
    allEmpPunches.forEach((punch) => {
      const pTime = moment.tz(punch.punchTime, TIMEZONE);
      const calendarDateStr = pTime.format("YYYY-MM-DD");
      
      let assignedBusinessDate = calendarDateStr;

      // Find the shift matching this calendar day to check its configuration rules
      const activeShift = departmentShifts.find((s) => {
        const fromDate = moment(s.FromDate);
        const toDate = s.ToDate ? moment(s.ToDate) : null;
        return pTime.isSameOrAfter(fromDate, "day") && (!toDate || pTime.isSameOrBefore(toDate, "day"));
      });

      if (activeShift) {
        // Find the absolute earliest boundary this shift can begin (Pre-OT or Regular Shift In)
        const baseStartToday = activeShift.IsPreShiftOT && activeShift.PreShiftOTIn
          ? moment.tz(`${calendarDateStr} ${activeShift.PreShiftOTIn}`, "YYYY-MM-DD HH:mm:ss", TIMEZONE)
          : moment.tz(`${calendarDateStr} ${activeShift.ShiftIn}`, "YYYY-MM-DD HH:mm:ss", TIMEZONE);

        // Adjust back 1 day if Pre-OT begins before midnight on the previous calendar eve
        if (activeShift.IsPreShiftOT && activeShift.PreShiftOTIn && activeShift.PreShiftOTIn > activeShift.ShiftIn) {
          baseStartToday.subtract(1, "day");
        }

        // DYNAMIC CUTOFF FENCE: 4 Hours prior to the earliest conceivable shift/Pre-OT launch
        // We use 4 hours instead of 1 hour so that extremely early IN punches (e.g. 07:02 for an 08:30 shift)
        // are correctly assigned to TODAY instead of being pushed to yesterday.
        const dayBreakCutoffToday = moment(baseStartToday).subtract(4, "hours");

        // EVALUATE 'IN' PUNCHES
        if (punch.punchType?.toUpperCase() === "IN") {
          // If arrival lands before the morning fence line, it belongs to yesterday's late shift assignment
          if (pTime.isBefore(dayBreakCutoffToday)) {
            assignedBusinessDate = moment(calendarDateStr).subtract(1, "day").format("YYYY-MM-DD");
          }
        }
        
        // EVALUATE 'OUT' PUNCHES
        if (punch.punchType?.toUpperCase() === "OUT") {
          const prevDayStr = moment(calendarDateStr).subtract(1, "day").format("YYYY-MM-DD");
          const prevDayRecord = businessDateRecords[prevDayStr];
          
          // ODD/EVEN RULE: If yesterday has an open, unmatched IN punch, this morning OUT belongs to yesterday.
          if (prevDayRecord && prevDayRecord._punches.length % 2 !== 0) {
            assignedBusinessDate = prevDayStr;
          }
        }
      }

      // If mapped destination falls within the targeted date bounds, push it into that day's timeline
      if (businessDateRecords[assignedBusinessDate]) {
        businessDateRecords[assignedBusinessDate]._punches.push(punch);
      }
    });

    // 3. EXECUTE METRICS ENGINE ON SANITIZED BUCKETS
    for (const dStr of targetDates) {
      const record = businessDateRecords[dStr];
      
      const validShifts = departmentShifts.filter((s) => {
        const fromDate = moment(s.FromDate);
        const toDate = s.ToDate ? moment(s.ToDate) : null;
        return moment(dStr).isSameOrAfter(fromDate, "day") && (!toDate || moment(dStr).isSameOrBefore(toDate, "day"));
      });

      let assignedShift = null;
      // Match the shift nearest to the primary arrival punch
      if (record._punches.length > 0) {
        const firstIn = record._punches.find(p => p.punchType?.toUpperCase() === "IN") || record._punches[0];
        const punchMin = moment.tz(firstIn.punchTime, TIMEZONE).hours() * 60 + moment.tz(firstIn.punchTime, TIMEZONE).minutes();
        
        assignedShift = validShifts.reduce((best, curr) => {
          const [h, m] = curr.ShiftIn.split(":").map(Number);
          const diff = Math.abs(punchMin - (h * 60 + m));
          return !best || diff < best.diff ? { shift: curr, diff } : best;
        }, null)?.shift;
      }
      
      assignedShift = assignedShift || validShifts[0];

      if (assignedShift) {
        record.ShiftType = assignedShift.ShiftType;
        record.ShiftEntryMstId = assignedShift.ShiftEntryMstId;

        const [inH, inM] = assignedShift.ShiftIn.split(":").map(Number);
        const [outH, outM] = assignedShift.ShiftOut.split(":").map(Number);
        const isNightShift = (outH * 60 + outM) <= (inH * 60 + inM);

        // Execute your core engine logic safely
        const finalMetrics = AttendanceEngine.calculateDayMetrics(
          record,
          dStr,
          record._punches,
          assignedShift,
          isNightShift
        );
        
        delete finalMetrics._punches;
        dailyRecords.push(finalMetrics);
      } else {
        delete record._punches;
        dailyRecords.push(record);
      }
    }
  }

  return { employees, dailyRecords };
}

module.exports = { generateDailyAttendanceData };