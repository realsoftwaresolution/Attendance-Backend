const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const { AppError } = require("./AppError");

const storage = multer.memoryStorage();

const configureMulterValidators = (schema) => {
    const fieldsArray = schema.map(f => ({ name: f.name, maxCount: f.maxCount }));

    return (req, res, next) => {
        const upload = multer({
            storage: storage,
            fileFilter: (req, file, cb) => {
                const fieldConfig = schema.find(f => f.name === file.fieldname);
                if (!fieldConfig) {
                    return cb(new AppError(`Unexpected field input: ${file.fieldname}`, 400), false);
                }

                // 1. Strict Mimetype Validation
                if (!file.mimetype || !fieldConfig.allowedTypes.includes(file.mimetype)) {
                    return cb(new AppError(`Field [${file.fieldname}] only allows: ${fieldConfig.allowedTypes.join(", ")}`, 400), false);
                }

                // 2. Strict Per-Field Stream Size Validation (Fixes the leak!)
                // If a specific size isn't defined, it falls back strictly to 5MB
                const maxAllowedBytes = (fieldConfig.maxSizeMb || 5) * 1024 * 1024;
                
                if (req.headers['content-length'] && parseInt(req.headers['content-length']) > maxAllowedBytes) {
                    file.maxFieldSizeLimit = maxAllowedBytes;
                }

                cb(null, true);
            }
        }).fields(fieldsArray);

        upload(req, res, (err) => {
            if (err) {
                if (err.code === 'LIMIT_UNEXPECTED_FILE') {
                    return next(new AppError("File count limit exceeded for one of your fields.", 400));
                }
                return next(err);
            }

            if (req.files) {
                for (const field of schema) {
                    const files = req.files[field.name] || [];
                    const maxBytes = (field.maxSizeMb || 5) * 1024 * 1024;
                    
                    for (const file of files) {
                        // If any individual file buffer in memory exceeds its specific field cap, reject!
                        if (file.size > maxBytes) {
                            return next(new AppError(`Validation failed: File inside '${field.name}' exceeds its allowed limit of ${field.maxSizeMb}MB.`, 400));
                        }
                    }
                }
            }

            req.uploadSchema = schema;
            next();
        });
    };
};

const saveValidatedBuffersToDisk = async (req) => {
    const savedPaths = {};
    if (!req.files || !req.uploadSchema) return savedPaths;

    for (const field of req.uploadSchema) {
        const files = req.files[field.name];
        if (!files || files.length === 0) continue;

        savedPaths[field.name] = [];
        const resolvedPath = field.pathBuilder(req);
        const targetDir = path.join(__dirname, "..", "uploads", resolvedPath);

        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        for (const file of files) {
            const ext = path.extname(file.originalname) || ".jpg";
            const fileName = `${uuidv4()}${ext}`;
            const fullPath = path.join(targetDir, fileName);

            await fs.promises.writeFile(fullPath, file.buffer);

            const relativeLocation = `uploads/${resolvedPath}/${fileName}`;
            savedPaths[field.name].push(relativeLocation);
        }
    }

    return savedPaths;
};

module.exports = { configureMulterValidators, saveValidatedBuffersToDisk };