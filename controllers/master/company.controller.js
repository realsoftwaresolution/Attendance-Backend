const db = require("../../config/dbConnection");
const { AppError } = require("../../utils/AppError");

exports.getAll = async (req, res) => {
    const data = await db.CompanyMst.findAll({ where: { IsDelete: false } });
    return res.status(200).json({ message: 'Companies fetched successfully', data });
};

exports.add = async (req, res) => {
    const {
        code,
        companyName,
        ownerName,
        partnerName,
        designation,
        corporateCode,
        address,
        panNo,
        tanNo,
        companyCode,
        sortId
    } = req.body;

    const existing = await db.CompanyMst.findOne({ where: { CompanyName: companyName, IsDelete: false } });
    if (existing) throw new AppError("Company already exists", 400);

    const data = await db.CompanyMst.create({
        Code: code,
        CompanyName: companyName,
        OwnerName: ownerName,
        PartnerName: partnerName,
        Designation: designation,
        CorporateCode: corporateCode,
        Address: address,
        PANNo: panNo,
        TANNo: tanNo,
        CompanyCode: companyCode,
        SortId: sortId || 1,
        LogID: req.logId,
        PcID: req.pcId,
        Sflag: 'I',
        Active: true,
        IsDelete: false
    });

    return res.status(201).json({ message: 'Company added successfully', data });
};

exports.update = async (req, res) => {
    const { id } = req.params;

    const entry = await db.CompanyMst.findByPk(id);

    if (!entry) {
        throw new AppError("Company not found", 404);
    }

    const existingCompany = await db.CompanyMst.findOne({
        where: {
            CompanyName: req.body.companyName,
            IsDelete: false,
            id: {
                [Op.ne]: id
            }
        }
    });

    if (existingCompany) {
        throw new AppError("Company name already exists", 400);
    }

    const updateData = {
        Code: req.body.code,
        CompanyName: req.body.companyName,
        OwnerName: req.body.ownerName,
        PartnerName: req.body.partnerName,
        Designation: req.body.designation,
        CorporateCode: req.body.corporateCode,
        Address: req.body.address,
        PANNo: req.body.panNo,
        TANNo: req.body.tanNo,
        CompanyCode: req.body.companyCode,
        SortId: req.body.sortId,
        LogID: req.logId,
        PcID: req.pcId,
        Sflag: 'U'
    };

    await entry.update(updateData);

    return res.status(200).json({
        message: 'Company updated successfully',
        data: entry
    });
};

exports.remove = async (req, res) => {
    const entry = await db.CompanyMst.findByPk(req.params.id);
    if (!entry) throw new AppError("Company not found", 404);

    await entry.update({ IsDelete: true, Sflag: 'D', LogID: req.logId, PcID: req.pcId });
    return res.status(200).json({ message: 'Company deleted successfully', data: null });
};