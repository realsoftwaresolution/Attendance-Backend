const { Op, QueryTypes } = require("sequelize");
const { AppError } = require("../utils/AppError");
const { hashPassword, comparePassword } = require("../utils/hash.utils");
const jwt = require('jsonwebtoken');
const jwtConfig = require("../config/jwt.config");
const db = require("../config/dbConnection");
const { getUserReports, getUserPermissions, buildTokenPermissions } = require("../utils/permissions.helper");

exports.login = async (req, res) => {
    const { Username, Password } = req.body;

    const user = await db.UserMst.scope("withHash").findOne({
        where: {
            Username: { [Op.eq]: Username },
            IsDelete: false,
            Active: true
        }
    });

    if (!user) {
        throw new AppError("User not found or inactive", 404);
    }

    const isPasswordValid = await comparePassword(
        Password,
        user.Password
    );

    if (!isPasswordValid) {
        throw new AppError("Invalid password", 400);
    }

    const latestCompany = await db.CompanyMst.findOne({
        where: {
            Active: 1,
            IsDelete: 0
        },
        order: [["CompanyMstId", "DESC"]]
    });
    
    const [permissions, reports] = await Promise.all([
        getUserPermissions(user.UserMstId),
        getUserReports(user.UserMstId)
    ]);

    const access = buildTokenPermissions(
        permissions,
        reports
    );

    const tokenPayload = {
        UserMstId: user.UserMstId,
        Username: user.Username,
        UserType: user.UserType,
        access
    };

    const token = jwt.sign(
        tokenPayload,
        jwtConfig.secret,
        {
            expiresIn: jwtConfig.expiresIn
        }
    );

    user.Token = token;
    await user.save();


    return res.status(200).json({
        success: true,
        message: "Login successful",
        token,
        user: {
            UserMstId: user.UserMstId,
            Username: user.Username,
            UserType: user.UserType
        },
        permissions,
        reports,
        latestCompany: latestCompany
            ? {
                CompanyMstId: latestCompany.CompanyMstId,
                CompanyName: latestCompany.CompanyName,
                Code: latestCompany.Code
            }
            : null
    });
};

exports.createUser = async (req, res) => {
    const transaction = req.transaction;

    const {
        Username,
        Password,
        UserGrp,
        navigation = [],
        reports = []
    } = req.body;

    const exists = await db.UserMst.findOne({
        where: { Username },
        transaction
    });

    if (exists) {
        throw new AppError("Username already exists", 400);
    }

    const user = await db.UserMst.create({
        Username,
        Password: await hashPassword(Password),
        UserType: 'user',
        UserGrp,
        Active: true,
        IsDelete: false
    }, { transaction });

    const menuPermissions = [];

    for (const mainMenu of navigation) {
        for (const menu of (mainMenu.Menus || [])) {

            if (
                !menu.isCreate &&
                !menu.isEdit &&
                !menu.isDelete &&
                !menu.isView
            ) continue;

            menuPermissions.push({
                UserMstId: user.UserMstId,
                MainMenuMstId: mainMenu.MainMenuMstId,
                MenuMstId: menu.MenuMstId,
                isCreate: menu.isCreate,
                isEdit: menu.isEdit,
                isDelete: menu.isDelete,
                isView: menu.isView
            });
        }
    }

    if (menuPermissions.length) {
        await db.UserMenuMst.bulkCreate(
            menuPermissions,
            { transaction }
        );
    }

    const reportPermissions = [];

    for (const reportType of reports) {
        for (const subReport of (reportType.SubReports || [])) {

            if (!subReport.isView) continue;

            reportPermissions.push({
                UserMstId: user.UserMstId,
                ReportTypeMstId: reportType.ReportTypeMstId,
                SubReportTypeMstId: subReport.SubReportTypeMstId,
                isView: true
            });
        }
    }

    if (reportPermissions.length) {
        await db.UserReportMst.bulkCreate(
            reportPermissions,
            { transaction }
        );
    }

    return res.status(201).json({
        message: "User created successfully",
        UserMstId: user.UserMstId
    });

};

exports.updateUser = async (req, res) => {
    const transaction = await req.transaction;
    const { id } = req.params;
    const {
        Username,
        Password,
        UserGrp,
        Active,
        navigation = [],
        reports = []
    } = req.body;

    const user = await db.UserMst.findByPk(id, { transaction });

    if (!user) {
        throw new AppError("User not found", 404);
    }

    const duplicateUser = await db.UserMst.findOne({
        where: {
            Username,
            UserMstId: {
                [Op.ne]: id
            }
        },
        transaction
    });

    if (duplicateUser) {
        throw new AppError("Username already exists", 400);
    }

    const updateData = {
        Username,
        UserGrp,
        Active
    };

    if (Password?.trim()) {
        updateData.Password = await hashPassword(Password);
    }

    await user.update(updateData, { transaction });

    // Delete old menu permissions
    await db.UserMenuMst.destroy({
        where: {
            UserMstId: id
        },
        transaction
    });

    // Delete old report permissions
    await db.UserReportMst.destroy({
        where: {
            UserMstId: id
        },
        transaction
    });

    // Menu Permissions
    const menuPermissions = [];

    for (const mainMenu of navigation) {
        for (const menu of (mainMenu.Menus || [])) {

            if (
                !menu.isCreate &&
                !menu.isEdit &&
                !menu.isDelete &&
                !menu.isView
            ) continue;

            menuPermissions.push({
                UserMstId: id,
                MainMenuMstId: mainMenu.MainMenuMstId,
                MenuMstId: menu.MenuMstId,
                isCreate: menu.isCreate,
                isEdit: menu.isEdit,
                isDelete: menu.isDelete,
                isView: menu.isView
            });
        }
    }

    if (menuPermissions.length) {
        await db.UserMenuMst.bulkCreate(
            menuPermissions,
            { transaction }
        );
    }

    // Report Permissions
    const reportPermissions = [];

    for (const reportType of reports) {
        for (const subReport of (reportType.SubReports || [])) {

            if (!subReport.isView) continue;

            reportPermissions.push({
                UserMstId: id,
                ReportTypeMstId: reportType.ReportTypeMstId,
                SubReportTypeMstId: subReport.SubReportTypeMstId,
                isView: true
            });
        }
    }

    if (reportPermissions.length) {
        await db.UserReportMst.bulkCreate(
            reportPermissions,
            { transaction }
        );
    }


    return res.status(200).json({
        message: "User updated successfully"
    });

};

exports.deleteUser = async (req, res) => {
    const transaction = req.transaction;
    const { id } = req.params;

    const user = await db.UserMst.findOne({
        where: {
            UserMstId: id,
            IsDelete: false
        },
        transaction
    });

    if (!user) {
        throw new AppError("User not found", 404);
    }

    if (user.UserType?.toLowerCase() === "admin") {
        throw new AppError("Admin user cannot be deleted", 400);
    }

    await user.update(
        {
            IsDelete: true,
            Active: false
        },
        { transaction }
    );

    return res.status(200).json({
        success: true,
        message: "User deleted successfully"
    });
};

exports.getSystemMetadata = async (req, res) => {
    try {
        const navigationQuery = `
            SELECT
                mm.MainMenuMstId,
                mm.MainMenuName,
                (
                    SELECT
                        m.MenuMstId,
                        m.MenuName,
                        CAST(0 AS BIT) AS isCreate,
                        CAST(0 AS BIT) AS isEdit,
                        CAST(0 AS BIT) AS isDelete,
                        CAST(0 AS BIT) AS isView
                    FROM MenuMst m
                    WHERE m.MainMenuMstId = mm.MainMenuMstId
                      AND m.Active = 1
                    ORDER BY m.SortId, m.MenuName
                    FOR JSON PATH
                ) AS Menus
            FROM MainMenuMst mm
            WHERE mm.Active = 1
            ORDER BY mm.MainMenuName
        `;

        const reportsQuery = `
            SELECT
                rt.ReportTypeMstId,
                rt.ReportTypeName,
                (
                    SELECT
                        srt.SubReportTypeMstId,
                        srt.SubReportTypeName,
                        CAST(0 AS BIT) AS isView
                    FROM SubReportTypeMst srt
                    WHERE srt.ReportTypeMstId = rt.ReportTypeMstId
                      AND srt.Active = 1
                    ORDER BY srt.SortId
                    FOR JSON PATH
                ) AS SubReports
            FROM ReportTypeMst rt
            WHERE rt.Active = 1
            ORDER BY rt.ReportTypeName
        `;

        const navigation = await db.sequelize.query(
            navigationQuery,
            { type: QueryTypes.SELECT }
        );

        const reports = await db.sequelize.query(
            reportsQuery,
            { type: QueryTypes.SELECT }
        );

        const formattedNavigation = navigation.map(item => ({
            ...item,
            Menus: item.Menus ? JSON.parse(item.Menus) : []
        }));

        const formattedReports = reports.map(item => ({
            ...item,
            SubReports: item.SubReports ? JSON.parse(item.SubReports) : []
        }));

        return res.status(200).json({
            navigation: formattedNavigation,
            reports: formattedReports
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: "Error fetching system metadata",
            error: error.message
        });
    }
};

exports.getUsers = async (req, res) => {
    const users = await db.UserMst.findAll({
        attributes: [
            'UserMstId',
            'Username',
            'UserGrp',
            'Active',
            'createdAt',
            'updatedAt'
        ],
        where: {
            IsDelete: false
        },
        order: [['UserMstId', 'DESC']]
    });

    return res.status(200).json({
        success: true,
        data: users
    });
};

exports.getUserDetails = async (req, res) => {
    try {
        const { UserMstId } = req.params;

        const user = await db.UserMst.findOne({
            attributes: [
                'UserMstId',
                'Username',
                'Active',
                'UserGrp'
            ],
            where: {
                UserMstId,
                IsDelete: false
            }
        });

        if (!user) {
            throw new AppError("User not found", 404);
        }

        const navigationQuery = `
            SELECT
                mm.MainMenuMstId,
                mm.MainMenuName,
                (
                    SELECT
                        m.MenuMstId,
                        m.MenuName,
                        ISNULL(ump.isCreate, 0) AS isCreate,
                        ISNULL(ump.isEdit, 0) AS isEdit,
                        ISNULL(ump.isDelete, 0) AS isDelete,
                        ISNULL(ump.isView, 0) AS isView
                    FROM MenuMst m
                    LEFT JOIN UserMenuMst ump
                        ON ump.MenuMstId = m.MenuMstId
                        AND ump.UserMstId = ${UserMstId}
                    WHERE m.MainMenuMstId = mm.MainMenuMstId
                      AND m.Active = 1
                    ORDER BY m.SortId, m.MenuName
                    FOR JSON PATH
                ) AS Menus
            FROM MainMenuMst mm
            WHERE mm.Active = 1
            ORDER BY mm.MainMenuName
        `;

        const reportsQuery = `
            SELECT
                rt.ReportTypeMstId,
                rt.ReportTypeName,
                (
                    SELECT
                        srt.SubReportTypeMstId,
                        srt.SubReportTypeName,
                        CAST(ISNULL(urp.isView, 0) AS BIT) AS isView
                    FROM SubReportTypeMst srt
                    LEFT JOIN UserReportMst urp
                        ON urp.SubReportTypeMstId = srt.SubReportTypeMstId
                        AND urp.UserMstId = ${UserMstId}
                    WHERE srt.ReportTypeMstId = rt.ReportTypeMstId
                      AND srt.Active = 1
                    ORDER BY srt.SortId
                    FOR JSON PATH
                ) AS SubReports
            FROM ReportTypeMst rt
            WHERE rt.Active = 1
            ORDER BY rt.ReportTypeName
        `;

        const navigation = await db.sequelize.query(
            navigationQuery,
            { type: QueryTypes.SELECT }
        );

        const reports = await db.sequelize.query(
            reportsQuery,
            { type: QueryTypes.SELECT }
        );

        return res.status(200).json({
            UserMstId: user.UserMstId,
            Username: user.Username,
            Active: user.Active,
            UserGrp: user.UserGrp,
            navigation: navigation.map(x => ({
                ...x,
                Menus: x.Menus ? JSON.parse(x.Menus) : []
            })),
            reports: reports.map(x => ({
                ...x,
                SubReports: x.SubReports
                    ? JSON.parse(x.SubReports)
                    : []
            }))
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};