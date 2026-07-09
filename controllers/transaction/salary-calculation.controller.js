const { Op } = require("sequelize");
const db = require("../../config/dbConnection");
const { calculateDepartmentSalary } = require("../../services/salaryCalculation.service");
const { AppError } = require("../../utils/AppError");
const moment = require('moment-timezone');
const TaxManager = require("../../classes/taxes/TaxManager");
const FinalSalaryManager = require("../../classes/FinalSalaryManager");

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

    /* ---------------- Recalculate Taxes and Final Salary ---------------- */
    const salaryMonthEndDate = moment(
        SalaryMonth,
        'YYYY-MM'
    ).endOf('month').format('YYYY-MM-DD');

    const loanDeductionsToInsert = [];

    for (let item of SalaryDetails) {

        let context = {
            employee: item,
            month: SalaryMonth,
            taxMessages: [],
            bankPayableSalary: Number(item.BankPayableSalary || 0),
            cashPayableSalary: Number(item.CashPayableSalary || 0),
            totalOutstandingAdvance: Number(item.TotalOutstandingAdvance || 0),
            advanceDeductionBank: Number(item.AdvanceDeductionBank || 0),
            advanceDeductionCash: Number(item.AdvanceDeductionCash || 0),
            loanDeductionBank: Number(item.LoanDeductionBank || 0),
            loanDeductionCash: Number(item.LoanDeductionCash || 0),
        };
        
        context.cashSalaryAfterAdvance = context.cashPayableSalary - context.advanceDeductionCash;
        let bankSalaryAfterAdvance = context.bankPayableSalary - context.advanceDeductionBank;
        
        context.bankSalaryAfterLoan = bankSalaryAfterAdvance - context.loanDeductionBank;
        context.cashSalaryAfterLoan = context.cashSalaryAfterAdvance - context.loanDeductionCash;

        await TaxManager.calculate(context);
        FinalSalaryManager.calculate(context);

        item.TaxMessages = context.taxMessages;
        item.EmployeeEPF = context.employeeEPF || 0;
        item.EmployeeEPS = context.employeeEPS || 0;
        item.EmployerEPF = context.employerEPF || 0;
        item.EmployerAcc02 = context.employerAcc02 || 0;
        item.EmployerAcc21 = context.employerAcc21 || 0;
        item.EmployerAcc22 = context.employerAcc22 || 0;
        item.EPFWages = context.epfWages || 0;
        item.EPSWages = context.epsWages || 0;
        
        item.EmployeeESIC = context.employeeESIC || 0;
        item.EmployerESIC = context.employerESIC || 0;
        item.ESICWages = context.esicWages || 0;

        item.EmployeePT = context.employeePT || 0;

        item.TotalStatutoryDeductions = context.totalStatutoryDeductions || 0;
        item.BankSalaryAfterTax = context.bankSalaryAfterTax || 0;
        
        item.AdvanceDeductionBank = context.advanceDeductionBank || 0;
        item.AdvanceDeductionCash = context.advanceDeductionCash || 0;
        item.CashSalaryAfterAdvance = context.cashSalaryAfterAdvance || 0;
        item.CashSalaryAfterLoan = context.cashSalaryAfterLoan || 0;
        item.BankSalaryAfterLoan = context.bankSalaryAfterLoan || 0;
        item.NetPayableSalary = context.netPayableSalary || 0;

        /* ---------------- LIFO Loan Distribution ---------------- */
        let remainingBank = context.loanDeductionBank;
        let remainingCash = context.loanDeductionCash;
        let totalRemaining = remainingBank + remainingCash;

        if (totalRemaining > 0) {
            const loans = await db.sequelize.query(`
                SELECT 
                    lm.LoanMstId, 
                    lm.LoanAmount,
                    lm.DeductFromBank,
                    lm.DeductFromCash,
                    COALESCE(SUM(ld.DeductedAmount), 0) as TotalDeducted
                FROM LoanMst lm
                LEFT JOIN LoanDeduction ld ON lm.LoanMstId = ld.LoanMstId AND ld.Active = 1
                WHERE lm.EmpMstId = :EmpMstId 
                  AND lm.Active = 1 
                  AND lm.IsClosed = 0
                  AND lm.StartingDate <= :salaryMonthEndDate
                GROUP BY lm.LoanMstId, lm.LoanAmount, lm.DeductFromBank, lm.DeductFromCash, lm.LoanDate
                ORDER BY lm.LoanDate DESC, lm.LoanMstId DESC
            `, {
                replacements: { EmpMstId: item.EmpMstId, salaryMonthEndDate },
                type: db.Sequelize.QueryTypes.SELECT,
                transaction
            });

            // Pass 1: Cap by Monthly Installment amounts (DeductFromBank / DeductFromCash)
            for (let loan of loans) {
                if (remainingBank <= 0 && remainingCash <= 0) break;

                let outstanding = Number(loan.LoanAmount) - Number(loan.TotalDeducted);
                if (outstanding <= 0) continue;

                let installBank = Number(loan.DeductFromBank);
                let installCash = Number(loan.DeductFromCash);

                let deductBank = Math.min(remainingBank, installBank, outstanding);
                let deductCash = Math.min(remainingCash, installCash, outstanding - deductBank);

                let deductedAmount = deductBank + deductCash;
                if (deductedAmount > 0) {
                    remainingBank -= deductBank;
                    remainingCash -= deductCash;
                    loan.TotalDeducted = Number(loan.TotalDeducted) + deductedAmount; // Update locally for pass 2

                    loanDeductionsToInsert.push({
                        LoanMstId: loan.LoanMstId,
                        EmpMstId: item.EmpMstId,
                        DeductionMonth: SalaryMonth,
                        DeductedAmount: deductedAmount,
                        DeductedFromBank: deductBank,
                        DeductedFromCash: deductCash,
                        Remark: 'Salary Deduction',
                        Active: true
                    });
                }
            }

            // Pass 2: If there's still money left over (e.g. user manually increased the deduction),
            // we dump the rest into the newest loans capped only by Outstanding balance.
            for (let loan of loans) {
                if (remainingBank <= 0 && remainingCash <= 0) break;

                let outstanding = Number(loan.LoanAmount) - Number(loan.TotalDeducted);
                if (outstanding <= 0) continue;

                let deductBank = Math.min(remainingBank, outstanding);
                let deductCash = Math.min(remainingCash, outstanding - deductBank);

                let deductedAmount = deductBank + deductCash;
                if (deductedAmount > 0) {
                    remainingBank -= deductBank;
                    remainingCash -= deductCash;

                    // If an entry already exists for this loan in Pass 1, we add to it, 
                    // otherwise create a new one.
                    let existingEntry = loanDeductionsToInsert.find(l => l.LoanMstId === loan.LoanMstId);
                    if (existingEntry) {
                        existingEntry.DeductedFromBank += deductBank;
                        existingEntry.DeductedFromCash += deductCash;
                        existingEntry.DeductedAmount += deductedAmount;
                    } else {
                        loanDeductionsToInsert.push({
                            LoanMstId: loan.LoanMstId,
                            EmpMstId: item.EmpMstId,
                            DeductionMonth: SalaryMonth,
                            DeductedAmount: deductedAmount,
                            DeductedFromBank: deductBank,
                            DeductedFromCash: deductCash,
                            Remark: 'Salary Deduction (Overflow)',
                            Active: true
                        });
                    }
                }
            }
        }
    }

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

    /* ---------------- Bulk Insert Loan Deductions ---------------- */
    if (loanDeductionsToInsert.length > 0) {
        await db.LoanDeduction.bulkCreate(
            loanDeductionsToInsert,
            { transaction, validate: true }
        );

        // Auto-close loans that have been fully paid off
        const loanIdsToCheck = [...new Set(loanDeductionsToInsert.map(ld => ld.LoanMstId))];
        if (loanIdsToCheck.length > 0) {
            await db.sequelize.query(`
                UPDATE LoanMst 
                SET IsClosed = 1, 
                    CloseRemark = 'Auto-closed after full deduction',
                    Sflag = 'U',
                    LogID = :LogID,
                    PcID = :PcID
                WHERE LoanMstId IN (:loanIdsToCheck)
                  AND IsClosed = 0
                  AND LoanAmount <= (
                      SELECT COALESCE(SUM(DeductedAmount), 0) 
                      FROM LoanDeduction 
                      WHERE LoanMstId = LoanMst.LoanMstId AND Active = 1
                  )
            `, {
                replacements: { 
                    loanIdsToCheck,
                    LogID: req.user?.UserMstId || null,
                    PcID: req.ip
                },
                transaction
            });
        }
    }

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

    /* ---------------- Delete Loan Deductions ---------------- */

    const salaryDetRows = await db.SalaryDet.findAll({
        attributes: ['EmpMstId'],
        where: { SalaryMstId: salaryMstId },
        transaction
    });
    const empIds = salaryDetRows.map(r => r.EmpMstId);

    if (empIds.length > 0) {
        await db.LoanDeduction.destroy({
            where: {
                DeductionMonth: salaryMst.SalaryMonth,
                EmpMstId: { [Op.in]: empIds }
            },
            transaction
        });

        // Re-open any loans that were auto-closed but now have outstanding balance again
        await db.sequelize.query(`
            UPDATE LoanMst 
            SET IsClosed = 0, 
                CloseRemark = NULL,
                Sflag = 'U',
                LogID = :LogID,
                PcID = :PcID
            WHERE EmpMstId IN (:empIds) 
              AND IsClosed = 1
              AND CloseRemark = 'Auto-closed after full deduction'
              AND LoanAmount > (
                  SELECT COALESCE(SUM(DeductedAmount), 0) 
                  FROM LoanDeduction 
                  WHERE LoanMstId = LoanMst.LoanMstId AND Active = 1
              )
        `, {
            replacements: { 
                empIds,
                LogID: req.user?.UserMstId || null,
                PcID: req.ip
            },
            transaction
        });
    }

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