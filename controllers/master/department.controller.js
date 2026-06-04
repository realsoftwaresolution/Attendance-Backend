const { Op } = require("sequelize");
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

    const existing = await db.DepartmentMst.findOne({
        where: {
            [Op.or]: [
                { Department: department },
                { Code: code }
            ],
            IsDelete: false
        }
    });

    if (existing) {
        const field = (existing.Code === code) ? "Department code" : "Department name";
        throw new AppError(`${field} already exists`, 400);
    }

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

    return res.status(201).json({ success: true, message: 'Department added successfully', data });
};

exports.update = async (req, res) => {
    const { id } = req.params;
    const { code, department, monthHours, companyCode, sortId } = req.body;

    const entry = await db.DepartmentMst.findByPk(id);
    if (!entry) throw new AppError("Department not found", 404);

    const duplicate = await db.DepartmentMst.findOne({
        where: {
            [Op.or]: [
                { Department: department },
                { Code: code }
            ],
            IsDelete: false,
            DepartmentMstId: { [Op.ne]: id }
        }
    });

    if (duplicate) {
        const field = (duplicate.Code === code) ? "Department code" : "Department name";
        throw new AppError(`${field} already exists for another department`, 400);
    }

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
    return res.status(200).json({ success: true, message: 'Department updated successfully', data: entry });
};

exports.remove = async (req, res) => {
    const entry = await db.DepartmentMst.findByPk(req.params.id);
    if (!entry) throw new AppError("Department not found", 404);

    await entry.update({ IsDelete: true, Sflag: 'D', LogID: req.logId, PcID: req.pcId });
    return res.status(200).json({ message: 'Department deleted successfully', data: null });
};