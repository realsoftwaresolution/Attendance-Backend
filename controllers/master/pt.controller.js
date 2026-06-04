const moment = require('moment');
const db = require('../../config/dbConnection');
const { AppError } = require('../../utils/appError');
const { Op, QueryTypes } = require('sequelize');
const { validateSlabRanges } = require('../../utils/master.helper');

exports.createPTDetail = async (req, res) => {
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

    const existingActiveRows = await db.PTDet.findAll({
        where: {
            CompanyMstId,
            BranchMstId,
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

        await db.PTDet.update(
            {
                ToDate: closeDate,
                Active: false
            },
            {
                where: {
                    CompanyMstId,
                    BranchMstId,
                    Active: true,
                    ToDate: null
                },
                transaction
            }
        );
    }

    // Create PT Master
    const ptMaster = await db.PTMst.create(
        {
            BranchMstId,
            Sflag: 'I',
            LogID: req.logId,
            PcID: req.pcId
        },
        { transaction }
    );

    const ptDetails = Slabs.map((slab, index) => ({
        PTCode: ptMaster.PTCode,

        Srno: index + 1,

        FromDate: formattedFromDate,
        ToDate: null,

        FromAmt: slab.FromAmt,
        ToAmt: slab.ToAmt,

        TaxRate: slab.TaxRate,

        CompanyMstId,
        BranchMstId,

        Active: true
    }));

    await db.PTDet.bulkCreate(
        ptDetails,
        { transaction }
    );

    return res.status(201).json({
        success: true,
        message: 'PT slabs created successfully.',
        data: {
            PTCode: ptMaster.PTCode,
            FromDate: formattedFromDate,
            SlabCount: ptDetails.length
        }
    });
};

exports.updatePTDetail = async (req, res) => {
    const transaction = req.transaction;
    const { PTCode } = req.params;

    const {
        CompanyMstId,
        BranchMstId,
        Slabs
    } = req.body;

    validateSlabRanges(Slabs);

    const ptMaster = await db.PTMst.findByPk(PTCode, {
        transaction
    });

    if (!ptMaster) {
        throw new AppError(
            'PT Master not found.',
            404
        );
    }

    const existingDetails = await db.PTDet.findAll({
        where: {
            PTCode
        },
        order: [['Srno', 'ASC']],
        transaction
    });

    if (!existingDetails.length) {
        throw new AppError(
            'PT Details not found.',
            404
        );
    }

    // Only latest active PT can be edited
    const latestPT = await db.PTDet.findOne({
        where: {
            CompanyMstId,
            BranchMstId,
            Active: true,
            ToDate: null
        },
        order: [['FromDate', 'DESC']],
        transaction
    });

    if (!latestPT) {
        throw new AppError(
            'No active PT structure found.',
            404
        );
    }

    if (Number(latestPT.PTCode) !== Number(PTCode)) {
        throw new AppError(
            'Only the latest active PT structure can be edited.',
            400
        );
    }

    const originalFromDate = moment(
        existingDetails[0].FromDate
    ).format('YYYY-MM-DD');

    const originalToDate = existingDetails[0].ToDate || null;

    const originalActive = existingDetails[0].Active;

    // Delete existing slabs
    await db.PTDet.destroy({
        where: {
            PTCode
        },
        transaction
    });

    // Recreate slabs
    const ptDetails = Slabs.map((slab, index) => ({
        PTCode,

        Srno: index + 1,

        FromDate: originalFromDate,
        ToDate: originalToDate,

        FromAmt: slab.FromAmt,
        ToAmt: slab.ToAmt,

        TaxRate: slab.TaxRate,

        CompanyMstId,
        BranchMstId,

        Active: originalActive
    }));

    await db.PTDet.bulkCreate(
        ptDetails,
        { transaction }
    );

    await ptMaster.update(
        {
            Sflag: 'U',
            LogID: req.logId,
            PcID: req.pcId
        },
        { transaction }
    );

    return res.status(200).json({
        success: true,
        message: 'PT slabs updated successfully.',
        data: {
            PTCode: Number(PTCode),
            FromDate: originalFromDate,
            SlabCount: ptDetails.length
        }
    });
};

exports.deletePTDetail = async (req, res) => {
    const transaction = req.transaction;
    const { PTCode } = req.params;

    const ptMaster = await db.PTMst.findByPk(PTCode, {
        transaction
    });

    if (!ptMaster) {
        throw new AppError(
            'PT Master not found.',
            404
        );
    }

    const currentPT = await db.PTDet.findOne({
        where: {
            PTCode
        },
        transaction
    });

    if (!currentPT) {
        throw new AppError(
            'PT Details not found.',
            404
        );
    }

    const {
        CompanyMstId,
        BranchMstId
    } = currentPT;

    // Latest active PT only
    const latestActivePT = await db.PTDet.findOne({
        where: {
            CompanyMstId,
            BranchMstId,
            Active: true,
            ToDate: null
        },
        order: [['FromDate', 'DESC']],
        transaction
    });

    if (!latestActivePT) {
        throw new AppError(
            'No active PT structure found.',
            404
        );
    }

    if (Number(latestActivePT.PTCode) !== Number(PTCode)) {
        throw new AppError(
            'Only the latest active PT structure can be deleted.',
            400
        );
    }

    // Find previous PT version
    const previousPT = await db.PTDet.findOne({
        where: {
            CompanyMstId,
            BranchMstId,
            PTCode: {
                [Op.ne]: PTCode
            }
        },
        order: [['FromDate', 'DESC']],
        transaction
    });

    // Delete details
    await db.PTDet.destroy({
        where: {
            PTCode
        },
        transaction
    });

    // Delete master
    await db.PTMst.destroy({
        where: {
            PTCode
        },
        transaction
    });

    // Reopen previous version
    if (previousPT) {
        await db.PTDet.update(
            {
                ToDate: null,
                Active: true
            },
            {
                where: {
                    PTCode: previousPT.PTCode
                },
                transaction
            }
        );
    }

    return res.status(200).json({
        success: true,
        message: 'PT structure deleted successfully.'
    });
};

exports.getPTList = async (req, res) => {
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
            d.PTCode,
            d.CompanyMstId,
            c.CompanyName,
            CONVERT(VARCHAR(10), MIN(d.FromDate), 23) AS FromDate,
            ISNULL(CONVERT(VARCHAR(10), MAX(d.ToDate), 23), '-') AS ToDate
        FROM PTDet d
        INNER JOIN CompanyMst c
            ON c.CompanyMstId = d.CompanyMstId
        ${whereClause}
        GROUP BY
            d.PTCode,
            d.CompanyMstId,
            c.CompanyName
        ORDER BY
            MIN(d.FromDate) DESC
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

exports.getPTDetailByPTCode = async (req, res) => {
    const { PTCode } = req.params;

    const data = await db.sequelize.query(
        `
        SELECT
            d.PTDetId,
            d.PTCode,
            d.Srno,

            d.CompanyMstId,
            c.CompanyName,

            d.BranchMstId,

            CONVERT(VARCHAR(10), d.FromDate, 23) AS FromDate,
            ISNULL(CONVERT(VARCHAR(10), d.ToDate, 23), '-') AS ToDate,

            d.FromAmt,
            d.ToAmt,
            d.TaxRate,

            d.Active,

            d.createdAt,
            d.updatedAt
        FROM PTDet d
        INNER JOIN CompanyMst c
            ON c.CompanyMstId = d.CompanyMstId
        WHERE d.PTCode = :PTCode
        ORDER BY d.Srno
        `,
        {
            replacements: { PTCode },
            type: QueryTypes.SELECT
        }
    );

    if (!data.length) {
        throw new AppError(
            'PT details not found.',
            404
        );
    }

    return res.status(200).json({
        success: true,
        data
    });
};
