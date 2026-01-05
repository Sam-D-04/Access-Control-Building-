const jwt = require('jsonwebtoken');
const { findUserById } = require('../models/User');
const { CustomError } = require('./errorHandler');

// Middleware xác thực token
async function authenticateToken(req, res, next) {
    try {
        // Lấy token từ header Authorization
        const authHeader = req.headers['authorization'];

        // Kiểm tra có header không
        if (!authHeader) {
            throw new CustomError('Không tìm thấy token', 401);
        }

        // Token có format: "Bearer <token>"
        // Tôi cần tách lấy phần token
        const token = authHeader.split(' ')[1];

        // Kiểm tra có token không
        if (!token) {
            throw new CustomError('Token không hợp lệ', 401);
        }

        // Verify token bằng JWT
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Lấy thông tin user từ database
        const user = await findUserById(decoded.userId);

        // Kiểm tra user có tồn tại không
        if (!user) {
            throw new CustomError('User không tồn tại', 401);
        }

        // Kiểm tra user có bị vô hiệu hóa không
        if (!user.is_active) {
            throw new CustomError('Tài khoản đã bị vô hiệu hóa', 403);
        }

        // Lưu thông tin user vào req để dùng ở các middleware/controller sau
        req.user = user;

        // Chuyển sang middleware tiếp theo
        next();
    } catch (error) {
        // Nếu lỗi do JWT thì custom message
        if (error.name === 'JsonWebTokenError') {
            next(new CustomError('Token không hợp lệ', 401));
        } else if (error.name === 'TokenExpiredError') {
            next(new CustomError('Token đã hết hạn', 401));
        } else {
            next(error);
        }
    }
}

// Middleware kiểm tra role 
function requireRole(...allowedRoles) {
    return function(req, res, next) {
        // Kiểm tra user đã được authenticate chưa
        if (!req.user) {
            return next(new CustomError('Chưa đăng nhập', 401));
        }

        // Kiểm tra role của user có nằm trong danh sách cho phép không
        if (!allowedRoles.includes(req.user.role)) {
            return next(new CustomError('Không có quyền truy cập', 403));
        }

        // Cho phép tiếp tục
        next();
    };
}

// Middleware kiểm tra chức vụ
function requirePosition(...allowedPositions) {
    return function(req, res, next) {
        // Kiểm tra user đã được authenticate chưa
        if (!req.user) {
            return next(new CustomError('Chưa đăng nhập', 401));
        }

        // Kiểm tra position của user
        if (!allowedPositions.includes(req.user.position)) {
            return next(new CustomError('Chức vụ không đủ quyền', 403));
        }
        next();
    };
}

module.exports = {
    authenticateToken,
    requireRole,
    requirePosition
};
