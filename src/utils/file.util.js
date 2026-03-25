const fs = require('fs');
const path = require('path');

const deleteFile = (filePath) => {
    try {
        if (!filePath) return;
        if (/^https?:\/\//i.test(filePath)) return;

        const srcDir = path.resolve(__dirname, '..');
        const uploadsDir = path.join(srcDir, 'uploads');

        const normalizedPath = String(filePath).replace(/\\/g, '/').replace(/^\/+/, '');
        const relativeUploadPath = normalizedPath.startsWith('uploads/')
            ? normalizedPath.slice('uploads/'.length)
            : path.basename(normalizedPath);

        const absolutePath = path.join(uploadsDir, relativeUploadPath);

        if (fs.existsSync(absolutePath)) {
            fs.unlinkSync(absolutePath);
        }
    } catch (error) {
        console.error(`[FileUtil] Error deleting file: ${filePath}`, error);
    }
};

module.exports = {
    deleteFile
};
