const { Op } = require("sequelize");
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
        sortId
    } = req.body;

    const existing = await db.CompanyMst.findOne({
        where: {
            [Op.or]: [
                { CompanyName: companyName },
                { Code: code }
            ],
            IsDelete: false
        }
    });

    if (existing) {
        const field = existing.Code === code ? "Company code" : "Company name";
        throw new AppError(`${field} already exists`, 400);
    }

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
        SortId: sortId || 1,
        LogID: req.logId,
        PcID: req.pcId,
        Sflag: 'I',
        Active: true,
        IsDelete: false
    });

    return res.status(201).json({
        success: true,
        message: 'Company added successfully',
        data
    });
};

exports.update = async (req, res) => {
    try {
        const { id } = req.params;
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
            sortId
        } = req.body;

        const entry = await db.CompanyMst.findByPk(id);

        if (!entry) {
            return res.status(404).json({ success: false, message: "Company not found" });
        }

        const duplicate = await db.CompanyMst.findOne({
            where: {
                [Op.or]: [
                    { CompanyName: companyName },
                    { Code: code }
                ],
                IsDelete: false,
                CompanyMstId: { [Op.ne]: id }
            }
        });

        if (duplicate) {
            const field = duplicate.Code === code ? "Code" : "Company name";
            return res.status(400).json({
                success: false,
                message: `${field} already exists for another company.`
            });
        }

        const updateData = {
            Code: code,
            CompanyName: companyName,
            OwnerName: ownerName,
            PartnerName: partnerName,
            Designation: designation,
            CorporateCode: corporateCode,
            Address: address,
            PANNo: panNo,
            TANNo: tanNo,
            SortId: sortId,
            LogID: req.logId,
            PcID: req.pcId,
            Sflag: 'U'
        };

        await entry.update(updateData);

        return res.status(200).json({
            success: true,
            message: 'Company updated successfully',
            data: entry
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Error updating company",
            error: error.message
        });
    }
};

exports.remove = async (req, res) => {
    const entry = await db.CompanyMst.findByPk(req.params.id);
    if (!entry) throw new AppError("Company not found", 404);

    await entry.update({ IsDelete: true, Sflag: 'D', LogID: req.logId, PcID: req.pcId });
    return res.status(200).json({ message: 'Company deleted successfully', data: null });
};