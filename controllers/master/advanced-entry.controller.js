const { Op } = require("sequelize");
const { AppError } = require("../../utils/AppError");
const db = require("../../config/dbConnection");
const moment = require('moment-timezone');

exports.createAdvance = async (req, res, next) => {
    const { transaction } = req;
    const {
        EmpMstId, CompanyMstId, DepartmentMstId, DesignationMstId,
        AdvanceDate, AdvanceAmount, AdvanceType, Remarks
    } = req.body;

    // 1. Data Validation
    const amount = Number(AdvanceAmount || 0);
    if (amount <= 0) {
        throw new AppError('Advance amount must be greater than zero.', 400);
    }

    const today = moment().startOf('day');

    if (moment(AdvanceDate).isAfter(today, 'day')) {
        throw new AppError(
            'Future advance dates are not allowed.',
            400
        );
    }


    // 2. Fetch Required Data
    const [employee, latestSalary] = await Promise.all([
        db.EmployeeMst.findOne({ where: { EmpMstId, CompanyMstId, DepartmentMstId, DesignationMstId, Active: true }, transaction }),
        db.SalaryDet.findOne({
            where: { EmpMstId, Active: true },
            order: [['SalaryMonth', 'DESC']],
            transaction
        })
    ]);

    // 3. Business Rule Enforcement
    if (!employee) throw new AppError('Employee not found.', 404);

    const advanceMonth = moment(AdvanceDate).format('YYYY-MM');
    if (latestSalary && advanceMonth <= latestSalary.SalaryMonth) {
        throw new AppError(
            `Salary already processed till ${latestSalary.SalaryMonth}. Advance date must be after that month.`,
            400
        );
    }

    // 4. Persistence
    const advance = await db.AdvanceMst.create({
        EmpMstId,
        CompanyMstId,
        DepartmentMstId,
        DesignationMstId,
        AdvanceDate,
        AdvanceType,
        AdvanceAmount: amount,
        Remarks,
        IsClosed: false,
        ClosedDate: null,
        Active: true
    }, { transaction });

    // 5. Response
    return res.status(201).json({
        success: true,
        message: 'Advance entry created successfully.',
    });
};

exports.getAdvanceList = async (req, res, next) => {
    const { CompanyMstId, DepartmentMstId, EmpCode, FromDate, ToDate } = req.query;

    const fromDate = FromDate || moment().startOf('month').format('YYYY-MM-DD');
    const toDate = ToDate || moment().endOf('month').format('YYYY-MM-DD');

    // 2. Execute Query
    const data = await db.sequelize.query(`
    SELECT
        A.AdvanceMstId, A.EmpMstId, A.CompanyMstId, A.DepartmentMstId, A.AdvanceAmount,
        A.DesignationMstId, A.AdvanceDate, A.AdvanceType, A.Remarks, A.Active,
        E.EmpCode, E.EmpFullName,
        C.CompanyName,
        D.Department,
        DG.Designation
    FROM AdvanceMst A
    INNER JOIN EmployeeMst E ON E.EmpMstId = A.EmpMstId
    LEFT JOIN CompanyMst C ON C.CompanyMstId = A.CompanyMstId
    LEFT JOIN DepartmentMst D ON D.DepartmentMstId = A.DepartmentMstId
    LEFT JOIN DesignationMst DG ON DG.DesignationMstId = A.DesignationMstId
    WHERE A.AdvanceDate BETWEEN :fromDate AND :toDate
        AND (:CompanyMstId IS NULL OR A.CompanyMstId = :CompanyMstId)
        AND (:DepartmentMstId IS NULL OR A.DepartmentMstId = :DepartmentMstId)
        AND (:EmpCode IS NULL OR E.EmpCode = :EmpCode)
    ORDER BY A.AdvanceDate DESC, A.AdvanceMstId DESC
`, {
        replacements: {
            CompanyMstId: CompanyMstId || null,
            DepartmentMstId: DepartmentMstId || null,
            EmpCode: EmpCode || null,
            fromDate,
            toDate
        },
        type: db.sequelize.QueryTypes.SELECT
    });

    // 3. Send Response
    return res.status(200).json({
        success: true,
        count: data.length,
        filters: { CompanyMstId, DepartmentMstId, EmpCode, FromDate: fromDate, ToDate: toDate },
        data
    });
};

exports.updateAdvance = async (req, res, next) => {
    const { transaction } = req;
    const { advanceMstId } = req.params;
    const {
        EmpMstId, CompanyMstId, DepartmentMstId, DesignationMstId,
        AdvanceDate, AdvanceType, AdvanceAmount, Remarks
    } = req.body;

    // 1. Fetch Existing Record
    const advance = await db.AdvanceMst.findOne({ where: { AdvanceMstId: advanceMstId }, transaction });
    if (!advance) throw new AppError('Advance record not found.', 404);

    // 2. Validations
    const amount = Number(AdvanceAmount || 0);
    if (amount <= 0) throw new AppError('Advance amount must be greater than zero.', 400);

    if (moment(AdvanceDate).isAfter(moment(), 'day')) {
        throw new AppError('Future advance dates are not allowed.', 400);
    }

    // 3. Dependency Checks (Employee & Recovery)
    const [employee] = await Promise.all([
        db.EmployeeMst.findOne({
            where: { EmpMstId, CompanyMstId, DepartmentMstId, DesignationMstId, Active: true },
            transaction
        }),
    ]);

    if (!employee) throw new AppError('Employee not found or organizational details mismatch.', 404);

    // 4. Salary Processing Check
    const latestSalary = await db.SalaryDet.findOne({
        where: { EmpMstId, Active: true },
        order: [['SalaryMonth', 'DESC']],
        transaction
    });

    const advanceMonth = moment(AdvanceDate).format('YYYY-MM');
    if (latestSalary && advanceMonth <= latestSalary.SalaryMonth) {
        throw new AppError(
            `Salary already processed till ${latestSalary.SalaryMonth}. Advance cannot be modified for this month.`,
            400
        );
    }

    // 5. Update Record
    await advance.update({
        EmpMstId, CompanyMstId, DepartmentMstId, DesignationMstId,
        AdvanceDate, AdvanceType, AdvanceAmount: amount, Remarks
    }, { transaction });

    return res.status(200).json({
        success: true,
        message: 'Advance updated successfully.'
    });
};

exports.deleteAdvance = async (req, res, next) => {
    const { transaction } = req;
    const { advanceMstId } = req.params;

    // 1. Fetch and Verify Record
    const advance = await db.AdvanceMst.findOne({
        where: { AdvanceMstId: advanceMstId },
        transaction
    });

    if (!advance) throw new AppError('Advance record not found.', 404);

    // 2. Validate Deletion Constraints (Recovery & Salary)
    const [latestSalary] = await Promise.all([
        db.SalaryDet.findOne({
            where: { EmpMstId: advance.EmpMstId, Active: true },
            order: [['SalaryMonth', 'DESC']],
            transaction
        })
    ]);

    const advanceMonth = moment(advance.AdvanceDate).format('YYYY-MM');
    if (latestSalary && advanceMonth <= latestSalary.SalaryMonth) {
        throw new AppError(
            `Salary already processed till ${latestSalary.SalaryMonth}. Advance cannot be deleted.`,
            400
        );
    }

    // 3. Execution
    await advance.destroy({ transaction });

    // 4. Success Response
    return res.status(200).json({
        success: true,
        message: 'Advance deleted successfully.'
    });
};