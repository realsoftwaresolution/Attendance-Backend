const moment = require('moment');
const db = require('../../config/dbConnection');
const { AppError } = require('../../utils/appError');
const { validateSlabRanges } = require('../../utils/master.helper');
const { Op, QueryTypes } = require('sequelize');


exports.createESICDetail = async (req, res) => {
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

    const existingActiveRows = await db.ESICDet.findAll({
        where: {
            CompanyMstId,
            BranchMstId,
            Active: true,
            ToDate: null
        },
        order: [['FromDate', 'DESC']],
        transaction
    });

    // Prevent backdated/same date entry
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

        await db.ESICDet.update(
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

    // Create Master
    const esicMaster = await db.ESICMst.create(
        {
            BranchMstId,
            Sflag: 'I',
            LogID: req.logId,
            PcID: req.pcId
        },
        { transaction }
    );

    // Create Details
    const esicDetails = Slabs.map((slab, index) => ({
        ESICCode: esicMaster.ESICCode,

        Srno: index + 1,

        FromDate: formattedFromDate,
        ToDate: null,

        FromAmt: slab.FromAmt,
        ToAmt: slab.ToAmt,

        EPF: slab.EPF,
        EPS: slab.EPS,

        CutOffAmt: slab.CutOffAmt || 0,

        CompanyMstId,
        BranchMstId,

        Active: true
    }));

    await db.ESICDet.bulkCreate(
        esicDetails,
        { transaction }
    );

    return res.status(201).json({
        success: true,
        message: 'ESIC slabs created successfully.',
        data: {
            ESICCode: esicMaster.ESICCode,
            FromDate: formattedFromDate,
            SlabCount: esicDetails.length
        }
    });
};

exports.updateESICDetail = async (req, res) => {
    const transaction = req.transaction;
    const { ESICCode } = req.params;

    const {
        CompanyMstId,
        BranchMstId,
        Slabs
    } = req.body;

    validateSlabRanges(Slabs);

    const esicMaster = await db.ESICMst.findByPk(
        ESICCode,
        { transaction }
    );

    if (!esicMaster) {
        throw new AppError(
            'ESIC Master not found.',
            404
        );
    }

    const existingDetails = await db.ESICDet.findAll({
        where: {
            ESICCode
        },
        order: [['Srno', 'ASC']],
        transaction
    });

    if (!existingDetails.length) {
        throw new AppError(
            'ESIC Details not found.',
            404
        );
    }

    // Only latest active ESIC can be edited
    const latestESIC = await db.ESICDet.findOne({
        where: {
            CompanyMstId,
            BranchMstId,
            Active: true,
            ToDate: null
        },
        order: [['FromDate', 'DESC']],
        transaction
    });

    if (!latestESIC) {
        throw new AppError(
            'No active ESIC structure found.',
            404
        );
    }

    if (Number(latestESIC.ESICCode) !== Number(ESICCode)) {
        throw new AppError(
            'Only the latest active ESIC structure can be edited.',
            400
        );
    }

    const originalFromDate = moment(
        existingDetails[0].FromDate
    ).format('YYYY-MM-DD');

    const originalToDate = existingDetails[0].ToDate || null;

    const originalActive = existingDetails[0].Active;

    await db.ESICDet.destroy({
        where: {
            ESICCode
        },
        transaction
    });

    const esicDetails = Slabs.map((slab, index) => ({
        ESICCode,

        Srno: index + 1,

        FromDate: originalFromDate,
        ToDate: originalToDate,

        FromAmt: slab.FromAmt,
        ToAmt: slab.ToAmt,

        EPF: slab.EPF,
        EPS: slab.EPS,

        CutOffAmt: slab.CutOffAmt || 0,

        CompanyMstId,
        BranchMstId,

        Active: originalActive
    }));

    await db.ESICDet.bulkCreate(
        esicDetails,
        { transaction }
    );

    await esicMaster.update(
        {
            Sflag: 'E',
            LogID: req.logId,
            PcID: req.pcId
        },
        { transaction }
    );

    return res.status(200).json({
        success: true,
        message: 'ESIC slabs updated successfully.',
        data: {
            ESICCode: Number(ESICCode),
            FromDate: originalFromDate,
            SlabCount: esicDetails.length
        }
    });
};

exports.deleteESICDetail = async (req, res) => {
    const transaction = req.transaction;
    const { ESICCode } = req.params;

    const esicMaster = await db.ESICMst.findByPk(ESICCode, {
        transaction
    });

    if (!esicMaster) {
        throw new AppError(
            'ESIC Master not found.',
            404
        );
    }

    const currentESIC = await db.ESICDet.findOne({
        where: {
            ESICCode
        },
        transaction
    });

    if (!currentESIC) {
        throw new AppError(
            'ESIC Details not found.',
            404
        );
    }

    const {
        CompanyMstId,
        BranchMstId
    } = currentESIC;

    // Only latest active ESIC can be deleted
    const latestActiveESIC = await db.ESICDet.findOne({
        where: {
            CompanyMstId,
            BranchMstId,
            Active: true,
            ToDate: null
        },
        order: [['FromDate', 'DESC']],
        transaction
    });

    if (!latestActiveESIC) {
        throw new AppError(
            'No active ESIC structure found.',
            404
        );
    }

    if (Number(latestActiveESIC.ESICCode) !== Number(ESICCode)) {
        throw new AppError(
            'Only the latest active ESIC structure can be deleted.',
            400
        );
    }

    // Find previous ESIC version
    const previousESIC = await db.ESICDet.findOne({
        where: {
            CompanyMstId,
            BranchMstId,
            ESICCode: {
                [Op.ne]: ESICCode
            }
        },
        order: [['FromDate', 'DESC']],
        transaction
    });

    // Delete details
    await db.ESICDet.destroy({
        where: {
            ESICCode
        },
        transaction
    });

    // Delete master
    await db.ESICMst.destroy({
        where: {
            ESICCode
        },
        transaction
    });

    // Reopen previous version
    if (previousESIC) {
        await db.ESICDet.update(
            {
                ToDate: null,
                Active: true
            },
            {
                where: {
                    ESICCode: previousESIC.ESICCode
                },
                transaction
            }
        );
    }

    return res.status(200).json({
        success: true,
        message: 'ESIC structure deleted successfully.'
    });
};

exports.getESICList = async (req, res) => {
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
            d.ESICCode,
            d.CompanyMstId,
            c.CompanyName,
            CONVERT(VARCHAR(10), MIN(d.FromDate), 23) AS FromDate,
            ISNULL(CONVERT(VARCHAR(10), MAX(d.ToDate), 23), '-') AS ToDate
        FROM ESICDet d
        INNER JOIN CompanyMst c
            ON c.CompanyMstId = d.CompanyMstId
        ${whereClause}
        GROUP BY
            d.ESICCode,
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

exports.getESICDetailByESICCode = async (req, res) => {
    const { ESICCode } = req.params;

    const data = await db.sequelize.query(
        `
        SELECT
            d.ESICDetId,
            d.ESICCode,
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

            d.CutOffAmt,

            d.Active,

            d.createdAt,
            d.updatedAt
        FROM ESICDet d
        INNER JOIN CompanyMst c
            ON c.CompanyMstId = d.CompanyMstId
        WHERE d.ESICCode = :ESICCode
        ORDER BY d.Srno
        `,
        {
            replacements: { ESICCode },
            type: QueryTypes.SELECT
        }
    );

    if (!data.length) {
        throw new AppError(
            'ESIC details not found.',
            404
        );
    }

    return res.status(200).json({
        success: true,
        data
    });
};