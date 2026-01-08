const { executeQuery, getOneRow } = require('../config/database');
const { CustomError } = require('../middlewares/errorHandler');


// POST /api/visitors/capture - Lưu ảnh Base64 vào DB
async function captureVisitorPhoto(req, res, next) {
    try {
        // Nhận trực tiếp chuỗi base64 từ body
        const { photo, notes } = req.body; 

        if (!photo) {
            throw new CustomError('Không tìm thấy dữ liệu ảnh', 400);
        }

        // Lưu trực tiếp chuỗi Base64 vào cột photo_path
        const sql = `
            INSERT INTO visitor_photos (photo_path, notes)
            VALUES (?, ?)
        `;

        // photo ở đây là chuỗi "data:image/jpeg;base64,..."
        const result = await executeQuery(sql, [photo, notes || null]);

        const newPhoto = await getOneRow(`
            SELECT * FROM visitor_photos WHERE id = ?
        `, [result.insertId]);

        res.status(201).json({
            success: true,
            message: 'Đã lưu ảnh thành công',
            data: newPhoto
        });

    } catch (error) {
        next(error);
    }
}

// GET /api/visitors/photos - Lấy danh sách ảnh
async function getVisitorPhotos(req, res, next) {
    try {
        const { limit = 20, offset = 0 } = req.query;
        const limitNum = parseInt(limit);
        const offsetNum = parseInt(offset);

        const sql = `
            SELECT * FROM visitor_photos 
            ORDER BY captured_at DESC
            LIMIT ${limitNum} OFFSET ${offsetNum}
        `;

        const photos = await executeQuery(sql);

        res.json({
            success: true,
            data: photos,
            pagination: { limit: limitNum, offset: offsetNum }
        });

    } catch (error) {
        next(error);
    }
}

//xóa 
async function deleteVisitorPhoto(req, res, next) {
    try {
        const { id } = req.params;
        const photo = await getOneRow('SELECT * FROM visitor_photos WHERE id = ?', [id]);
        if (!photo) throw new CustomError('Không tìm thấy ảnh', 404);

        await executeQuery('DELETE FROM visitor_photos WHERE id = ?', [id]);
        
        
        res.json({ success: true, message: 'Đã xóa ảnh thành công' });
    } catch (error) {
        next(error);
    }
}

async function getVisitorPhotoById(req, res, next) {
    try {
        const { id } = req.params;
        const photo = await getOneRow('SELECT * FROM visitor_photos WHERE id = ?', [id]);
        if (!photo) throw new CustomError('Không tìm thấy ảnh', 404);
        res.json({ success: true, data: photo });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    captureVisitorPhoto,
    getVisitorPhotos,
    deleteVisitorPhoto,
    getVisitorPhotoById
};