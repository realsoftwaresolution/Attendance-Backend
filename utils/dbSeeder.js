const db = require("../config/dbConnection");

const {
    MAIN_MENU,
    FORMS,
    REPORT_TYPES,
    SUB_REPORTS
} = require("../constants/permissions.constants");

const { hashPassword } = require("./hash.utils");

const seedDatabase = async () => {
    try {

        const mainMenus = [
            MAIN_MENU.MASTER,
            MAIN_MENU.TRANSACTION,
            MAIN_MENU.REPORT,
            MAIN_MENU.UTILITY
        ];

        for (const menuName of mainMenus) {
            await db.MainMenuMst.findOrCreate({
                where: {
                    MainMenuName: menuName
                },
                defaults: {
                    MainMenuName: menuName,
                    Active: true
                }
            });
        }

        const menuItems = [
            { MenuName: "Employee", MainMenuName: MAIN_MENU.MASTER, FormName: FORMS.EMPLOYEE },
            { MenuName: "Department", MainMenuName: MAIN_MENU.MASTER, FormName: FORMS.DEPARTMENT },
            { MenuName: "Company", MainMenuName: MAIN_MENU.MASTER, FormName: FORMS.COMPANY },
            { MenuName: "Hour Category", MainMenuName: MAIN_MENU.MASTER, FormName: FORMS.HOUR_CATEGORY },
            { MenuName: "Designation", MainMenuName: MAIN_MENU.MASTER, FormName: FORMS.DESIGNATION },
            { MenuName: "Holiday", MainMenuName: MAIN_MENU.MASTER, FormName: FORMS.HOLIDAY },
            { MenuName: "Advanced Entry", MainMenuName: MAIN_MENU.MASTER, FormName: FORMS.ADVANCED_ENTRY },
            { MenuName: "Counter", MainMenuName: MAIN_MENU.MASTER, FormName: FORMS.COUNTER },

            { MenuName: "Provident Fund", MainMenuName: MAIN_MENU.MASTER, FormName: FORMS.PF_MASTER },
            { MenuName: "Professional Tax", MainMenuName: MAIN_MENU.MASTER, FormName: FORMS.PT_MASTER },
            { MenuName: "ESIC", MainMenuName: MAIN_MENU.MASTER, FormName: FORMS.ESIC_MASTER },

            { MenuName: "Attendance", MainMenuName: MAIN_MENU.TRANSACTION, FormName: FORMS.ATTENDANCE },
            { MenuName: "Shift Entry", MainMenuName: MAIN_MENU.TRANSACTION, FormName: FORMS.SHIFT_ENTRY },
            { MenuName: "Hour Calculation", MainMenuName: MAIN_MENU.TRANSACTION, FormName: FORMS.HOUR_CALCULATION },
            { MenuName: "Salary Calculation", MainMenuName: MAIN_MENU.TRANSACTION, FormName: FORMS.SALARY_CALCULATION },

            { MenuName: "Backup", MainMenuName: MAIN_MENU.UTILITY, FormName: FORMS.BACKUP },
            { MenuName: "Master Settings", MainMenuName: MAIN_MENU.UTILITY, FormName: FORMS.MASTER_SETTINGS },
            { MenuName: "Import Data", MainMenuName: MAIN_MENU.UTILITY, FormName: FORMS.IMPORT_DATA },
            { MenuName: "Form 16", MainMenuName: MAIN_MENU.UTILITY, FormName: FORMS.FORM_16 },
            { MenuName: "User Master", MainMenuName: MAIN_MENU.UTILITY, FormName: FORMS.USER_MASTER }
        ];

        for (const item of menuItems) {
            const mainMenu = await db.MainMenuMst.findOne({
                where: {
                    MainMenuName: item.MainMenuName
                }
            });

            if (!mainMenu) continue;

            const existingMenu = await db.MenuMst.findOne({
                where: {
                    FormName: item.FormName
                }
            });

            if (!existingMenu) {
                await db.MenuMst.create({
                    MenuName: item.MenuName,
                    FormName: item.FormName,
                    MainMenuMstId: mainMenu.MainMenuMstId,
                    Active: true
                });
            }
        }


        for (const reportTypeName of Object.values(REPORT_TYPES)) {
            await db.ReportTypeMst.findOrCreate({
                where: {
                    ReportTypeName: reportTypeName
                },
                defaults: {
                    ReportTypeName: reportTypeName,
                    Active: true
                }
            });
        }

        for (const sub of SUB_REPORTS) {
            const reportType = await db.ReportTypeMst.findOne({
                where: {
                    ReportTypeName: sub.type
                }
            });

            if (!reportType) continue;

            const existingSubReport = await db.SubReportTypeMst.findOne({
                where: {
                    ReportName: sub.form
                }
            });

            if (!existingSubReport) {
                await db.SubReportTypeMst.create({
                    SubReportTypeName: sub.name,
                    ReportName: sub.form,
                    ReportTypeMstId: reportType.ReportTypeMstId,
                    SortId: 1,
                    Active: true
                });
            }
        }

        const [admin] = await db.UserMst.findOrCreate({
            where: {
                Username: "realsoft"
            },
            defaults: {
                Username: "realsoft",
                Password: await hashPassword("realsoft"),
                UserType: "Admin",
                UserGrp: "Admin",
                Sflag: "I",
                CompanyCode: 0,
                SortId: 1,
                Active: true,
                IsDelete: false
            }
        });

        const allMenus = await db.MenuMst.findAll();

        for (const menu of allMenus) {
            const existingPermission = await db.UserMenuMst.findOne({
                where: {
                    UserMstId: admin.UserMstId,
                    MenuMstId: menu.MenuMstId
                }
            });

            if (!existingPermission) {
                await db.UserMenuMst.create({
                    UserMstId: admin.UserMstId,
                    MenuMstId: menu.MenuMstId,
                    MainMenuMstId: menu.MainMenuMstId,
                    isCreate: true,
                    isEdit: true,
                    isDelete: true,
                    isView: true
                });
            }
        }

        const allReports = await db.SubReportTypeMst.findAll();

        for (const report of allReports) {
            const existingPermission = await db.UserReportMst.findOne({
                where: {
                    UserMstId: admin.UserMstId,
                    SubReportTypeMstId: report.SubReportTypeMstId
                }
            });

            if (!existingPermission) {
                await db.UserReportMst.create({
                    UserMstId: admin.UserMstId,
                    ReportTypeMstId: report.ReportTypeMstId,
                    SubReportTypeMstId: report.SubReportTypeMstId,
                    isView: true
                });
            }
        }

        console.log("✅ Database seeded/synced successfully.");
    } catch (error) {
        console.error("❌ Database seeding failed:", error);
    }
};

module.exports = seedDatabase;