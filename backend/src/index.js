// File khởi động server

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { testDatabaseConnection } = require('./config/database');
const { initMqttClient } = require('./config/mqtt');
const { handleError, handleNotFound } = require('./middlewares/errorHandler');

// Tạo ứng dụng Express
const app = express();
const PORT = process.env.PORT || 3000;


// CÀI ĐẶT MIDDLEWARE

// Middleware để đọc JSON từ request body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware CORS (cho phép frontend gọi API)
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
}));

// Middleware log request đơn giản
app.use(function(req, res, next) {
    console.log(`${req.method} ${req.path}`);
    next();
});




// CÁC ROUTE

// Route trang chủ
app.get('/', function(req, res) {
    res.json({
        success: true,
        message: 'Access Control System - API Backend',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            auth: '/api/auth',
            access: '/api/access',
            users: '/api/users',
            credentials: '/api/credentials',
            doors: '/api/doors',
            departments: '/api/departments',
            qr: '/api/qr'
        }
    });
});

// Route kiểm tra sức khỏe server
app.get('/health', function(req, res) {
    res.json({
        success: true,
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// API Routes
const routes = require('./routes');
app.use('/api', routes);



// XỬ LÝ LỖI

// Xử lý route không tồn tại (404)
app.use(handleNotFound);

// Xử lý lỗi chung
app.use(handleError);



// KHỞI ĐỘNG SERVER

async function startServer() {
    try {
        // Kiểm tra kết nối database
        console.log('Đang kiểm tra kết nối database...');
        await testDatabaseConnection();

        // Khởi tạo MQTT client
        console.log('Đang khởi tạo MQTT client...');
        initMqttClient();

        // Khởi động server Express
        app.listen(PORT, function() {
            console.log('');
            console.log('================================================');
            console.log('   HỆ THỐNG KIỂM SOÁT RA VÀO - BACKEND API');
            console.log('================================================');
            console.log('   Health check: ');
            console.log('================================================');
            console.log('');
        });
    } catch (error) {
        console.error('Lỗi khi khởi động server: ', error.message);
        process.exit(1);
    }
}

// Xử lý khi tắt server
process.on('SIGTERM', function() {
    console.log('Nhận tín hiệu SIGTERM: đang tắt server');
    process.exit(0);
});

process.on('SIGINT', function() {
    console.log('Nhận tín hiệu SIGINT: đang tắt server');
    process.exit(0);
});

// Chạy server
startServer();

module.exports = app;
