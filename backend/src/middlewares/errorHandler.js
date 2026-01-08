// Middleware xử lý lỗi chung
function handleError(error, req, res, next) {
    // In lỗi ra console để debug
    console.error('Có lỗi xảy ra:');
    console.error('   Message:', error.message);
    console.error('   Path:', req.path);
    console.error('   Method:', req.method);

    // Nếu đang ở chế độ development thì in thêm stack trace
    if (process.env.NODE_ENV === 'development') {
        console.error('   Stack:', error.stack);
    }

    // Lấy status code từ error object
    let statusCode = error.statusCode;
    if (!statusCode) {
        statusCode = 500;  
    }

    // Lấy error message
    let errorMessage = error.message;
    if (!errorMessage) {
        errorMessage = 'Lỗi server';
    }

    // Tạo response object
    const responseData = {
        success: false,
        error: errorMessage
    };

    // Nếu development mode thì thêm stack trace vào response
    if (process.env.NODE_ENV === 'development') {
        responseData.stack = error.stack;
    }

    // Trả về response
    res.status(statusCode).json(responseData);
}

// Middleware xử lý route không tìm thấy (404)
function handleNotFound(req, res, next) {
    const error = new Error(`Không tìm thấy - ${req.originalUrl}`);
    error.statusCode = 404;
    next(error);
}

// Class để tạo custom error với status code
class CustomError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode || 500;
        this.name = 'CustomError';
    }
}

module.exports = {
    handleError,
    handleNotFound,
    CustomError
};
