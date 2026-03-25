const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const uploadsDir = path.join(__dirname, '..', 'uploads');

const ensureUploadsDir = () => {
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }
};

const mimeExtensions = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp'
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        ensureUploadsDir();
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const originalExt = path.extname(file.originalname || '').toLowerCase();
        const safeExt = mimeExtensions[file.mimetype] || originalExt || '.jpg';
        const uniqueName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${safeExt}`;
        cb(null, uniqueName);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedMimes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp'
    ];

    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        console.error(`[UPLOAD REJECTED] Invalid MIME type: ${file.mimetype} for file: ${file.originalname}`);
        cb(new Error('Chỉ chấp nhận file ảnh định dạng JPG, PNG, GIF hoặc WebP'), false);
    }
};

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter
});

const secureUpload = (fieldName) => {
    return (req, res, next) => {
        upload.single(fieldName)(req, res, (err) => {
            if (err) {
                console.error('[UPLOAD ERROR]', err.message);
                return res.status(400).json({ status: false, message: err.message });
            }

            if (req.file) {
                req.file.path = `/uploads/${req.file.filename}`;
            }

            next();
        });
    };
};

module.exports = upload;
module.exports.secureUpload = secureUpload;
