const { Op } = require("sequelize");
const db = require("../../config/dbConnection");
const { calculateDepartmentSalary } = require("../../services/salaryCalculation.service");
const { AppError } = require("../../utils/AppError");
const moment = require('moment-timezone');

exports.manualCalculateSalary = async (req, res, next) => {
    const { departmentId, month } = req.query;

    if (!departmentId || !month) {
        return res.status(400).json({
            success: false,
            message: "DepartmentId and month are required."
        });
    }

    /* ---------------- Salary Already Processed Check ---------------- */

    const existingSalary = await db.SalaryMst.findOne({
        where: {
            DepartmentMstId: departmentId,
            SalaryMonth: month,
            Active: true
        }
    });

    if (existingSalary) {
        return res.status(400).json({
            success: false,
            message: `Salary has already been calculated and saved for ${month} in this department.`
        });
    }

    const result = await calculateDepartmentSalary({ departmentId, month });

    res.json({
        success: true,
        message: `Summary calculation completed for department ${departmentId} for ${month}`,
        result
    });
}

exports.saveSalary = async (req, res, next) => {

    const { transaction } = req;

    const {
        CompanyMstId,
        DepartmentMstId,
        SalaryMonth,
        SalaryDetails
    } = req.body;

    /* ---------------- Salary Already Saved Check ---------------- */

    const existingSalary = await db.SalaryMst.findOne({
        where: {
            CompanyMstId,
            DepartmentMstId,
            SalaryMonth,
            Active: true
        },
        transaction
    });

    if (existingSalary) {
        throw new AppError(
            `Salary already saved for ${SalaryMonth}.`,
            400
        );
    }

    /* ---------------- Create Salary Master ---------------- */

    const salaryMst = await db.SalaryMst.create({
        CompanyMstId,
        DepartmentMstId,
        SalaryMonth,
        Sflag: 'I',
        LogID: req.user?.UserMstId || null,
        PcID: req.ip,
        SortId: 0,
        Active: true
    }, {
        transaction
    });

    /* ---------------- Prepare Salary Details ---------------- */

    const salaryRows = SalaryDetails.map(item => ({
        ...item,
        SalaryMstId: salaryMst.SalaryMstId,
        TaxMessages: JSON.stringify(item.TaxMessages || []),
        Active: true
    }));

    /* ---------------- Bulk Insert ---------------- */

    await db.SalaryDet.bulkCreate(
        salaryRows,
        {
            transaction,
            validate: true
        }
    );

    // 1. Prepare Date Bounds
    const salaryMonthEndDate = moment(
        SalaryMonth,
        'YYYY-MM'
    ).endOf('month').format('YYYY-MM-DD');

    // 2. Perform Batch Update
    const [updatedCount] = await db.AdvanceMst.update(
        {
            IsClosed: true,
            ClosedDate: salaryMonthEndDate
        },
        {
            where: {
                CompanyMstId,
                DepartmentMstId,
                Active: true,
                IsClosed: false,
                AdvanceDate: { [Op.lte]: salaryMonthEndDate }
            },
            transaction
        }
    );

    return res.status(201).json({
        success: true,
        message: 'Salary saved successfully.',
        SalaryMstId: salaryMst.SalaryMstId,
        TotalEmployees: salaryRows.length
    });
};

exports.deleteSalary = async (req, res, next) => {

    const { transaction } = req;
    const { salaryMstId } = req.params;

    /* ---------------- Fetch Salary Master ---------------- */

    const salaryMst = await db.SalaryMst.findOne({
        where: {
            SalaryMstId: salaryMstId,
            Active: true
        },
        transaction
    });

    if (!salaryMst) {
        throw new AppError(
            'Salary record not found.',
            404
        );
    }

    /* ---------------- Reopen Advances ---------------- */

    const salaryMonthEndDate = moment(
        salaryMst.SalaryMonth,
        'YYYY-MM'
    ).endOf('month').format('YYYY-MM-DD');

    await db.AdvanceMst.update(
        {
            IsClosed: false,
            ClosedDate: null
        },
        {
            where: {
                CompanyMstId: salaryMst.CompanyMstId,
                DepartmentMstId: salaryMst.DepartmentMstId,
                Active: true,
                IsClosed: true,
                ClosedDate: salaryMonthEndDate
            },
            transaction
        }
    );

    /* ---------------- Delete Salary Details ---------------- */

    await db.SalaryDet.destroy({
        where: {
            SalaryMstId: salaryMstId
        },
        transaction
    });

    /* ---------------- Delete Salary Master ---------------- */

    await salaryMst.destroy({
        transaction
    });

    return res.status(200).json({
        success: true,
        message: `Salary for ${salaryMst.SalaryMonth} deleted successfully.`
    });
};

exports.getSavedSalaryList = async (req, res, next) => {

    const {
        companyMstId,
        departmentMstId,
        salaryMonth
    } = req.query;

    const data = await db.sequelize.query(`
        SELECT
            SM.SalaryMstId,
            SM.CompanyMstId,
            SM.DepartmentMstId,
            SM.SalaryMonth,
            SM.createdAt,

            CM.CompanyName,

            DM.Department

        FROM SalaryMst SM

        LEFT JOIN CompanyMst CM
            ON CM.CompanyMstId = SM.CompanyMstId

        LEFT JOIN DepartmentMst DM
            ON DM.DepartmentMstId = SM.DepartmentMstId

        WHERE
            SM.Active = 1

            AND (
                :companyMstId IS NULL
                OR SM.CompanyMstId = :companyMstId
            )

            AND (
                :departmentMstId IS NULL
                OR SM.DepartmentMstId = :departmentMstId
            )

            AND (
                :salaryMonth IS NULL
                OR SM.SalaryMonth = :salaryMonth
            )

        ORDER BY
            SM.SalaryMonth DESC,
            SM.SalaryMstId DESC
    `, {
        replacements: {
            companyMstId: companyMstId || null,
            departmentMstId: departmentMstId || null,
            salaryMonth: salaryMonth || null
        },
        type: db.sequelize.QueryTypes.SELECT
    });

    return res.status(200).json({
        success: true,
        count: data.length,
        data
    });
};

exports.getSalaryDetails = async (req, res, next) => {

    const { salaryMstId } = req.params;

    const salaryMst = await db.SalaryMst.findOne({
        where: {
            SalaryMstId: salaryMstId,
            Active: true
        }
    });

    if (!salaryMst) {
        throw new AppError(
            'Salary record not found.',
            404
        );
    }

    const data = await db.SalaryDet.findAll({
        where: {
            SalaryMstId: salaryMstId,
            Active: true
        },
        order: [
            ['EmpCode', 'ASC']
        ]
    });

    const rows = data.map(row => {

        const item = row.toJSON();

        item.TaxMessages =
            item.TaxMessages
                ? JSON.parse(item.TaxMessages)
                : [];

        return item;
    });

    return res.status(200).json({
        success: true,
        SalaryMstId: salaryMst.SalaryMstId,
        SalaryMonth: salaryMst.SalaryMonth,
        CompanyMstId: salaryMst.CompanyMstId,
        DepartmentMstId: salaryMst.DepartmentMstId,
        totalEmployees: rows.length,
        data: rows
    });
};