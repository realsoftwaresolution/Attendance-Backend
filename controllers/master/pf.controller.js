const moment = require('moment');
const db = require('../../config/dbConnection');
const { AppError } = require('../../utils/AppError');
const { Op, QueryTypes } = require('sequelize');
const { validateSlabRanges } = require('../../utils/master.helper');

exports.createPFDetail = async (req, res) => {
    const transaction = req.transaction;

    const {
        CompanyMstId,
        BranchMstId,
        FromDate,
        Slabs
    } = req.body;

    const formattedFromDate = moment(
        FromDate,
        'YYYY-MM-DD',
        true
    ).format('YYYY-MM-DD');

    validateSlabRanges(Slabs);

    const existingActiveRows = await db.PFDet.findAll({
        where: {
            CompanyMstId,
            Active: true,
            ToDate: null
        },
        order: [['FromDate', 'DESC']],
        transaction
    });

    // Prevent backdated or same-date entry
    if (existingActiveRows.length) {
        const latestActiveFromDate = moment(
            existingActiveRows[0].FromDate
        ).format('YYYY-MM-DD');

        if (
            moment(formattedFromDate, 'YYYY-MM-DD').isSameOrBefore(
                moment(latestActiveFromDate, 'YYYY-MM-DD'),
                'day'
            )
        ) {
            throw new AppError(
                `FromDate must be greater than current active slab date (${latestActiveFromDate})`,
                400
            );
        }

        const closeDate = moment(formattedFromDate, 'YYYY-MM-DD')
            .subtract(1, 'day')
            .format('YYYY-MM-DD');

        await db.PFDet.update(
            {
                ToDate: closeDate,
                Active: false
            },
            {
                where: {
                    CompanyMstId,
                    Active: true,
                    ToDate: null
                },
                transaction
            }
        );
    }

    const pfMaster = await db.PFMst.create(
        {
            BranchMstId,
            Sflag: 'I',
            LogID: req.logId,
            PcID: req.pcId
        },
        { transaction }
    );

    const pfDetails = Slabs.map((slab, index) => ({
        PFCode: pfMaster.PFCode,
        Srno: index + 1,

        FromDate: formattedFromDate,
        ToDate: null,

        FromAmt: slab.FromAmt,
        ToAmt: slab.ToAmt,

        EPF: slab.EPF,
        EPS: slab.EPS,

        EPFAB: slab.EPFAB || 0,
        Acc02: slab.Acc02 || 0,
        Acc21: slab.Acc21 || 0,
        Acc22: slab.Acc22 || 0,

        CutOffAmt: slab.CutOffAmt || 0,
        EPSCutOffAge: slab.EPSCutOffAge || null,

        CompanyMstId,
        BranchMstId,
        Active: true
    }));

    await db.PFDet.bulkCreate(
        pfDetails,
        { transaction }
    );

    return res.status(201).json({
        success: true,
        message: 'PF slabs created successfully.',
        data: {
            PFCode: pfMaster.PFCode,
            FromDate: formattedFromDate,
            SlabCount: pfDetails.length
        }
    });
};

exports.updatePFDetail = async (req, res) => {
    const transaction = req.transaction;
    const { PFCode } = req.params;

    const {
        CompanyMstId,
        BranchMstId,
        Slabs
    } = req.body;

    validateSlabRanges(Slabs);

    const pfMaster = await db.PFMst.findByPk(PFCode, {
        transaction
    });

    if (!pfMaster) {
        throw new AppError('PF Master not found.', 404);
    }

    const existingDetails = await db.PFDet.findAll({
        where: {
            PFCode
        },
        order: [['Srno', 'ASC']],
        transaction
    });

    if (!existingDetails.length) {
        throw new AppError('PF Details not found.', 404);
    }

    // Only latest active PF structure can be edited
    const latestPF = await db.PFDet.findOne({
        where: {
            CompanyMstId,
            BranchMstId,
            Active: true,
            ToDate: null
        },
        order: [['FromDate', 'DESC']],
        transaction
    });

    if (!latestPF) {
        throw new AppError(
            'No active PF structure found.',
            404
        );
    }

    if (Number(latestPF.PFCode) !== Number(PFCode)) {
        throw new AppError(
            'Only the latest active PF structure can be edited.',
            400
        );
    }

    // Keep original timeline values
    const originalFromDate = moment(
        existingDetails[0].FromDate
    ).format('YYYY-MM-DD');

    const originalToDate = existingDetails[0].ToDate
        ? moment(existingDetails[0].ToDate).format('YYYY-MM-DD')
        : null;

    const originalActive = existingDetails[0].Active;

    // Delete existing slabs
    await db.PFDet.destroy({
        where: {
            PFCode
        },
        transaction
    });

    // Recreate slabs
    const pfDetails = Slabs.map((slab, index) => ({
        PFCode,

        Srno: index + 1,

        FromDate: originalFromDate,
        ToDate: originalToDate,

        FromAmt: slab.FromAmt,
        ToAmt: slab.ToAmt,

        EPF: slab.EPF,
        EPS: slab.EPS,

        EPFAB: slab.EPFAB || 0,
        Acc02: slab.Acc02 || 0,
        Acc21: slab.Acc21 || 0,
        Acc22: slab.Acc22 || 0,

        CutOffAmt: slab.CutOffAmt || 0,
        EPSCutOffAge: slab.EPSCutOffAge || null,

        CompanyMstId,
        BranchMstId,

        Active: originalActive
    }));

    await db.PFDet.bulkCreate(
        pfDetails,
        { transaction }
    );

    await pfMaster.update(
        {
            Sflag: 'E',
            LogID: req.logId,
            PcID: req.pcId
        },
        {
            transaction
        }
    );

    return res.status(200).json({
        success: true,
        message: 'PF slabs updated successfully.',
        data: {
            PFCode: Number(PFCode),
            FromDate: originalFromDate,
            SlabCount: pfDetails.length
        }
    });
};

exports.deletePFDetail = async (req, res) => {
    const transaction = req.transaction;
    const { PFCode } = req.params;

    const pfMaster = await db.PFMst.findByPk(PFCode, {
        transaction
    });

    if (!pfMaster) {
        throw new AppError('PF Master not found.', 404);
    }

    const currentPF = await db.PFDet.findOne({
        where: {
            PFCode
        },
        transaction
    });

    if (!currentPF) {
        throw new AppError('PF Details not found.', 404);
    }

    const {
        CompanyMstId,
        BranchMstId
    } = currentPF;

    // Latest active PF only
    const latestActivePF = await db.PFDet.findOne({
        where: {
            CompanyMstId,
            BranchMstId,
            Active: true,
            ToDate: null
        },
        order: [['FromDate', 'DESC']],
        transaction
    });

    if (!latestActivePF) {
        throw new AppError(
            'No active PF structure found.',
            404
        );
    }

    if (Number(latestActivePF.PFCode) !== Number(PFCode)) {
        throw new AppError(
            'Only the latest active PF structure can be deleted.',
            400
        );
    }

    // Find previous PF version
    const previousPF = await db.PFDet.findOne({
        where: {
            CompanyMstId,
            BranchMstId,
            PFCode: {
                [Op.ne]: PFCode
            }
        },
        order: [['FromDate', 'DESC']],
        transaction
    });

    // Delete details
    await db.PFDet.destroy({
        where: {
            PFCode
        },
        transaction
    });

    // Delete master
    await db.PFMst.destroy({
        where: {
            PFCode
        },
        transaction
    });

    // Reopen previous version
    if (previousPF) {
        await db.PFDet.update(
            {
                ToDate: null,
                Active: true
            },
            {
                where: {
                    PFCode: previousPF.PFCode
                },
                transaction
            }
        );
    }

    return res.status(200).json({
        success: true,
        message: 'PF structure deleted successfully.'
    });
};

exports.getPFList = async (req, res) => {
    const { CompanyMstId } = req.query;

    let whereClause = '';

    const replacements = {};

    if (CompanyMstId) {
        whereClause = 'WHERE d.CompanyMstId = :CompanyMstId';
        replacements.CompanyMstId = CompanyMstId;
    }

    const data = await db.sequelize.query(
        `
    SELECT
        d.PFCode,
        d.FromDate,
           ISNULL(CONVERT(VARCHAR(10), d.ToDate, 23), '-') AS ToDate,
        d.CompanyMstId,
        c.CompanyName
    FROM PFDet d
    INNER JOIN CompanyMst c
        ON c.CompanyMstId = d.CompanyMstId
    ${whereClause}
    GROUP BY
        d.PFCode,
        d.FromDate,
        d.ToDate,
        d.CompanyMstId,
        c.CompanyName
    ORDER BY
        d.FromDate DESC
    `,
        {
            replacements,
            type: QueryTypes.SELECT
        }
    );

    return res.status(200).json({
        success: true,
        count: data.length,
        data
    });
};

exports.getPFDetailByPFCode = async (req, res) => {
    const { PFCode } = req.params;

    const data = await db.sequelize.query(
        `
        SELECT
            d.PFDetId,
            d.PFCode,
            d.Srno,

            d.CompanyMstId,
            c.CompanyName,

            d.BranchMstId,

            CONVERT(VARCHAR(10), d.FromDate, 23) AS FromDate,
            ISNULL(CONVERT(VARCHAR(10), d.ToDate, 23), '-') AS ToDate,

            d.FromAmt,
            d.ToAmt,

            d.EPF,
            d.EPS,

            d.EPFAB,
            d.Acc02,
            d.Acc21,
            d.Acc22,

            d.CutOffAmt,
            d.EPSCutOffAge,

            d.Active,
            d.createdAt,
            d.updatedAt
        FROM PFDet d
        INNER JOIN CompanyMst c
            ON c.CompanyMstId = d.CompanyMstId
        WHERE d.PFCode = :PFCode
        ORDER BY d.Srno
        `,
        {
            replacements: { PFCode },
            type: QueryTypes.SELECT
        }
    );

    if (!data.length) {
        throw new AppError(
            'PF details not found.',
            404
        );
    }

    return res.status(200).json({
        success: true,
        data
    });
};