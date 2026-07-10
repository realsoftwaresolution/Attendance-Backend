const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'controllers', 'reports', 'reports.controller.js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add the helper function at the top
const helperCode = `
const getResignationFilterSQL = () => {
    return \` AND (E.DateOfResign IS NULL OR E.DateOfResign = '' OR CAST(:TargetReportEndDate AS DATE) <= DATEADD(day, 30, CAST(E.DateOfResign AS DATE)))\`;
};
`;
if (!content.includes('getResignationFilterSQL')) {
    content = content.replace('const ExcelJS = require("exceljs");', 'const ExcelJS = require("exceljs");\nconst moment = require("moment");\n' + helperCode);
}

// 2. buildReportQuery (handles Daily In/Out, Dept In/Out, Emp In/Out)
if (content.includes('whereClause += ` AND CAST(P.punchTime AS DATE) BETWEEN :FromDate AND :ToDate`;')) {
    content = content.replace(
        'whereClause += ` AND CAST(P.punchTime AS DATE) BETWEEN :FromDate AND :ToDate`;',
        'whereClause += ` AND CAST(P.punchTime AS DATE) BETWEEN :FromDate AND :ToDate`;\n  whereClause += getResignationFilterSQL();\n  replacements.TargetReportEndDate = toDate;'
    );
}

// 3. getInvalidLogsWithPunches
if (content.includes('summaryWhereClause += ` AND CAST(S.attendanceDate AS DATE) BETWEEN :FromDate AND :ToDate`;')) {
    content = content.replace(
        'summaryWhereClause += ` AND CAST(S.attendanceDate AS DATE) BETWEEN :FromDate AND :ToDate`;',
        'summaryWhereClause += ` AND CAST(S.attendanceDate AS DATE) BETWEEN :FromDate AND :ToDate`;\n  summaryWhereClause += getResignationFilterSQL();\n  summaryReplacements.TargetReportEndDate = toDate;'
    );
}

// 4. getDetailedSalaryStatement
if (content.includes('let whereClause = `WHERE SD.SalaryMonth = :SalaryMonth AND SD.Active = 1`;')) {
    content = content.replace(
        'let whereClause = `WHERE SD.SalaryMonth = :SalaryMonth AND SD.Active = 1`;\n  const replacements = { SalaryMonth };',
        'let whereClause = `WHERE SD.SalaryMonth = :SalaryMonth AND SD.Active = 1`;\n  const replacements = { SalaryMonth, TargetReportEndDate: moment(SalaryMonth, "YYYY-MM").endOf("month").format("YYYY-MM-DD") };\n  whereClause += getResignationFilterSQL();'
    );
}

// 5. getSalarySlipReport
if (content.includes('const replacements = { empMstIds, SalaryMonth };')) {
    content = content.replace(
        'const replacements = { empMstIds, SalaryMonth };',
        'const replacements = { empMstIds, SalaryMonth, TargetReportEndDate: moment(SalaryMonth, "YYYY-MM").endOf("month").format("YYYY-MM-DD") };'
    );
    // There are queries in getSalarySlipReport. 
    content = content.replace(
        'WHERE SD.EmpMstId IN (:empMstIds) AND SD.SalaryMonth = :SalaryMonth AND SD.Active = 1',
        'WHERE SD.EmpMstId IN (:empMstIds) AND SD.SalaryMonth = :SalaryMonth AND SD.Active = 1' + 
        " AND (E.DateOfResign IS NULL OR E.DateOfResign = '' OR CAST(:TargetReportEndDate AS DATE) <= DATEADD(day, 30, CAST(E.DateOfResign AS DATE)))"
    );
}

// 6. getSalaryReport
if (content.includes('let whereClause = `WHERE SD.SalaryMonth = :SalaryMonth`;')) {
    content = content.replace(
        'let whereClause = `WHERE SD.SalaryMonth = :SalaryMonth`;\n  const replacements = { SalaryMonth: salaryMonth };',
        'let whereClause = `WHERE SD.SalaryMonth = :SalaryMonth`;\n  const replacements = { SalaryMonth: salaryMonth, TargetReportEndDate: moment(salaryMonth, "YYYY-MM").endOf("month").format("YYYY-MM-DD") };\n  whereClause += getResignationFilterSQL();'
    );
}

// 7. getNetSalaryExcel (uses same logic as getSalaryReport, wait, getNetSalaryExcel is inside the file)
if (content.includes('let whereClause = `WHERE SD.SalaryMonth = :SalaryMonth`;')) {
    // Already handled above if they share it, wait, let's just do a generic replace for getNetSalaryExcel if it has its own.
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Patch applied successfully.');
