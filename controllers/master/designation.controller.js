const { Op } = require("sequelize");
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

    // Check if Designation name OR Code already exists
    const existing = await db.DesignationMst.findOne({
        where: {
            [Op.or]: [
                { Designation: designation },
                { Code: code }
            ],
            IsDelete: false
        }
    });

    if (existing) {
        const field = (existing.Code === code) ? "Designation code" : "Designation name";
        throw new AppError(`${field} already exists`, 400);
    }

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

    return res.status(201).json({ success: true, message: 'Designation added successfully', data: entry });
};

exports.update = async (req, res) => {
    const { id } = req.params;
    const { code, designation, companyCode, sortId } = req.body;

    const entry = await db.DesignationMst.findByPk(id);
    if (!entry) throw new AppError("Designation not found", 404);

    const duplicate = await db.DesignationMst.findOne({
        where: {
            [Op.or]: [
                { Designation: designation },
                { Code: code }
            ],
            IsDelete: false,
            DesignationMstId: { [Op.ne]: id }
        }
    });

    if (duplicate) {
        const field = (duplicate.Code === code) ? "Designation code" : "Designation name";
        throw new AppError(`${field} already exists for another designation`, 400);
    }

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
    return res.status(200).json({ success: true, message: 'Designation updated successfully', data: entry });
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