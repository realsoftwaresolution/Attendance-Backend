const db = require("../../config/dbConnection");
const { AppError } = require("../../utils/AppError");

exports.getAll = async (req, res) => {
    const entry = await db.DesignationMst.findAll({
        where: { IsDelete: false }
    });
    return res.status(200).json({ message: 'Designations fetched successfully', data: entry });
};

exports.add = async (req, res) => {
    const { code, designation, companyCode, sortId } = req.body;

    const existing = await db.DesignationMst.findOne({ where: { Designation: designation,IsDelete: false } });
    if (existing) throw new AppError("Designation already exists", 400);

    const entry = await db.DesignationMst.create({
        Code: code,
        Designation: designation,
        CompanyCode: companyCode,
        SortId: sortId || 1,
        LogID: req.logId,
        PcID: req.pcId,
        Sflag: 'I',
        Active: true,
        IsDelete: false
    });

    return res.status(201).json({ message: 'Designation added successfully', data: entry });
};

exports.update = async (req, res) => {
    const entry = await db.DesignationMst.findByPk(req.params.id);
    if (!entry) throw new AppError("Designation not found", 404);

    const { code, designation, companyCode, sortId } = req.body;
    const updateData = {
        Code: code,
        Designation: designation,
        CompanyCode: companyCode,
        SortId: sortId,
        LogID: req.logId,
        PcID: req.pcId,
        Sflag: 'U'
    };

    await entry.update(updateData);
    return res.status(200).json({ message: 'Designation updated successfully', data: entry });
};

exports.remove = async (req, res) => {
    const entry = await db.DesignationMst.findByPk(req.params.id);
    if (!entry) throw new AppError("Designation not found", 404);

    await entry.update({
        IsDelete: true,
        Sflag: 'D',
        LogID: req.logId,
        PcID: req.pcId
    });

    return res.status(200).json({ message: 'Designation deleted successfully' });
};