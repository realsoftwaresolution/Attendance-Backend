const multer = require('multer');
const path = require('path');
const { use } = require('../routes/admin.routes');

// Set up storage engine
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        console.log('Destination called');
        cb(null, './uploads'); // Directory to store uploaded files
    },
    filename: (req, file, cb) => {
        // Get username from request (assuming it's passed in req.body or req.user)
        const userID = req.body.empCode;
        // const userID = req.user.UserMstId;
        // const username = req.user.Username;  // Adjust based on where the username is stored

        // Ensure the username is sanitized to avoid illegal characters in the filename
        // const sanitizedUsername = username.replace(/[^a-z0-9]/gi, '_').toLowerCase(); 

        // Create a unique suffix for the filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);

        const fileExtension = path.extname(file.originalname);

        // Construct the filename with username and unique suffix
        const filename = `${userID}-${uniqueSuffix}${fileExtension}`;

        
        console.log(`Uploading file: ${file.originalname}, Unique filename: ${filename}`);
        
        // Save the file with the constructed filename
        cb(null, filename);
    }
});

// Multer upload instance for multiple files
const upload = multer({ 
    storage,
    fileFilter: (req, file, cb) => {
        console.log('File filter called for:', file.originalname);
        
        const fileTypes = /jpeg|jpg|png|pdf/; // Allowed file extensions
        const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
        // const mimetype = fileTypes.test(file.mimetype);

        // console.log(file.mimetype);

        // console.log(extname);
        // console.log(mimetype);


        if (extname) {
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
