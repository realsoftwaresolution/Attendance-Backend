const { QueryTypes } = require("sequelize");
const db = require("../config/dbConnection");

exports.getUserPermissions = async (userId) => {
    const menuRows = await db.sequelize.query(
        `
        SELECT
            mm.MainMenuName,
            m.MenuMstId,
            m.MenuName,
            m.FormName,
            um.isCreate,
            um.isEdit,
            um.isDelete,
            um.isView
        FROM UserMenuMst um
        INNER JOIN MenuMst m
            ON um.MenuMstId = m.MenuMstId
        INNER JOIN MainMenuMst mm
            ON mm.MainMenuMstId = um.MainMenuMstId
        WHERE um.UserMstId = :userId
            AND um.isView = 1
            AND m.Active = 1
            AND mm.Active = 1
        ORDER BY mm.MainMenuName, m.SortId, m.MenuName
        `,
        {
            replacements: { userId },
            type: QueryTypes.SELECT
        }
    );

    const permissions = {};

    menuRows.forEach(row => {
        if (!permissions[row.MainMenuName]) {
            permissions[row.MainMenuName] = [];
        }

        permissions[row.MainMenuName].push({
            MenuMstId: row.MenuMstId,
            MenuName: row.MenuName,
            FormName: row.FormName,
            isCreate: row.isCreate,
            isEdit: row.isEdit,
            isDelete: row.isDelete,
            isView: row.isView
        });
    });

    return permissions;
};

exports.getUserReports = async (userId) => {
    const reportRows = await db.sequelize.query(
        `
        SELECT
            rt.ReportTypeName,
            srt.SubReportTypeMstId,
            srt.SubReportTypeName,
            srt.ReportName
        FROM UserReportMst ur
        INNER JOIN ReportTypeMst rt
            ON rt.ReportTypeMstId = ur.ReportTypeMstId
        INNER JOIN SubReportTypeMst srt
            ON srt.SubReportTypeMstId = ur.SubReportTypeMstId
        WHERE ur.UserMstId = :userId
            AND ur.isView = 1
            AND rt.Active = 1
            AND srt.Active = 1
        ORDER BY rt.ReportTypeName, srt.SortId
        `,
        {
            replacements: { userId },
            type: QueryTypes.SELECT
        }
    );

    const reports = {};

    reportRows.forEach(row => {
        if (!reports[row.ReportTypeName]) {
            reports[row.ReportTypeName] = [];
        }

        reports[row.ReportTypeName].push({
            SubReportTypeMstId: row.SubReportTypeMstId,
            SubReportTypeName: row.SubReportTypeName,
            ReportName: row.ReportName
        });
    });

    return reports;
};

exports.buildTokenPermissions = (permissions, reports) => {
    const access = {};

    Object.values(permissions).forEach(menus => {
        menus.forEach(menu => {
            access[menu.FormName] = [
                !!menu.isCreate,
                !!menu.isEdit,
                !!menu.isView,
                !!menu.isDelete
            ];
        });
    });

    Object.values(reports).forEach(reportList => {
        reportList.forEach(report => {
            access[report.ReportName] = [true];
        });
    });

    return access;
};