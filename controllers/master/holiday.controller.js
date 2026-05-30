const db = require("../../config/dbConnection");
const { AppError } = require("../../utils/AppError");

exports.getAll = async (req, res) => {
    const entry = await db.HolidayMst.findAll({
        where: { IsDelete: false }
    });

    return res.status(200).json({
        message: 'Holidays fetched successfully',
        data: entry
    });
};

exports.add = async (req, res) => {
    const { date, holiday, companyCode, sortId } = req.body;

    const existing = await db.HolidayMst.findOne({ where: { Holiday: holiday, Date: date, IsDelete: false } });
    if (existing) throw new AppError("Holiday already exists for this date", 400);

    const entry = await db.HolidayMst.create({
        Date: date,
        Holiday: holiday,
        CompanyCode: companyCode,
        SortId: sortId || 1,
        LogID: req.logId,
        PcID: req.pcId,
        Sflag: 'I',
        Active: true,
        IsDelete: false
    });

    return res.status(201).json({ message: 'Holiday added successfully', data: entry });
};

exports.update = async (req, res) => {
    const { id } = req.params;
    const entry = await db.HolidayMst.findByPk(id);

    if (!entry) throw new AppError("Holiday not found", 404);

    const { date, holiday, companyCode, sortId } = req.body;

    const updateData = {
        Date: date,
        Holiday: holiday,
        CompanyCode: companyCode,
        SortId: sortId,
        LogID: req.logId,
        PcID: req.pcId,
        Sflag: 'U'
    };

    await entry.update(updateData);

    return res.status(200).json({
        message: 'Holiday updated successfully',
        data: entry
    });
};

exports.remove = async (req, res) => {
    const entry = await db.HolidayMst.findByPk(req.params.id);

    if (!entry) throw new AppError("Holiday not found", 404);

    await entry.update({
        IsDelete: true,
        Sflag: 'D',
        LogID: req.logId,
        PcID: req.pcId
    });

    return res.status(200).json({ message: 'Holiday deleted successfully' });
};