const db = require("../../config/dbConnection");
const { Op, QueryTypes } = require("sequelize");
const { AppError } = require("../../utils/AppError");


const getShiftIntervals = (shiftIn, shiftOut) => {
    const [inH, inM] = shiftIn.split(':').map(Number);
    const inMin = (inH * 60) + (inM || 0);

    const [outH, outM] = shiftOut.split(':').map(Number);
    const outMin = (outH * 60) + (outM || 0);

    if (outMin <= inMin) {
        return [
            { start: inMin, end: 1440 },
            { start: 0, end: outMin }
        ];
    }

    return [{ start: inMin, end: outMin }];
};

const checkTimeOverlap = (intervalsA, intervalsB) => {
    for (const a of intervalsA) {
        for (const b of intervalsB) {
            // Strict < ensures adjacent shifts (e.g., 09:00-18:00 and 18:00-22:00) are allowed.
            if (Math.max(a.start, b.start) < Math.min(a.end, b.end)) {
                return true;
            }
        }
    }
    return false;
};

const parseSqlTime = (timeVal) => {
    if (!timeVal) return "00:00";
    if (timeVal instanceof Date) {
        // DO NOT use toISOString() because it strips the IST timezone and shifts it by -5:30.
        // We force the Date object back into Kolkata time to preserve your 09:00 value.
        return moment(timeVal).tz('Asia/Kolkata').format('HH:mm');
    }
    return String(timeVal).substring(0, 5); // Fallback for raw strings
};

exports.getAllShiftEntry = async (req, res, next) => {
    const page = parseInt(req.query.Page, 10) || 1;
    const limit = parseInt(req.query.Limit, 10) || 10;
    const offset = (page - 1) * limit;

    const data = await db.sequelize.query(`
        SELECT
            S.ShiftEntryMstId, 
            S.FromDate, 
            S.ToDate, 
            C.CompanyName, 
            D.Department,
            S.ShiftType,
            CONVERT(VARCHAR, S.ShiftIn, 108) AS ShiftIn, 
            CONVERT(VARCHAR, S.ShiftOut, 108) AS ShiftOut,
            S.IsPreShiftOT, 
            CONVERT(VARCHAR, S.PreShiftOTIn, 108) AS PreShiftOTIn, 
            CONVERT(VARCHAR, S.PreShiftOTOut, 108) AS PreShiftOTOut,
            S.IsPostShiftOT, 
            CONVERT(VARCHAR, S.PostShiftOTIn, 108) AS PostShiftOTIn, 
            CONVERT(VARCHAR, S.PostShiftOTOut, 108) AS PostShiftOTOut,
            S.IsLunchBreak, 
            CONVERT(VARCHAR, S.LunchIn, 108) AS LunchIn, 
            CONVERT(VARCHAR, S.LunchOut, 108) AS LunchOut,
            S.IsHalfDayRule, 
            S.HalfDayHours, 
            S.IsGraceTime, 
            S.GraceMinutes, 
            S.SortId, 
            S.Active
        FROM ShiftEntryMst S
        LEFT JOIN CompanyMst C ON S.CompanyMstId = C.CompanyMstId
        LEFT JOIN DepartmentMst D ON S.DepartmentMstId = D.DepartmentMstId
        ORDER BY S.FromDate DESC, S.DepartmentMstId ASC
        OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
    `, {
        replacements: { offset, limit },
        type: QueryTypes.SELECT
    });

    const totalResult = await db.sequelize.query(`
        SELECT COUNT(*) AS totalRecords FROM ShiftEntryMst
    `, { type: QueryTypes.SELECT });

    return res.status(200).json({
        success: true,
        message: "Shift entries fetched successfully.",
        data,
        meta: {
            totalRecords: totalResult[0].totalRecords,
            currentPage: page,
            totalPages: Math.ceil(totalResult[0].totalRecords / limit),
            perPageLimit: limit
        }
    });
};

exports.addShiftEntry = async (req, res, next) => {
    const {
        FromDate, CompanyMstId, DepartmentMstId, ShiftType,
        ShiftIn, ShiftOut,
        IsPreShiftOT, PreShiftOTIn, PreShiftOTOut,
        IsPostShiftOT, PostShiftOTIn, PostShiftOTOut,
        IsLunchBreak, LunchIn, LunchOut,
        IsHalfDayRule, HalfDayHours, IsGraceTime, GraceMinutes, SortId
    } = req.body;

    const transaction = req.transaction;

    /* ----------------------- VALIDATE SHIFT DURATION ---------------------- */
    if (!ShiftIn || !ShiftOut) {
        throw new AppError("ShiftIn and ShiftOut timings are required parameters.", 400);
    }

    const [inH, inM] = ShiftIn.split(':').map(Number);
    const shiftInMinutes = (inH * 60) + (inM || 0);

    const [outH, outM] = ShiftOut.split(':').map(Number);
    let shiftOutMinutes = (outH * 60) + (outM || 0);

    if (shiftOutMinutes <= shiftInMinutes) {
        shiftOutMinutes += 24 * 60;
    }

    const totalShiftDurationHours = (shiftOutMinutes - shiftInMinutes) / 60;

    if (totalShiftDurationHours > 16.0) {
        throw new AppError(
            `Total configured shift duration (${totalShiftDurationHours.toFixed(2)} hrs) cannot exceed 16.00 hours.`,
            400
        );
    }

    /* ---------------------- VALIDATE TIME OVERLAPS ------------------------ */
    const otherActiveShifts = await db.sequelize.query(`
        SELECT 
            ShiftType,
            CONVERT(VARCHAR, ShiftIn, 108) AS ShiftIn, 
            CONVERT(VARCHAR, ShiftOut, 108) AS ShiftOut
        FROM ShiftEntryMst
        WHERE CompanyMstId = :CompanyMstId
          AND DepartmentMstId = :DepartmentMstId
          AND ShiftType != :ShiftType
          AND Active = 1
          AND (ToDate IS NULL OR ToDate >= :FromDate)
    `, {
        replacements: { CompanyMstId, DepartmentMstId, ShiftType, FromDate },
        type: QueryTypes.SELECT,
        transaction
    });

    if (otherActiveShifts.length > 0) {
        const newShiftIntervals = getShiftIntervals(ShiftIn, ShiftOut);

        for (const existing of otherActiveShifts) {
            // Safe Parsing Applied Here
            const existingIn = existing.ShiftIn;
            const existingOut = existing.ShiftOut;

            const existingIntervals = getShiftIntervals(existingIn, existingOut);

            if (checkTimeOverlap(newShiftIntervals, existingIntervals)) {
                throw new AppError(
                    `Time overlap detected! The new ${ShiftType} shift (${ShiftIn} to ${ShiftOut}) collides with the active ${existing.ShiftType} shift (${existingIn} to ${existingOut}).`,
                    409
                );
            }
        }
    }

    /* ------------------------- FIND CURRENT SHIFT ------------------------- */
    const existingShift = await db.ShiftEntryMst.findOne({
        where: {
            CompanyMstId,
            DepartmentMstId,
            ShiftType,
            ToDate: null,
        },
        order: [['FromDate', 'DESC']],
        transaction
    });

    /* ------------------------- CLOSE OLD TIMELINE ------------------------- */
    if (existingShift) {
        const previousDay = new Date(FromDate);
        previousDay.setDate(previousDay.getDate() - 1);

        const formattedPreviousDay = previousDay.toISOString().split('T')[0];

        if (formattedPreviousDay < existingShift.FromDate) {
            throw new AppError(
                `New shift date cannot be before existing ${ShiftType} shift start date (${existingShift.FromDate}).`,
                400
            );
        }

        await existingShift.update({
            ToDate: formattedPreviousDay,
            Sflag: 'U'
        }, { transaction });
    }

    /* --------------------------- CREATE SHIFT ---------------------------- */
    const newShift = await db.ShiftEntryMst.create({
        FromDate, ToDate: null, CompanyMstId, DepartmentMstId, ShiftType,
        ShiftIn: ShiftIn || '00:00:00', ShiftOut: ShiftOut || '00:00:00',
        IsPreShiftOT: IsPreShiftOT || false, PreShiftOTIn: PreShiftOTIn || null, PreShiftOTOut: PreShiftOTOut || null,
        IsPostShiftOT: IsPostShiftOT || false, PostShiftOTIn: PostShiftOTIn || null, PostShiftOTOut: PostShiftOTOut || null,
        IsLunchBreak: IsLunchBreak || false, LunchIn: LunchIn || null, LunchOut: LunchOut || null,
        IsHalfDayRule: IsHalfDayRule || false, HalfDayHours: HalfDayHours || 4,
        IsGraceTime: IsGraceTime || false, GraceMinutes: GraceMinutes || 0,
        SortId: SortId || 1, Active: true, Sflag: 'I', LogID: req.logId, PcID: req.pcId
    }, { transaction });

    /* ---------------------------- GET INSERTED ---------------------------- */
    const insertedShift = await db.sequelize.query(`
        SELECT
            ShiftEntryMstId, FromDate, ToDate, CompanyMstId, DepartmentMstId, ShiftType,
            CONVERT(VARCHAR, ShiftIn, 108) AS ShiftIn, CONVERT(VARCHAR, ShiftOut, 108) AS ShiftOut,
            IsPreShiftOT, CONVERT(VARCHAR, PreShiftOTIn, 108) AS PreShiftOTIn, CONVERT(VARCHAR, PreShiftOTOut, 108) AS PreShiftOTOut,
            IsPostShiftOT, CONVERT(VARCHAR, PostShiftOTIn, 108) AS PostShiftOTIn, CONVERT(VARCHAR, PostShiftOTOut, 108) AS PostShiftOTOut,
            IsLunchBreak, CONVERT(VARCHAR, LunchIn, 108) AS LunchIn, CONVERT(VARCHAR, LunchOut, 108) AS LunchOut,
            IsHalfDayRule, HalfDayHours, IsGraceTime, GraceMinutes, SortId, Active
        FROM ShiftEntryMst
        WHERE ShiftEntryMstId = :ShiftEntryMstId
    `, {
        replacements: { ShiftEntryMstId: newShift.ShiftEntryMstId },
        type: QueryTypes.SELECT,
        transaction
    });

    return res.status(201).json({
        success: true,
        message: `${ShiftType} shift entry created successfully.`,
        data: insertedShift[0]
    });
};

exports.deleteShiftEntry = async (req, res, next) => {
    const { ShiftEntryMstId } = req.params;
    const transaction = req.transaction;

    const shiftToDelete = await db.ShiftEntryMst.findOne({
        where: { ShiftEntryMstId },
        transaction
    });

    if (!shiftToDelete) throw new AppError("No shift record found matching this ID.", 404);

    const { CompanyMstId, DepartmentMstId, ShiftType, FromDate, ToDate } = shiftToDelete;

    const previousShift = await db.ShiftEntryMst.findOne({
        where: {
            CompanyMstId, DepartmentMstId, ShiftType,
            FromDate: { [Op.lt]: FromDate },
        },
        order: [['FromDate', 'DESC']],
        transaction
    });

    await shiftToDelete.destroy({ transaction });

    if (previousShift) {
        await previousShift.update({
            ToDate: ToDate === null ? null : ToDate,
            Sflag: 'U'
        }, { transaction });
    }

    return res.status(200).json({
        success: true,
        message: `${ShiftType} shift deleted successfully.`
    });
};