const { QueryTypes, Op } = require("sequelize");
const db = require("../../config/dbConnection");
const SalaryHelper = require("../../classes/SalaryHelper");

const getReportDates = (FromDate, ToDate) => {
  let fromDate = FromDate;
  let toDate = ToDate;

  if (!fromDate || !toDate) {
    const today = new Date();
    fromDate = new Date(today.getFullYear(), today.getMonth(), 1)
      .toISOString()
      .split("T")[0];
    toDate = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0];
  }
  return { fromDate, toDate };
};

const buildReportQuery = (req, fromDate, toDate) => {
  const { EmpCode, DepartmentMstId, CompanyMstId } = req.query;

  let whereClause = `WHERE 1=1`;
  const replacements = { FromDate: fromDate, ToDate: toDate };

  if (EmpCode) {
    whereClause += ` AND P.EmpCode = :EmpCode`;
    replacements.EmpCode = EmpCode;
  }
  if (DepartmentMstId) {
    whereClause += ` AND E.DepartmentMstId = :DepartmentMstId`;
    replacements.DepartmentMstId = DepartmentMstId;
  }
  if (CompanyMstId) {
    whereClause += ` AND E.CompanyMstId = :CompanyMstId`;
    replacements.CompanyMstId = CompanyMstId;
  }

  whereClause += ` AND CAST(P.punchTime AS DATE) BETWEEN :FromDate AND :ToDate`;

  const query = `
    SELECT
      P.id,
      P.EmpCode,
      P.SyncTrackerId,
      E.EmpMstId,
      E.EmpFullName,
      ISNULL(D.DepartmentMstId, 0) AS DepartmentMstId,
      ISNULL(D.Department, 'Unassigned') AS Department,
      ISNULL(DG.Designation, 'Unassigned') AS Designation,
      ISNULL(C.CompanyMstId, 0) AS CompanyMstId,
      ISNULL(C.CompanyName, 'Unassigned') AS CompanyName,
      CAST(P.punchTime AS DATE) AS AttendanceDate,
      CONVERT(VARCHAR(8), P.punchTime, 108) AS PunchTime,
      P.punchType,
      P.punchSource,
      S.Status,
      S.Remark,
      ISNULL(S.FinalTotalHours, '00:00') AS FinalTotalHours,
      ISNULL(S.OTHours, '00:00') AS OTHours,
      ISNULL(S.OTGapMinutes, '00:00') AS OTGapMinutes
    FROM PunchLogs P
    INNER JOIN EmployeeMst E ON P.EmpCode = E.EmpCode
    INNER JOIN DailyAttendanceSummary S ON E.EmpMstId = S.EmpMstId AND CAST(P.punchTime AS DATE) = S.attendanceDate
    LEFT JOIN DepartmentMst D ON E.DepartmentMstId = D.DepartmentMstId
    LEFT JOIN DesignationMst DG ON E.DesignationMstId = DG.DesignationMstId
    LEFT JOIN CompanyMst C ON E.CompanyMstId = C.CompanyMstId
    ${whereClause}
    ORDER BY E.EmpFullName ASC, AttendanceDate ASC, P.punchTime ASC
  `;

  return { query, replacements };
};

const processPunchPairing = (employeeRecord, row) => {
  if (row.punchType === "IN") {
    employeeRecord.punches.push({
      inPunchId: row.id,
      inTime: row.PunchTime,
      inSource: row.punchSource,
      outPunchId: null,
      outTime: null,
      outSource: null,
    });
  } else if (row.punchType === "OUT") {
    const openSession = employeeRecord.punches.find(
      (s) => s.inTime && !s.outTime,
    );
    if (openSession) {
      openSession.outPunchId = row.id;
      openSession.outTime = row.PunchTime;
      openSession.outSource = row.punchSource;
    } else {
      employeeRecord.punches.push({
        inPunchId: null,
        inTime: null,
        inSource: null,
        outPunchId: row.id,
        outTime: row.PunchTime,
        outSource: row.punchSource,
      });
    }
  }
};

exports.getDailyInOutReport = async (req, res, next) => {
  const { fromDate, toDate } = getReportDates(
    req.query.FromDate,
    req.query.ToDate,
  );
  const { query, replacements } = buildReportQuery(req, fromDate, toDate);

  const rawData = await db.sequelize.query(query, {
    replacements,
    type: QueryTypes.SELECT,
  });
  const accumulator = {};

  for (const row of rawData) {
    const primaryKey = `DATE_${row.AttendanceDate}`;

    if (!accumulator[primaryKey]) {
      accumulator[primaryKey] = {
        attendanceDate: row.AttendanceDate,
        totalFinalHours: "00:00",
        totalFinalOTHours: "00:00",
        _metaFinalMinutes: 0,
        _metaOTMinutes: 0,
        records: [],
      };
    }

    const activeGroup = accumulator[primaryKey];
    let employeeRecord = activeGroup.records.find(
      (r) => r.empMstId === row.EmpMstId,
    );

    if (!employeeRecord) {
      const netDailyWorkMins = SalaryHelper.parseHHMMToMinutes(
        row.FinalTotalHours,
      );
      const netDailyOTMins = SalaryHelper.calculateDailyNetOTMinutes(
        row.OTHours,
        row.OTGapMinutes,
      );

      // Add to parent day overall metrics tracker
      activeGroup._metaFinalMinutes += netDailyWorkMins;
      activeGroup._metaOTMinutes += netDailyOTMins;

      employeeRecord = {
        empMstId: row.EmpMstId,
        empCode: row.EmpCode,
        empName: row.EmpFullName,
        department: row.Department,
        designation: row.Designation,
        companyName: row.CompanyName,
        status: row.Status,
        remark: row.Remark,
        finalHours: row.FinalTotalHours,
        finalOTHours: SalaryHelper.minutesToHHMM(netDailyOTMins),
        punches: [],
      };
      activeGroup.records.push(employeeRecord);
    }

    processPunchPairing(employeeRecord, row);
  }

  // Convert parent metadata node minutes back to string keys
  const result = Object.values(accumulator).map((day) => {
    day.totalFinalHours = SalaryHelper.minutesToHHMM(day._metaFinalMinutes);
    day.totalFinalOTHours = SalaryHelper.minutesToHHMM(day._metaOTMinutes);
    delete day._metaFinalMinutes;
    delete day._metaOTMinutes;
    return day;
  });

  return res.status(200).json({
    success: true,
    message: "Daily In/Out Logs report generated successfully.",
    filter: { fromDate, toDate },
    data: result,
  });
};

exports.getDepartmentWiseInOutReport = async (req, res, next) => {
  const { fromDate, toDate } = getReportDates(
    req.query.FromDate,
    req.query.ToDate,
  );
  const { query, replacements } = buildReportQuery(req, fromDate, toDate);

  const rawData = await db.sequelize.query(query, {
    replacements,
    type: QueryTypes.SELECT,
  });
  const accumulator = {};

  for (const row of rawData) {
    const primaryKey = `DEPT_${row.DepartmentMstId}`;

    if (!accumulator[primaryKey]) {
      accumulator[primaryKey] = {
        departmentId: row.DepartmentMstId,
        departmentName: row.Department,
        deptTotalFinalHours: "00:00",
        deptTotalFinalOTHours: "00:00",
        deptTotalPresentDays: 0,
        deptTotalAbsentDays: 0,
        _metaDeptWorkMins: 0,
        _metaDeptOTMins: 0,
        records: [],
      };
    }

    const activeGroup = accumulator[primaryKey];

    let employeeRecord = activeGroup.records.find(
      (r) =>
        r.empMstId === row.EmpMstId && r.attendanceDate === row.AttendanceDate,
    );

    if (!employeeRecord) {
      const netWorkMins = SalaryHelper.parseHHMMToMinutes(row.FinalTotalHours);
      const netOTMins = SalaryHelper.calculateDailyNetOTMinutes(
        row.OTHours,
        row.OTGapMinutes,
      );

      // Accumulate department-level hour metrics
      activeGroup._metaDeptWorkMins += netWorkMins;
      activeGroup._metaDeptOTMins += netOTMins;

      // Accumulate department-level day counts
      const currentStatus = (row.Status || "").toUpperCase();
      if (currentStatus === "ABSENT" || currentStatus === "INVALID") {
        activeGroup.deptTotalAbsentDays += 1;
      } else {
        activeGroup.deptTotalPresentDays += 1;
      }

      employeeRecord = {
        empMstId: row.EmpMstId,
        empCode: row.EmpCode,
        empName: row.EmpFullName,
        designation: row.Designation,
        companyName: row.CompanyName,
        attendanceDate: row.AttendanceDate,
        status: row.Status,
        remark: row.Remark,
        finalHours: row.FinalTotalHours,
        finalOTHours: SalaryHelper.minutesToHHMM(netOTMins),
        punches: [],
      };
      activeGroup.records.push(employeeRecord);
    }

    processPunchPairing(employeeRecord, row);
  }

  // Process calculations and apply individual summary blocks inside the records list
  const result = Object.values(accumulator).map((dept) => {
    dept.deptTotalFinalHours = SalaryHelper.minutesToHHMM(
      dept._metaDeptWorkMins,
    );
    dept.deptTotalFinalOTHours = SalaryHelper.minutesToHHMM(
      dept._metaDeptOTMins,
    );
    delete dept._metaDeptWorkMins;
    delete dept._metaDeptOTMins;

    // Group rows internally by individual employee to build separate summary metrics
    const empSummaryMap = {};
    dept.records.forEach((rec) => {
      if (!empSummaryMap[rec.empMstId]) {
        empSummaryMap[rec.empMstId] = {
          work: 0,
          ot: 0,
          present: 0,
          absent: 0,
        };
      }

      empSummaryMap[rec.empMstId].work += SalaryHelper.parseHHMMToMinutes(
        rec.finalHours,
      );
      empSummaryMap[rec.empMstId].ot += SalaryHelper.parseHHMMToMinutes(
        rec.finalOTHours,
      );

      const checkStat = (rec.status || "").toUpperCase();
      if (checkStat === "ABSENT" || checkStat === "INVALID") {
        empSummaryMap[rec.empMstId].absent += 1;
      } else {
        empSummaryMap[rec.empMstId].present += 1;
      }
    });

    // Map employee-specific summary metrics directly to their records for the frontend view
    dept.records = dept.records.map((rec) => {
      rec.employeeTotalFinalHours = SalaryHelper.minutesToHHMM(
        empSummaryMap[rec.empMstId].work,
      );
      rec.employeeTotalFinalOTHours = SalaryHelper.minutesToHHMM(
        empSummaryMap[rec.empMstId].ot,
      );
      rec.employeePresentDays = empSummaryMap[rec.empMstId].present;
      rec.employeeAbsentDays = empSummaryMap[rec.empMstId].absent;
      return rec;
    });

    return dept;
  });

  return res.status(200).json({
    success: true,
    message: "Department-Wise In/Out Summary generated successfully.",
    filter: { fromDate, toDate },
    data: result,
  });
};

exports.getEmployeeWiseInOutReport = async (req, res, next) => {
  const { fromDate, toDate } = getReportDates(
    req.query.FromDate,
    req.query.ToDate,
  );
  const { query, replacements } = buildReportQuery(req, fromDate, toDate);

  const rawData = await db.sequelize.query(query, {
    replacements,
    type: QueryTypes.SELECT,
  });
  const accumulator = {};

  for (const row of rawData) {
    const primaryKey = `EMP_${row.EmpMstId}`;

    if (!accumulator[primaryKey]) {
      accumulator[primaryKey] = {
        empMstId: row.EmpMstId,
        empCode: row.EmpCode,
        empName: row.EmpFullName,
        department: row.Department,
        designation: row.Designation,
        companyName: row.CompanyName,
        totalFinalHours: "00:00",
        totalFinalOTHours: "00:00",
        totalPresentDays: 0,
        totalAbsentDays: 0,
        _metaTotalWorkMins: 0,
        _metaTotalOTMins: 0,
        records: [],
      };
    }

    const activeGroup = accumulator[primaryKey];
    let dateRecord = activeGroup.records.find(
      (r) => r.attendanceDate === row.AttendanceDate,
    );

    if (!dateRecord) {
      const netWorkMins = SalaryHelper.parseHHMMToMinutes(row.FinalTotalHours);
      const netOTMins = SalaryHelper.calculateDailyNetOTMinutes(
        row.OTHours,
        row.OTGapMinutes,
      );

      // Accumulate hours metadata
      activeGroup._metaTotalWorkMins += netWorkMins;
      activeGroup._metaTotalOTMins += netOTMins;

      // --- Calculate Present / Absent Counts ---
      const currentStatus = (row.Status || "").toUpperCase();
      if (currentStatus === "ABSENT" || currentStatus === "INVALID") {
        activeGroup.totalAbsentDays += 1;
      } else {
        activeGroup.totalPresentDays += 1;
      }

      dateRecord = {
        attendanceDate: row.AttendanceDate,
        status: row.Status,
        remark: row.Remark,
        finalHours: row.FinalTotalHours,
        finalOTHours: SalaryHelper.minutesToHHMM(netOTMins),
        punches: [],
      };
      activeGroup.records.push(dateRecord);
    }

    processPunchPairing(dateRecord, row);
  }

  // Convert accumulated metadata back to clean display strings
  const result = Object.values(accumulator).map((emp) => {
    emp.totalFinalHours = SalaryHelper.minutesToHHMM(emp._metaTotalWorkMins);
    emp.totalFinalOTHours = SalaryHelper.minutesToHHMM(emp._metaTotalOTMins);
    delete emp._metaTotalWorkMins;
    delete emp._metaTotalOTMins;
    return emp;
  });

  return res.status(200).json({
    success: true,
    message: "Employee Attendance History generated successfully.",
    filter: { fromDate, toDate },
    data: result,
  });
};

exports.getDetailedSalaryStatement = async (req, res, next) => {
  try {
    const { CompanyMstId, DepartmentMstId, EmpCode, FromMonth, ToMonth } =
      req.query;

    // 1. Resolve dynamic Month Filters (Format expected: YYYY-MM)
    let startMonth = FromMonth;
    let endMonth = ToMonth;

    if (!startMonth) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      startMonth = `${year}-${month}`;
    }
    if (!endMonth) {
      endMonth = startMonth;
    }

    // 2. Build Dynamic Database Query Conditions
    const whereClause = {
      SalaryMonth: {
        [Op.between]: [startMonth, endMonth],
      },
      Active: true,
    };

    if (CompanyMstId) whereClause.CompanyMstId = CompanyMstId;
    if (DepartmentMstId) whereClause.DepartmentMstId = DepartmentMstId;
    if (EmpCode) whereClause.EmpCode = EmpCode;

    // 3. Fetch Records from Database
    const records = await db.SalaryDet.findAll({
      where: whereClause,
      order: [
        ["SalaryMonth", "DESC"],
        ["EmpCode", "ASC"],
      ],
    });

    // 4. Compute Financial Grand Totals using JavaScript Array Reducers
    let totalBaseSalary = 0;
    let totalGrossSalary = 0;
    let totalBankPayableSalary = 0;
    let totalCashPayableSalary = 0;
    let totalEmployeeEPF = 0;
    let totalEmployeeESIC = 0;
    let totalEmployeePT = 0;
    let totalStatutoryDeductions = 0;
    let totalBankSalaryAfterTax = 0;
    let totalOutstandingAdvance = 0;
    let totalCashSalaryAfterAdvance = 0;
    let totalNetPayableSalary = 0;

    const cleanData = records.map((rec) => {
      const plain = rec.get({ plain: true });

      // Accumulate calculations for summaries
      totalBaseSalary += Number(plain.BaseSalary || 0);
      totalGrossSalary += Number(plain.GrossSalary || 0);
      totalBankPayableSalary += Number(plain.BankPayableSalary || 0);
      totalCashPayableSalary += Number(plain.CashPayableSalary || 0);
      totalEmployeeEPF += Number(plain.EmployeeEPF || 0);
      totalEmployeeESIC += Number(plain.EmployeeESIC || 0);
      totalEmployeePT += Number(plain.EmployeePT || 0);
      totalStatutoryDeductions += Number(plain.TotalStatutoryDeductions || 0);
      totalBankSalaryAfterTax += Number(plain.BankSalaryAfterTax || 0);
      totalOutstandingAdvance += Number(plain.TotalOutstandingAdvance || 0);
      totalCashSalaryAfterAdvance += Number(plain.CashSalaryAfterAdvance || 0);
      totalNetPayableSalary += Number(plain.NetPayableSalary || 0);

      return plain;
    });

    // 5. Append clean Summary Object with your newly targeted columns
    const summaryRow = {
      SalaryDetId: null,
      SalaryMonth: "TOTAL",
      EmpCode: "",
      EmpFullName: "Grand Total",
      Department: "",
      Designation: "",
      CompanyName: "",
      BaseSalary: Number(totalBaseSalary.toFixed(2)),
      GrossSalary: Number(totalGrossSalary.toFixed(2)),
      BankPayableSalary: Number(totalBankPayableSalary.toFixed(2)),
      CashPayableSalary: Number(totalCashPayableSalary.toFixed(2)),
      EmployeeEPF: Number(totalEmployeeEPF.toFixed(2)),
      EmployeeESIC: Number(totalEmployeeESIC.toFixed(2)),
      EmployeePT: Number(totalEmployeePT.toFixed(2)),
      TotalStatutoryDeductions: Number(totalStatutoryDeductions.toFixed(2)),
      BankSalaryAfterTax: Number(totalBankSalaryAfterTax.toFixed(2)),
      TotalOutstandingAdvance: Number(totalOutstandingAdvance.toFixed(2)),
      CashSalaryAfterAdvance: Number(totalCashSalaryAfterAdvance.toFixed(2)),
      NetPayableSalary: Number(totalNetPayableSalary.toFixed(2)),
      isSummaryRow: true,
    };

    const responseData = [...cleanData, summaryRow];

    return res.status(200).json({
      success: true,
      message: "Detailed Salary Statement generated successfully.",
      filters: {
        appliedFromMonth: startMonth,
        appliedToMonth: endMonth,
        companyMstId: CompanyMstId || "All",
        departmentMstId: DepartmentMstId || "All",
        empCode: EmpCode || "All",
      },
      count: cleanData.length,
      data: responseData,
    });
  } catch (error) {
    next(error);
  }
};

exports.getInvalidLogsWithPunches = async (req, res, next) => {
  // 1. Setup default filters (Current Month Start to Current Date)
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const fromDate =
    req.query.FromDate || firstDayOfMonth.toISOString().split("T")[0];
  const toDate = req.query.ToDate || today.toISOString().split("T")[0];
  const { EmpCode, DepartmentMstId } = req.query;

  // 2. Build dynamic parameters and filters for the Main Summary
  let summaryWhereClause = `WHERE S.Status = 'Invalid Logs' AND S.attendanceDate BETWEEN :FromDate AND :ToDate`;
  const summaryReplacements = { FromDate: fromDate, ToDate: toDate };

  if (EmpCode) {
    summaryWhereClause += ` AND S.EmpCode = :EmpCode`;
    summaryReplacements.EmpCode = EmpCode;
  }

  if (DepartmentMstId) {
    summaryWhereClause += ` AND E.DepartmentMstId = :DepartmentMstId`;
    summaryReplacements.DepartmentMstId = DepartmentMstId;
  }

  // Query 1: Fetch the Invalid Attendance Summary rows along with Employee Metadata
  const invalidSummaries = await db.sequelize.query(
    `
    SELECT 
      S.[SummaryId], S.[EmpMstId], S.[EmpCode], S.[ShiftEntryMstId], S.[Status], 
      S.[WorkHours], S.[OTHours], S.[LunchBreak], S.[FinalTotalHours], S.[WorkGapMinutes], 
      S.[OTGapMinutes], S.[OriginalWorkingHours], S.[OriginalOTHours], S.[IsHoliday], 
      S.[HolidayName], S.[Remark], S.[LateMinutes], S.[EarlyOutMinutes],
      E.EmpFullName,
      ISNULL(D.Department, 'Unassigned') AS Department,
      ISNULL(DG.Designation, 'Unassigned') AS Designation,
      CONVERT(VARCHAR(10), S.attendanceDate, 120) AS AttendanceDate
    FROM DailyAttendanceSummary S
    INNER JOIN EmployeeMst E ON S.EmpMstId = E.EmpMstId
    LEFT JOIN DepartmentMst D ON E.DepartmentMstId = D.DepartmentMstId
    LEFT JOIN DesignationMst DG ON E.DesignationMstId = DG.DesignationMstId
    ${summaryWhereClause}
    ORDER BY S.attendanceDate ASC, S.EmpCode ASC
    `,
    {
      replacements: summaryReplacements,
      type: QueryTypes.SELECT,
    },
  );

  if (!invalidSummaries.length) {
    return res.status(200).json({
      success: true,
      message: "No invalid logs found for the selected criteria.",
      filters: { fromDate, toDate, EmpCode, DepartmentMstId },
      data: [],
    });
  }

  // 3. Build optimized collection criteria for targeting exact raw punches
  let punchWhereClause = `WHERE (`;
  const punchReplacements = {};

  invalidSummaries.forEach((summary, index) => {
    if (index > 0) punchWhereClause += ` OR `;

    const empParam = `EmpCode_${index}`;
    const dateParam = `Date_${index}`;

    punchWhereClause += `(P.EmpCode = :${empParam} AND CAST(P.punchTime AS DATE) = :${dateParam})`;

    punchReplacements[empParam] = summary.EmpCode;
    punchReplacements[dateParam] = summary.AttendanceDate;
  });

  punchWhereClause += `)`;

  // Query 2: Fetch raw punches (using CONVERT to lock exact database text time strings)
  const rawPunches = await db.sequelize.query(
    `
    SELECT 
      P.[id],
      P.[SyncTrackerId],
      P.[EmpCode],
      CONVERT(VARCHAR(8), P.punchTime, 108) AS PunchTime,   -- Formatted HH:MM:SS string
      P.[punchType],
      P.[punchSource],
      CONVERT(VARCHAR(10), P.punchTime, 120) AS PunchDateStr -- Used to match against AttendanceDate
    FROM PunchLogs P
    ${punchWhereClause}
    ORDER BY P.punchTime ASC
    `,
    {
      replacements: punchReplacements,
      type: QueryTypes.SELECT,
    },
  );

  // 4. Group and Pair punches using your custom logic map
  const groupedMap = {};

  // Initialize the dictionary map using our invalid summaries base rows
  invalidSummaries.forEach((summary) => {
    const key = `${summary.EmpMstId}_${summary.AttendanceDate}`;

    groupedMap[key] = {
      SummaryId: summary.SummaryId,
      EmpMstId: summary.EmpMstId,
      empCode: summary.EmpCode,
      empName: summary.EmpFullName,
      department: summary.Department,
      designation: summary.Designation,
      attendanceDate: summary.AttendanceDate,
      status: summary.Status,
      workHours: summary.WorkHours,
      otHours: summary.OTHours,
      lunchBreak: summary.LunchBreak,
      finalTotalHours: summary.FinalTotalHours,
      remark: summary.Remark,
      punches: [],
    };
  });

  // Loop through raw punches and run your target pairing logic
  for (const row of rawPunches) {
    // Look up summaries by checking which employee owns this punch on this specific date
    // Find the master summary entry corresponding to this punch
    const targetSummary = invalidSummaries.find(
      (s) => s.EmpCode === row.EmpCode && s.AttendanceDate === row.PunchDateStr,
    );

    if (!targetSummary) continue; // Skip punches that don't belong to an invalid log day

    const key = `${targetSummary.EmpMstId}_${targetSummary.AttendanceDate}`;
    const current = groupedMap[key];

    if (!current) continue;

    if (row.punchType === "IN") {
      // Create a new session for every IN
      current.punches.push({
        inSyncTrackerId: row.SyncTrackerId,
        inPunchId: row.id,
        in: row.PunchTime,
        outPunchId: null,
        out: null,
        source: row.punchSource,
      });
    } else if (row.punchType === "OUT") {
      // Find the most recent IN that doesn't have an OUT yet
      const openSession = current.punches.find((p) => p.in && !p.out);

      if (openSession) {
        // Pair the OUT with the open IN
        openSession.outSyncTrackerId = row.SyncTrackerId;
        openSession.outPunchId = row.id;
        openSession.out = row.PunchTime;
      } else {
        // No IN found? Add as an orphan OUT
        current.punches.push({
          inPunchId: null,
          in: null,
          outPunchId: row.id,
          outSyncTrackerId: row.SyncTrackerId,
          out: row.PunchTime,
          source: row.punchSource,
        });
      }
    }
  }

  // Convert the map objects back into a clean indexed array for the response data payload
  const responseData = Object.values(groupedMap);

  // 5. Return JSON response
  res.status(200).json({
    success: true,
    message: "Invalid punch logs report generated successfully.",
    count: responseData.length,
    filters: { fromDate, toDate, EmpCode, DepartmentMstId },
    data: responseData,
  });
};
