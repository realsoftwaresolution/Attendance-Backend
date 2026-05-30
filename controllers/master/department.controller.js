const db = require("../../config/dbConnection");
const { AppError } = require("../../utils/AppError");

exports.getAll = async (req, res) => {
    const data = await db.DepartmentMst.findAll({
        where: { IsDelete: false }
    });
    return res.status(200).json({ message: 'Departments fetched successfully', data });
};

exports.add = async (req, res) => {
    const { code, department, monthHours, companyCode, sortId } = req.body;

    const existing = await db.DepartmentMst.findOne({ where: { Department: department,IsDelete: false } });
    if (existing) throw new AppError("Department already exists", 400);

    const data = await db.DepartmentMst.create({
        Code: code,
        Department: department,
        MonthHours: monthHours,
        CompanyCode: companyCode,
        SortId: sortId || 1,
        LogID: req.logId,
        PcID: req.pcId,
        Sflag: 'I',
        Active: true,
        IsDelete: false
    });

    return res.status(201).json({ message: 'Department added successfully', data });
};

exports.update = async (req, res) => {
    const entry = await db.DepartmentMst.findByPk(req.params.id);
    if (!entry) throw new AppError("Department not found", 404);

    const { code, department, monthHours, companyCode, sortId } = req.body;
    const updateData = {
        Code: code,
        Department: department,
        MonthHours: monthHours,
        CompanyCode: companyCode,
        SortId: sortId,
        LogID: req.logId,
        PcID: req.pcId,
        Sflag: 'U'
    };

    await entry.update(updateData);
    return res.status(200).json({ message: 'Department updated successfully', data: entry });
};

exports.remove = async (req, res) => {
    const entry = await db.DepartmentMst.findByPk(req.params.id);
    if (!entry) throw new AppError("Department not found", 404);

    await entry.update({ IsDelete: true, Sflag: 'D', LogID: req.logId, PcID: req.pcId });
    return res.status(200).json({ message: 'Department deleted successfully', data: null });
};