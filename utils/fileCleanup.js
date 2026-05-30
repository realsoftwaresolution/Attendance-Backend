const fs = require('fs');
const path = require('path');

const deleteSingleFile = (relativePath) => {
    if (!relativePath) return;

    const absolutePath = path.join(__dirname, '..', relativePath);

    try {
        if (fs.existsSync(absolutePath)) {
            fs.unlinkSync(absolutePath);
            console.log(`🗑️ Successfully deleted file: ${absolutePath}`);
        }
    } catch (err) {
        console.error(`❌ Failed to delete file at ${absolutePath}:`, err.message);
    }
};

const deleteFileArray = (jsonStringArray) => {
    if (!jsonStringArray) return;

    try {
        const filePaths = JSON.parse(jsonStringArray);
        if (Array.isArray(filePaths)) {
            filePaths.forEach(filePath => deleteSingleFile(filePath));
        }
    } catch (err) {
        console.error(`❌ Failed to parse or clean file array string:`, err.message);
    }
};

module.exports = { deleteSingleFile, deleteFileArray };