const tedious = require("tedious");
const { Sequelize } = require("sequelize");
const config = require("../config/db.config.js").development;

module.exports = db = {};

initialize();

async function initialize() {
    try {
        // Ensure the database exists
        await ensureDbExists(config.database);

        // Initialize Sequelize connection
        const sequelize = new Sequelize(
            config.database,
            config.username,
            config.password,
            {
                host: config.host,
                port: config.port,
                timezone: '+05:30',
                dialect: config.dialect,
                dialectOptions: config.dialectOptions,
                logging: true, // Disable Sequelize logging for cleaner output
            }
        );

        // Import Models
        db.UserMst = require("./user.model.js")(sequelize, Sequelize);
        db.EmployeeMst = require("./employee.model.js")(sequelize, Sequelize);
        db.HoursCategoryMst = require("./hoursCategory.model.js")(sequelize, Sequelize);
        db.HolidayMst = require("./holiday.model.js")(sequelize, Sequelize);
        db.DesignationMst = require("./designation.model.js")(sequelize, Sequelize);
        db.DepartmentMst = require("./department.model.js")(sequelize, Sequelize);
        db.FirmMst = require("./firm.model.js")(sequelize, Sequelize);
        db.ShiftEntryMst = require("./shift.model.js")(sequelize, Sequelize);
        db.AttendanceMst = require("./attendance.model.js")(sequelize, Sequelize);
        db.MasterSettingMst = require("./mastersetting.model.js")(sequelize, Sequelize);
        db.AttMst = require("./attmst.model.js")(sequelize, Sequelize);
        db.SalaryMst = require("./salaryMst.model.js")(sequelize, Sequelize);
        db.SalaryDetMst = require("./salaryDetMst.model.js")(sequelize, Sequelize);


        db.SalaryMst.hasMany(db.SalaryDetMst, { foreignKey: 'SalaryMstId', onDelete: 'CASCADE' });
        db.SalaryDetMst.belongsTo(db.SalaryMst, { foreignKey: 'SalaryMstId' });      

        // Add more models here as needed
        // db.YourModel = require('./yourModel.js')(sequelize, Sequelize);

        // Sync models with the database
        await sequelize.sync({ alter: true });
        console.log("✅ All models synced successfully.");

        // Export the database connection
        db.Sequelize = Sequelize;
        db.sequelize = sequelize;
    } catch (error) {
        console.error("Error during database initialization:", error.message);
    }
}

async function ensureDbExists(dbName) {
    return new Promise((resolve, reject) => {
        const connection = new tedious.Connection({
            server: config.host,
            authentication: {
                type: "default",
                options: {
                    userName: config.username,
                    password: config.password,
                },
            },
            options: {
                port: config.port,
                database: "master", // Connect to master DB to check/create the target DB
                encrypt: true,
                trustServerCertificate: true,
            },
        });

        connection.on("connect", (err) => {
            if (err) {
                console.error("Connection Failed:", err.message);
                return reject(err);
            }

            console.log('✅ Connected to MSSQL server.');

            // SQL Query to check and create the database if it doesn't exist
            const createDbQuery = `
                IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = '${dbName}')
                CREATE DATABASE [${dbName}];
            `;

            const request = new tedious.Request(createDbQuery, (err) => {
                if (err) {
                    console.error("Database creation failed:", err.message);
                    return reject(err);
                }
                console.log(`✅ Database "${dbName}" ensured.`);
                resolve();
            });

            connection.execSql(request);
        });

        connection.connect();
    });
}
