
const { executeQuery, getOneRow } = require('../config/database');
const { CustomError } = require('../middlewares/errorHandler');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;


// MULTER CONFIG - Upload ảnh

// Tạo folder uploads/visitors nếu chưa có
const uploadDir = path.join(__dirname, '../../uploads/visitors');

fs.mkdir(uploadDir, { recursive: true }).catch(console.error);

// Config multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Format: 2025-01-08_14-30-45_abc123.jpg
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-').replace('T', '_');
        const randomStr = Math.random().toString(36).substring(2, 8);
        const ext = path.extname(file.originalname);
        cb(null, `${timestamp}_${randomStr}${ext}`);
    }
});

// Filter chỉ cho phép ảnh
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new CustomError('Chỉ chấp nhận file ảnh (jpg, png, webp)', 400), false);
    }
};

// Middleware upload
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
});


// POST /api/visitors/capture - Upload ảnh khách lạ
async function captureVisitorPhoto(req, res, next) {
    try {
        // req.file được tạo bởi multer middleware
        if (!req.file) {
            throw new CustomError('Không tìm thấy file ảnh', 400);
        }

        const { notes } = req.body;
        const capturedBy = req.user.id; 

        // Đường dẫn relative từ backend root
        const photoPath = `uploads/visitors/${req.file.filename}`;

        // Lưu vào database
        const sql = `
            INSERT INTO visitor_photos (photo_path, notes, captured_by)
            VALUES (?, ?, ?)
        `;

        const result = await executeQuery(sql, [photoPath, notes || null, capturedBy]);

        // Lấy record vừa tạo (kèm thông tin user)
        const photo = await getOneRow(`
            SELECT
                vp.*,
                u.full_name as captured_by_name,
                u.employee_id as captured_by_employee_id
            FROM visitor_photos vp
                LEFT JOIN users u ON vp.captured_by = u.id
            WHERE vp.id = ?
        `, [result.insertId]);

        console.log('Visitor photo captured:', photo.id);

        res.status(201).json({
            success: true,
            message: 'Đã chụp và lưu ảnh thành công',
            data: photo
        });

    } catch (error) {
        // Xóa file nếu có lỗi database
        if (req.file) {
            fs.unlink(req.file.path).catch(console.error);
        }
        next(error);
    }
}

// GET /api/visitors/photos - Lấy danh sách ảnh
async function getVisitorPhotos(req, res, next) {
    try {
        const { limit = 20, offset = 0 } = req.query;

        const sql = `
            SELECT
                vp.*,
                u.full_name as captured_by_name,
                u.employee_id as captured_by_employee_id
            FROM visitor_photos vp
            LEFT JOIN users u ON vp.captured_by = u.id
            ORDER BY vp.captured_at DESC
            LIMIT ? OFFSET ?
        `;

        console.log("---- DEBUG SQL ----");
        console.log(sql);

        const photos = await executeQuery(sql, [parseInt(limit), parseInt(offset)]);

        res.json({
            success: true,
            data: photos,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });

    } catch (error) {
        next(error);
        console.error(error.message);
    }
}

// GET /api/visitors/photos/:id - Lấy 1 ảnh
async function getVisitorPhotoById(req, res, next) {
    try {
        const { id } = req.params;

        const photo = await getOneRow(`
            SELECT
                vp.*,
                u.full_name as captured_by_name,
                u.employee_id as captured_by_employee_id
            FROM visitor_photos vp
            LEFT JOIN users u ON vp.captured_by = u.id
            WHERE vp.id = ?
        `, [id]);

        if (!photo) {
            throw new CustomError('Không tìm thấy ảnh', 404);
        }

        res.json({
            success: true,
            data: photo
        });

    } catch (error) {
        next(error);
    }
}

// DELETE /api/visitors/photos/:id - Xóa ảnh
async function deleteVisitorPhoto(req, res, next) {
    try {
        const { id } = req.params;

        // Lấy thông tin ảnh để xóa file
        const photo = await getOneRow('SELECT * FROM visitor_photos WHERE id = ?', [id]);

        if (!photo) {
            throw new CustomError('Không tìm thấy ảnh', 404);
        }

        // Xóa record trong DB
        await executeQuery('DELETE FROM visitor_photos WHERE id = ?', [id]);

        // Xóa file
        const filePath = path.join(__dirname, '../../', photo.photo_path);
        fs.unlink(filePath).catch(console.error);

        res.json({
            success: true,
            message: 'Đã xóa ảnh thành công'
        });

    } catch (error) {
        next(error);
    }
}

module.exports = {
    upload, // Export middleware
    captureVisitorPhoto,
    getVisitorPhotos,
    getVisitorPhotoById,
    deleteVisitorPhoto
};
