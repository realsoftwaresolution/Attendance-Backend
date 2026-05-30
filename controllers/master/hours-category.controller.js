const db = require("../../config/dbConnection");
const { AppError } = require("../../utils/AppError");

exports.getAll = async (req, res) => {
    const entry = await db.HoursCategoryMst.findAll({ where: { IsDelete: false } });
    return res.status(200).json({ message: 'Fetched successfully', data: entry });
};

exports.add = async (req, res) => {
    const { code, hours, companyCode, sortId } = req.body;


    const existing = await db.HoursCategoryMst.findOne({ where: { Code: code, IsDelete: false } });
    if (existing) throw new AppError("Code already exists", 400);

    const entry = await db.HoursCategoryMst.create({
        Code: code,
        Hours: hours,
        CompanyCode: companyCode,
        SortId: sortId || 1,
        LogID: req.logId,
        PcID: req.pcId,
        Sflag: 'I',
        Active: true,
        IsDelete: false
    });

    return res.status(201).json({ message: 'Added successfully', data: entry });
};

exports.update = async (req, res) => {
    const category = await db.HoursCategoryMst.findByPk(req.params.id);
    if (!category) throw new AppError("Not found", 404);

    const { code, hours, companyCode, sortId } = req.body;

    const updateData = {
        Code: code,
        Hours: hours,
        CompanyCode: companyCode,
        SortId: sortId,
        LogID: req.logId,
        PcID: req.pcId,
        Sflag: 'U'
    };

    await category.update(updateData);
    return res.status(200).json({ message: 'Updated successfully', data: category });
};

exports.remove = async (req, res) => {
    const entry = await db.HoursCategoryMst.findByPk(req.params.id);
    if (!entry) throw new AppError("Not found", 404);

    await entry.update({
        IsDelete: true,
        Sflag: 'D',
        LogID: req.logId,
        PcID: req.pcId
    });

    return res.status(200).json({ message: 'Deleted successfully' });
};