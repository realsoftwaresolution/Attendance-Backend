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
    start = moment
      .tz(month, "YYYY-MM", TIMEZONE)
      .startOf("month")
      .format("YYYY-MM-DD HH:mm:ss");
    end = moment
      .tz(month, "YYYY-MM", TIMEZONE)
      .endOf("month")
      .add(2, "days")
      .endOf("day")
      .format("YYYY-MM-DD HH:mm:ss");
  } else if (date) {
    start = moment
      .tz(date, TIMEZONE)
      .startOf("day")
      .format("YYYY-MM-DD HH:mm:ss");
    end = moment
      .tz(date, TIMEZONE)
      .endOf("day")
      .add(1, "day")
      .format("YYYY-MM-DD HH:mm:ss"); // +1 day for Night Shift buffer
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

  const logsMap = {};
  rawPunches.forEach((punch) => {
    const punchDate = moment.tz(punch.punchTime, TIMEZONE).format("YYYY-MM-DD");
    logsMap[punch.EmpCode] ??= {};
    logsMap[punch.EmpCode][punchDate] ??= [];
    logsMap[punch.EmpCode][punchDate].push(punch);
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

  // Determine the range of dates to process
  let targetDates = [];

  if (month) {
    const totalDaysInMonth = moment
      .tz(month, "YYYY-MM", TIMEZONE)
      .daysInMonth();
    targetDates = Array.from({ length: totalDaysInMonth }, (_, i) =>
      moment
        .tz(month, "YYYY-MM", TIMEZONE)
        .startOf("month")
        .add(i, "days")
        .format("YYYY-MM-DD"),
    );
  } else if (date) {
    // For a single day, the array contains only one date string
    targetDates = [moment.tz(date, TIMEZONE).format("YYYY-MM-DD")];
  }

  const dailyRecords = [];
  const claimedPunchIds = new Set();

  for (const emp of employees) {
    const empFlatPunches = logsMap[emp.EmpCode] || [];
    for (const dateStr of targetDates) {
      const currentDate = moment.tz(dateStr, "YYYY-MM-DD", TIMEZONE);

      const validShifts = departmentShifts.filter((s) => {
        const fromDate = moment(s.FromDate);
        const toDate = s.ToDate ? moment(s.ToDate) : null;

        // Check if the current day is within the active date range of the shift
        const isAfterFrom = currentDate.isSameOrAfter(fromDate, "day");
        const isBeforeTo = toDate
          ? currentDate.isSameOrBefore(toDate, "day")
          : true;

        return isAfterFrom && isBeforeTo;
      });

      const todayPunches = empFlatPunches[dateStr] || [];
      const nextDayPunches =
        empFlatPunches[moment(dateStr).add(1, "day").format("YYYY-MM-DD")] ||
        [];
      const allAvailable = [...todayPunches, ...nextDayPunches].filter(
        (p) => !claimedPunchIds.has(p.id),
      );

      // 2. FIND ASSIGNED SHIFT: Based on the first "IN" punch of the day
      const firstIn = allAvailable
        .filter((p) => p.punchType?.toUpperCase() === "IN")
        .sort((a, b) => moment(a.punchTime) - moment(b.punchTime))[0];

      const holidayName = holidayMap[dateStr] || null;
      const isHoliday = !!holidayName;

      let assignedShift = null;
      if (firstIn) {
        const punchMin =
          moment.tz(firstIn.punchTime, TIMEZONE).hours() * 60 +
          moment.tz(firstIn.punchTime, TIMEZONE).minutes();
        assignedShift = validShifts.reduce((best, curr) => {
          const [h, m] = curr.ShiftIn.split(":").map(Number);
          const diff = Math.abs(punchMin - (h * 60 + m));
          return !best || diff < best.diff ? { shift: curr, diff } : best;
        }, null)?.shift;
      } else {
        assignedShift = validShifts[0];
      }

      if (!assignedShift) {
        dailyRecords.push({
          Date: dateStr,
          EmpCode: emp.EmpCode,
          EmployeeName: emp.EmpFullName,
          EmpMstId: emp.EmpMstId,
          ShiftEntryMstId: null,
          ShiftType: null,
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
          Remark: isAuto
            ? `No Shift Assigned - Auto Job Generated`
            : "No Shift Assigned",
        });

        continue;
      }

      const [inH, inM] = assignedShift.ShiftIn.split(":").map(Number);
      const shiftInMinutes = inH * 60 + (inM || 0);
      const [outH, outM] = assignedShift.ShiftOut.split(":").map(Number);
      const shiftOutMinutes = outH * 60 + (outM || 0);

      const isNightShift = shiftOutMinutes <= shiftInMinutes;

      // EARLIEST START (OT or Shift)
      const earliestStart =
        assignedShift.IsPreShiftOT && assignedShift.PreShiftOTIn
          ? moment.tz(
              `${dateStr} ${assignedShift.PreShiftOTIn}`,
              "YYYY-MM-DD HH:mm:ss",
              TIMEZONE,
            )
          : moment.tz(
              `${dateStr} ${assignedShift.ShiftIn}`,
              "YYYY-MM-DD HH:mm:ss",
              TIMEZONE,
            );
      const startBound = earliestStart.subtract(1, "hours");

      // LATEST END (OT or Shift)
      let latestEnd =
        assignedShift.IsPostShiftOT && assignedShift.PostShiftOTOut
          ? moment.tz(
              `${dateStr} ${assignedShift.PostShiftOTOut}`,
              "YYYY-MM-DD HH:mm:ss",
              TIMEZONE,
            )
          : moment.tz(
              `${dateStr} ${assignedShift.ShiftOut}`,
              "YYYY-MM-DD HH:mm:ss",
              TIMEZONE,
            );

      if (isNightShift) latestEnd.add(1, "day");
      const endBound = latestEnd.add(1, "hours");

      const dayPunches = allAvailable.filter((p) => {
        const pTime = moment.tz(p.punchTime, TIMEZONE);
        const isWithin =
          pTime.isSameOrAfter(startBound) && pTime.isSameOrBefore(endBound);
        if (isWithin) claimedPunchIds.add(p.id);
        return isWithin;
      });

      let metrics = {
        Date: dateStr,
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
        ShiftType: assignedShift.ShiftType,
        ShiftEntryMstId: assignedShift.ShiftEntryMstId,
        Remark: isAuto ? `By Auto Job Generated` : "-",
      };

      metrics = AttendanceEngine.calculateDayMetrics(
        metrics,
        dateStr,
        dayPunches,
        assignedShift,
        isNightShift,
      );

      dailyRecords.push(metrics);
    }
  }

  return { employees, dailyRecords };
}

module.exports = { generateDailyAttendanceData };
