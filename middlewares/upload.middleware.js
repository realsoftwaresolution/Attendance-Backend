const multer = require('multer');
const path = require('path');

// Set up storage engine
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        console.log('Destination called');
        cb(null, './uploads'); // Directory to store uploaded files
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        console.log(`Uploading file: ${file.originalname}, Unique filename: ${uniqueSuffix}-${file.originalname}`);
        cb(null, `${uniqueSuffix}-${file.originalname}`);
    }
});

// Multer upload instance for multiple files
const upload = multer({ 
    storage,
    fileFilter: (req, file, cb) => {
        console.log('File filter called for:', file.originalname);
        
        const fileTypes = /jpeg|jpg|png|pdf/; // Allowed file extensions
        const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = fileTypes.test(file.mimetype);

        if (extname && mimetype) {
            console.log(`File ${file.originalname} is valid.`);
            return cb(null, true);
        } else {
            console.log(`File ${file.originalname} is invalid. Only images and PDF documents are allowed!`);
            return cb(new Error('Only images and PDF documents are allowed!'));
        }
    }
}).fields([
    { name: 'images', maxCount: 10 }, // Maximum 10 images
    { name: 'documents', maxCount: 5 } // Maximum 5 documents
]);

module.exports = upload;
