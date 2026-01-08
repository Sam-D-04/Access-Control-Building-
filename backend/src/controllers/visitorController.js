const { executeQuery, getOneRow } = require('../config/database');
const { CustomError } = require('../middlewares/errorHandler');


// POST /api/visitors/capture - Lưu ảnh Base64 vào DB
// Dòng 5-36
async function captureVisitorPhoto(req, res, next) {
    try {
        // Nhận data từ frontend
        const { photo, notes } = req.body;
        //     ↑ Base64 string    ↑ "Họ tên: X - CCCD: Y - Lý do: Z"

        if (!photo) {
            throw new CustomError('Không tìm thấy dữ liệu ảnh', 400);
        }

        // INSERT vào DB
        const sql = `
            INSERT INTO visitor_photos (photo_path, notes)
            VALUES (?, ?)
        `;

        const result = await executeQuery(sql, [photo, notes || null]);
        //                                       ↑ "data:image/jpeg;base64,/9j/4AAQ..."

        // Lấy lại record vừa tạo
        const newPhoto = await getOneRow(`
            SELECT * FROM visitor_photos WHERE id = ?
        `, [result.insertId]);

        // Trả về response
        res.status(201).json({
            success: true,
            message: 'Đã lưu ảnh thành công',
            data: newPhoto
        });

    } catch (error) {
        next(error);  // Chuyển lỗi cho error handler middleware
    }
}

// GET /api/visitors/photos - Lấy danh sách ảnh
async function getVisitorPhotos(req, res, next) {
    try {

        const {
            limit = 20,     
            offset = 0,      
            date,             
            start_time,     
            end_time        
        } = req.query;

        const limitNum = parseInt(limit);
        const offsetNum = parseInt(offset);


        let whereClauses = [];  
        let params = [];      

        // 1. Lọc theo ngày
        if (date) {
            whereClauses.push('DATE(captured_at) = ?');
            params.push(date);
        }

        // 2. Lọc theo giờ bắt đầu
        if (start_time) {
            whereClauses.push('TIME(captured_at) >= ?');
            params.push(start_time);
        }

        // 3. Lọc theo giờ kết thúc
        if (end_time) {
            whereClauses.push('TIME(captured_at) <= ?');
            params.push(end_time);
        }

        // Ghép các điều kiện lại
        const whereSQL = whereClauses.length > 0
            ? 'WHERE ' + whereClauses.join(' AND ')
            : '';
        
        const sql = `
            SELECT * FROM visitor_photos
            ${whereSQL}
            ORDER BY captured_at DESC
            LIMIT ? OFFSET ?
        `;

        params.push(limitNum, offsetNum);  // Thêm limit và offset vào cuối

        const photos = await executeQuery(sql, params);

        // ===== ĐẾM TỔNG SỐ (Cho phân trang) =====
        const countSQL = `SELECT COUNT(*) as total FROM visitor_photos ${whereSQL}`;
        const countParams = params.slice(0, -2);  // Bỏ limit và offset
        const countResult = await getOneRow(countSQL, countParams);

        // ===== RESPONSE =====
        res.json({
            success: true,
            data: photos,
            pagination: {
                limit: limitNum,
                offset: offsetNum,
                total: countResult.total
            },
            filters: { date, start_time, end_time }
        });

    } catch (error) {
        next(error);
    }
}


//xóa 
async function deleteVisitorPhoto(req, res, next) {
    try {
        const { id } = req.params;
        
        // Kiểm tra tồn tại
        const photo = await getOneRow('SELECT * FROM visitor_photos WHERE id = ?', [id]);
        if (!photo) throw new CustomError('Không tìm thấy ảnh', 404);

        // Xóa khỏi DB
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

async function checkoutVisitor(req, res, next) {
    try {
        const { id } = req.params;      
        const { photo } = req.body;      

        if (!photo) {
            throw new CustomError('Cần chụp ảnh để checkout', 400);
        }

        // UPDATE 3 cột
        const sql = `
            UPDATE visitor_photos
            SET checkout_photo_path = ?,    -- Lưu ảnh ra
                is_checkout = 1,             -- Đánh dấu đã checkout
                time_out = NOW()             -- Lưu thời gian checkout
            WHERE id = ?
        `;

        await executeQuery(sql, [photo, id]);

        res.json({ success: true, message: 'Checkout thành công' });

    } catch (error) {
        next(error);
    }
}

// GET /api/visitors/photos
async function getVisitorPhotos(req, res) {
    try {
        const { limit = 20, offset = 0, startDate, endDate, search } = req.query;
        const limitNum = parseInt(limit);
        const offsetNum = parseInt(offset);

        let sql = `SELECT * FROM visitor_photos WHERE 1=1`;
        const params = [];

        // 1. Lọc theo ngày (Nếu có)
        if (startDate && endDate) {
            sql += ` AND captured_at BETWEEN ? AND ?`;
            params.push(startDate, endDate);
        }

        // 2. Tìm kiếm theo từ khóa (Tìm trong cột notes chứa Tên, CCCD...)
        if (search) {
            sql += ` AND notes LIKE ?`;
            params.push(`%${search}%`);
        }

        // 3. Sắp xếp và Phân trang
        sql += ` ORDER BY captured_at DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;

        const photos = await executeQuery(sql, params);

        res.json({
            success: true,
            data: photos,
            pagination: { limit: limitNum, offset: offsetNum }
        });

    } catch (error) {
    
    }
}
// GET /api/visitors/stats - Thống kê khách trong ngày
async function getVisitorStats(req, res, next) {
    try {
        const { date } = req.query; 

        // ===== XÂY DỰNG ĐIỀU KIỆN =====
        let whereClause = '';
        let params = [];

        if (date) {
            // Lọc theo ngày cụ thể
            whereClause = 'WHERE DATE(captured_at) = ?';
            params.push(date);
        } else {
            // Mặc định: hôm nay
            whereClause = 'WHERE DATE(captured_at) = CURDATE()';
        }

        // ===== QUERY THỐNG KÊ =====
        const sql = `
            SELECT
                COUNT(*) as total,                                      
                SUM(CASE WHEN is_checkout = 1 THEN 1 ELSE 0 END) as checked_out  
            FROM visitor_photos
            ${whereClause}
        `;

        const result = await getOneRow(sql, params);

        // ===== TÍNH TOÁN =====
        const total = result.total || 0;
        const checked_out = parseInt(result.checked_out || 0);
        const inside = total - checked_out;  // Còn trong tòa nhà

        // ===== RESPONSE =====
        res.json({
            success: true,
            data: {
                total,        
                checked_out,  
                inside,       
                date: date || 'today'
            }
        });

    } catch (error) {
        next(error);
    }
}

module.exports = {
    captureVisitorPhoto,
    getVisitorPhotos,
    getVisitorPhotoById,
    deleteVisitorPhoto,
    checkoutVisitor,
    getVisitorStats
};
