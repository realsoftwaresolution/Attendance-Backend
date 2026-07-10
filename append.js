const fs = require('fs');
const content = `
exports.downloadAdvanceImportTemplate = async (req, res, next) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Advance Import Template');

    worksheet.columns = [
        { header: 'Emp Name', key: 'EmpName', width: 25 },
        { header: 'Emp Code', key: 'EmpCode', width: 15 },
        { header: 'Department', key: 'Department', width: 20 },
        { header: 'Designation', key: 'Designation', width: 20 },
        { header: 'Advance Date', key: 'AdvanceDate', width: 20 },
        { header: 'Advance Amount', key: 'AdvanceAmount', width: 20 },
        { header: 'Remark', key: 'Remark', width: 40 }
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    worksheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Advance_Import_Template.xlsx');

    await workbook.xlsx.write(res);
    res.end();
};

exports.bulkImportAdvances = async (req, res, next) => {
    if (!req.file) throw new AppError('No file uploaded', 400);

    const { transaction } = req;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const worksheet = workbook.worksheets[0];

    const errors = [];
    const validPayloads = [];

    const headerMap = {};
    const firstRow = worksheet.getRow(1);
    firstRow.eachCell((cell, colNumber) => {
      const cleanHeader = String(cell.value).toLowerCase().replace(/\\s+/g, '');
      headerMap[cleanHeader] = colNumber;
    });

    const getVal = (row, colName) => {
      const cleanColName = String(colName).toLowerCase().replace(/\\s+/g, '');
      const colIndex = headerMap[cleanColName];
      if (!colIndex) return null;
      let val = row.getCell(colIndex).value;
      if (val && typeof val === 'object') {
        if (val.richText) val = val.richText.map(rt => rt.text).join('');
        else if (val.result !== undefined) val = val.result;
        else if (val instanceof Date) {
          val = moment(val).format('YYYY-MM-DD');
        }
      }
      let finalVal = val !== null && val !== undefined ? String(val).trim() : null;
      if (finalVal && cleanColName.includes('date')) {
         finalVal = finalVal.substring(0, 10);
      }
      return finalVal;
    };

    const companyRecords = await db.CompanyMst.findAll({ attributes: ['CompanyMstId', 'CompanyName'] });
    const deptRecords = await db.DepartmentMst.findAll({ attributes: ['DepartmentMstId', 'Department'] });
    const desigRecords = await db.DesignationMst.findAll({ attributes: ['DesignationMstId', 'Designation'] });
    const empRecords = await db.EmployeeMst.findAll({ attributes: ['EmpMstId', 'EmpCode', 'CompanyMstId'], where: { Active: true } });

    const toMap = (records, nameKey, idKey) => {
      const map = new Map();
      records.forEach(r => {
        if (r[nameKey]) map.set(String(r[nameKey]).trim().toLowerCase(), r[idKey]);
      });
      return map;
    };

    const deptMap = toMap(deptRecords, 'Department', 'DepartmentMstId');
    const desigMap = toMap(desigRecords, 'Designation', 'DesignationMstId');
    
    const empMap = new Map();
    empRecords.forEach(e => {
        empMap.set(String(e.EmpCode).trim(), { EmpMstId: e.EmpMstId, CompanyMstId: e.CompanyMstId });
    });

    for (let i = 2; i <= worksheet.rowCount; i++) {
        const row = worksheet.getRow(i);
        
        const empCode = getVal(row, 'EmpCode');
        const deptStr = getVal(row, 'Department');
        const desigStr = getVal(row, 'Designation');
        
        let advanceDate = getVal(row, 'AdvanceDate');
        if (!advanceDate) advanceDate = moment().format('YYYY-MM-DD');

        // skip empty rows
        if (!empCode && !deptStr && !desigStr && !getVal(row, 'AdvanceAmount')) continue;

        const empData = empCode ? empMap.get(String(empCode).trim()) : null;
        const deptId = deptStr ? deptMap.get(deptStr.toLowerCase()) : null;
        const desigId = desigStr ? desigMap.get(desigStr.toLowerCase()) : null;

        const rowErrors = [];
        if (!empData) rowErrors.push(\`Employee Code '\${empCode}' not found in active employees\`);
        if (!deptId) rowErrors.push(\`Department '\${deptStr}' not found\`);
        if (!desigId) rowErrors.push(\`Designation '\${desigStr}' not found\`);

        if (rowErrors.length > 0) {
            errors.push({ row: i, errors: rowErrors });
            continue;
        }

        const payload = {
            EmpCode: empCode,
            EmpMstId: empData.EmpMstId,
            CompanyMstId: empData.CompanyMstId,
            DepartmentMstId: deptId,
            DesignationMstId: desigId,
            AdvanceDate: advanceDate,
            AdvanceType: 'Advance',
            AdvanceAmount: Number(getVal(row, 'AdvanceAmount') || 0),
            Remarks: getVal(row, 'Remark')
        };

        const { error, value } = advanceBulkImportSchema.validate(payload, { abortEarly: false });

        if (error) {
            errors.push({
                row: i,
                errors: error.details.map(err => err.message.replace(/\\"/g, ''))
            });
        } else {
            const today = moment().startOf('day');
            if (moment(value.AdvanceDate).isAfter(today, 'day')) {
                errors.push({ row: i, errors: ['Future advance dates are not allowed.'] });
            } else {
                validPayloads.push(value);
            }
        }
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed for some rows',
            errors
        });
    }

    if (validPayloads.length === 0) {
        return res.status(400).json({ success: false, message: 'No valid data found to import' });
    }

    for (const data of validPayloads) {
        const latestSalary = await db.SalaryDet.findOne({
            where: { EmpMstId: data.EmpMstId, Active: true },
            order: [['SalaryMonth', 'DESC']],
            transaction
        });

        const advanceMonth = moment(data.AdvanceDate).format('YYYY-MM');
        if (latestSalary && advanceMonth <= latestSalary.SalaryMonth) {
            throw new AppError(\`Row with EmpCode \${data.EmpCode}: Salary already processed till \${latestSalary.SalaryMonth}. Advance date must be after that month.\`, 400);
        }

        await db.AdvanceMst.create({
            EmpMstId: data.EmpMstId,
            CompanyMstId: data.CompanyMstId,
            DepartmentMstId: data.DepartmentMstId,
            DesignationMstId: data.DesignationMstId,
            AdvanceDate: data.AdvanceDate,
            AdvanceType: data.AdvanceType,
            AdvanceAmount: data.AdvanceAmount,
            Remarks: data.Remarks,
            IsClosed: false,
            ClosedDate: null,
            Active: true
        }, { transaction });
    }

    return res.status(200).json({
        success: true,
        message: \`Successfully imported \${validPayloads.length} advanced entries.\`
    });
};
`;
fs.appendFileSync('controllers/master/advanced-entry.controller.js', content);
