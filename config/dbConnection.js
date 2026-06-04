require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Sequelize } = require("sequelize");
const tedious = require("tedious");
const { applyGlobalHiddenFields } = require("../utils/modelHelper");

// 🌟 FIX 1: Set Node process timezone to IST globally at runtime
process.env.TZ = "Asia/Kolkata";

const db = {};

async function initialize() {
    try {
        const dbName = process.env.DB_NAME;

        await ensureDbExists(dbName);

        const sequelize = new Sequelize(
            dbName,
            process.env.DB_USER,
            process.env.DB_PASSWORD,
            {
                host: process.env.DB_HOST,
                port: Number(process.env.DB_PORT) || 1433,
                
                // 🌟 FIX 2: Direct Sequelize to communicate in Indian Standard Time (IST)
                timezone: "+05:30", 
                dialect: "mssql",
                dialectOptions: {
                    options: {
                        // 🌟 FIX 3: Turn off automatic UTC casting inside the Tedious driver
                        useUTC: false, 
                        dateFirst: 1,
                        encrypt: true,
                        trustServerCertificate: true
                    }
                },
                logging: false,
            }
        );

        const modelsDir = path.resolve(__dirname, "..", "models");

        const getAllFiles = (dir, allFilesList = []) => {
            const files = fs.readdirSync(dir);
            files.forEach((file) => {
                const filePath = path.join(dir, file);
                if (fs.statSync(filePath).isDirectory()) {
                    getAllFiles(filePath, allFilesList);
                } else {
                    allFilesList.push(filePath);
                }
            });
            return allFilesList;
        };

        getAllFiles(modelsDir)
            .filter((filePath) => {
                const fileName = path.basename(filePath);
                return (
                    fileName.indexOf(".") !== 0 &&
                    filePath !== path.resolve(__filename) &&
                    fileName.includes(".model")
                );
            })
            .forEach((filePath) => {
                const modelDef = require(filePath);
                const instantiatedModel = modelDef(sequelize, Sequelize);
                applyGlobalHiddenFields(instantiatedModel);
                db[instantiatedModel.name] = instantiatedModel;
            });

        await sequelize.sync({ alter: false });

        db.sequelize = sequelize;
        db.Sequelize = Sequelize;

        console.log(`✔ Database initialized with ${Object.keys(db).length - 2} dynamic models`);
    } catch (err) {
        console.error("❌ DB init failed:", err);
    }
}

initialize();
module.exports = db;

function ensureDbExists(dbName) {
    return new Promise((resolve, reject) => {
        const connection = new tedious.Connection({
            server: process.env.DB_HOST,
            authentication: {
                type: "default",
                options: {
                    userName: process.env.DB_USER,
                    password: process.env.DB_PASSWORD,
                },
            },
            options: {
                port: Number(process.env.DB_PORT) || 1433,
                database: "master",
                encrypt: true,
                trustServerCertificate: true,
            },
        });

        connection.on("connect", (err) => {
            if (err) return reject(err);

            const query = `IF NOT EXISTS (SELECT * FROM sys.databases WHERE name='${dbName}')
                           CREATE DATABASE [${dbName}]`;

            const request = new tedious.Request(query, (queryErr) => {
                connection.close();
                if (queryErr) return reject(queryErr);
                resolve();
            });

            connection.execSql(request);
        });

        connection.connect();
    });
}