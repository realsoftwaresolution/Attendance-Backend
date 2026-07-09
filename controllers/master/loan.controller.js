const { Op } = require("sequelize");
const db = require("../../config/dbConnection");
const { AppError } = require("../../utils/AppError");

exports.getAll = async (req, res) => {
    let { page = 1, limit = 50 } = req.query;
    page = parseInt(page, 10);
    limit = parseInt(limit, 10);
    const offset = (page - 1) * limit;

    const countQuery = `SELECT COUNT(*) as total FROM LoanMst WHERE Active = 1`;
    const countResult = await db.sequelize.query(countQuery, { type: db.Sequelize.QueryTypes.SELECT });
    const totalRecords = countResult[0].total;

    const query = `
        SELECT 
            lm.*,
            e.EmpFullName as EmployeeName,
            e.EmpCode as EmployeeCode,
            COALESCE(ld.TotalDeducted, 0) as TotalDeducted,
            (lm.LoanAmount - COALESCE(ld.TotalDeducted, 0)) as TotalOutstanding
        FROM LoanMst lm
        LEFT JOIN EmployeeMst e ON lm.EmpMstId = e.EmpMstId
        LEFT JOIN (
            SELECT LoanMstId, SUM(DeductedAmount) as TotalDeducted
            FROM LoanDeduction
            WHERE Active = 1
            GROUP BY LoanMstId
        ) ld ON lm.LoanMstId = ld.LoanMstId
        WHERE lm.Active = 1
        ORDER BY lm.LoanMstId DESC
        OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
    `;
    
    const data = await db.sequelize.query(query, { 
        replacements: { offset, limit },
        type: db.Sequelize.QueryTypes.SELECT 
    });

    return res.status(200).json({ 
        message: 'Loans fetched successfully', 
        data,
        pagination: {
            totalRecords,
            totalPages: Math.ceil(totalRecords / limit),
            currentPage: page,
            limit
        }
    });
};

exports.add = async (req, res) => {
    const { 
        LoanDate, EmpMstId, LoanAmount, MonthlyInstallment, 
        StartingDate, TotalInstallments, DeductFromBank, DeductFromCash, 
        Remark, IsClosed, CloseRemark, Active 
    } = req.body;

    const loan = await db.LoanMst.create({
        LoanDate, EmpMstId, LoanAmount, MonthlyInstallment, 
        StartingDate, TotalInstallments, DeductFromBank, DeductFromCash, 
        Remark, IsClosed, CloseRemark, Active,
        Sflag: 'I',
        LogID: req.user?.UserMstId || null,
        PcID: req.ip,
        SortId: 0
    });

    return res.status(201).json({ message: 'Loan created successfully', data: loan });
};

exports.update = async (req, res) => {
    const { id } = req.params;
    const body = req.body;

    const loan = await db.LoanMst.findByPk(id);
    if (!loan) throw new AppError('Loan not found', 404);

    const deductionCount = await db.LoanDeduction.count({
        where: { LoanMstId: id, Active: true }
    });

    if (deductionCount > 0) {
        // Prevent editing LoanDate, StartingDate, LoanAmount
        // Need to parse Date properly to compare or just string compare.
        const d1 = new Date(body.LoanDate).toISOString().split('T')[0];
        const d2 = new Date(loan.LoanDate).toISOString().split('T')[0];
        if (d1 !== d2) {
            throw new AppError('Cannot update Loan Date once deduction has started.', 400);
        }
        
        const s1 = new Date(body.StartingDate).toISOString().split('T')[0];
        const s2 = new Date(loan.StartingDate).toISOString().split('T')[0];
        if (s1 !== s2) {
            throw new AppError('Cannot update Starting Date once deduction has started.', 400);
        }
        
        if (parseFloat(body.LoanAmount) !== parseFloat(loan.LoanAmount)) {
            throw new AppError('Cannot update Loan Amount once deduction has started.', 400);
        }
    }

    const updatedBody = {
        ...body,
        Sflag: 'U',
        LogID: req.user?.UserMstId || null,
        PcID: req.ip
    };

    await loan.update(updatedBody);
    return res.status(200).json({ message: 'Loan updated successfully', data: loan });
};

exports.remove = async (req, res) => {
    const { id } = req.params;
    
    const loan = await db.LoanMst.findByPk(id);
    if (!loan) throw new AppError('Loan not found', 404);

    const deductionCount = await db.LoanDeduction.count({
        where: { LoanMstId: id, Active: true }
    });

    if (deductionCount > 0) {
        throw new AppError('Cannot delete loan as deductions have already been made against it.', 400);
    }

    await loan.update({ Active: false });
    return res.status(200).json({ message: 'Loan deleted successfully' });
};
