const { QueryTypes } = require('sequelize');
const db = require('../../config/dbConnection');
const { AppError } = require('../../utils/appError');

exports.createMasterSetting = async (req, res) => {
    const transaction = req.transaction;

    const {
        DepartmentMstId,
        CompanyMstId
    } = req.body;

    const existing = await db.MasterSettingMst.findOne({
        where: {
            DepartmentMstId,
            CompanyMstId,
            IsDelete: false
        },
        transaction
    });

    if (existing) {
        throw new AppError(
            'Master Setting already exists for selected department.',
            400
        );
    }

    const setting = await db.MasterSettingMst.create(
        {
            ...req.body,

            Active: true,
            IsDelete: false,

            Sflag: 'I',
            LogID: req.logId,
            PcID: req.pcId
        },
        { transaction }
    );

    return res.status(201).json({
        success: true,
        message: 'Master setting created successfully.'
    });
};

exports.getMasterSettingList = async (req, res) => {
    const data = await db.sequelize.query(
        `
        SELECT
            ms.SettingMstId,

            ms.CompanyMstId,
            c.CompanyName,

            ms.DepartmentMstId,
            d.Department,

            ms.Active,
            ms.createdAt,
            ms.updatedAt

        FROM MasterSettingMst ms

        LEFT JOIN CompanyMst c
            ON c.CompanyMstId = ms.CompanyMstId

        LEFT JOIN DepartmentMst d
            ON d.DepartmentMstId = ms.DepartmentMstId

        WHERE ms.IsDelete = 0

        ORDER BY
            c.CompanyName,
            d.Department
        `,
        {
            type: QueryTypes.SELECT
        }
    );

    return res.status(200).json({
        success: true,
        count: data.length,
        data
    });
};

exports.getMasterSettingDetails = async (req, res) => {
    const { SettingMstId } = req.params;

    const data = await db.sequelize.query(
        `
    SELECT
        ms.SettingMstId,
        ms.DepartmentMstId,
        ms.CompanyMstId,

        ms.ApplyHolidayOnSalaryCalculation,
        ms.ApplyHalfDayOnSalaryCalculation,
        ms.ApplyLateOnSalaryCalculation,
        ms.AllowLunchBreak,

        ms.SalaryCalculateOnCalendarDay,
        ms.SalaryCalculateOnCalendarDayWithoutSunday,
        ms.SalaryCalculateOnWorkingDay,

        ms.WorkingDays,
        ms.HoursCategoryMstId,

        h.Hours,

        ms.SalaryCalculateOnDay,
        ms.SalaryCalculateOnHours,
        ms.SalaryCalculateOnPerPc,

        ms.ApplySundayAsPresentDay,
        ms.MarkSundayAbsentIfPreviousDayAbsent,
        ms.MarkSundayAbsentIfNextDayAbsent,
        ms.MarkSundayAbsentIfBothDaysAbsent,

        ms.ApplySundayInOvertime,
        ms.ApplySundayInAbsentDay,

        ms.Active,
        ms.createdAt,
        ms.updatedAt,

        c.CompanyName,
        d.Department

    FROM MasterSettingMst ms

    LEFT JOIN CompanyMst c
        ON c.CompanyMstId = ms.CompanyMstId

    LEFT JOIN DepartmentMst d
        ON d.DepartmentMstId = ms.DepartmentMstId

    LEFT JOIN HoursCategoryMst h
        ON h.HoursCategoryMstId = ms.HoursCategoryMstId
        AND h.IsDelete = 0

    WHERE ms.SettingMstId = :SettingMstId
      AND ms.IsDelete = 0
    `,
        {
            replacements: {
                SettingMstId
            },
            type: QueryTypes.SELECT
        }
    );

    if (!data.length) {
        throw new AppError(
            'Master Setting not found.',
            404
        );
    }

    return res.status(200).json({
        success: true,
        data: data[0]
    });
};

exports.updateMasterSetting = async (req, res) => {
    const transaction = req.transaction;

    const { SettingMstId } = req.params;

    const setting = await db.MasterSettingMst.findOne({
        where: {
            SettingMstId,
            IsDelete: false
        },
        transaction
    });

    if (!setting) {
        throw new AppError(
            'Master Setting not found.',
            404
        );
    }

    const {
        DepartmentMstId,
        CompanyMstId
    } = req.body;

    const duplicate = await db.MasterSettingMst.findOne({
        where: {
            DepartmentMstId,
            CompanyMstId,
            IsDelete: false,
            SettingMstId: {
                [db.Sequelize.Op.ne]: SettingMstId
            }
        },
        transaction
    });

    if (duplicate) {
        throw new AppError(
            'Master Setting already exists for selected department.',
            400
        );
    }

    await setting.update(
        {
            ...req.body,

            Sflag: 'U',
            LogID: req.logId,
            PcID: req.pcId
        },
        { transaction }
    );

    return res.status(200).json({
        success: true,
        message: 'Master Setting updated successfully.'
    });
};

exports.deleteMasterSetting = async (req, res) => {
    const transaction = req.transaction;
    const { SettingMstId } = req.params;

    const setting = await db.MasterSettingMst.findOne({
        where: {
            SettingMstId,
            IsDelete: false
        },
        transaction
    });

    if (!setting) {
        throw new AppError(
            'Master Setting not found.',
            404
        );
    }

    await setting.update(
        {
            Active: false,
            IsDelete: true,

            Sflag: 'D',
            LogID: req.logId,
            PcID: req.pcId
        },
        { transaction }
    );

    return res.status(200).json({
        success: true,
        message: 'Master Setting deleted successfully.'
    });
};