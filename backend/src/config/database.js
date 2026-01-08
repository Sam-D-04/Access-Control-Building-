const mysql = require('mysql2/promise');
require('dotenv').config();

// Tạo connection pool để tái sử dụng kết nối
const connectionPool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'access_control',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Hàm kiểm tra kết nối database
async function testDatabaseConnection() {
    try {
        // Lấy 1 connection từ pool để test
        const connection = await connectionPool.getConnection();
        console.log('Kết nối database thành công');
        console.log(`   Host: ${process.env.DB_HOST}`);
        console.log(`   Database: ${process.env.DB_NAME}`);

        // Trả connection về pool
        connection.release();
    } catch (error) {
        console.error('Kết nối database thất bại', error.message);
        process.exit(1);
    }
}

// Hàm thực thi câu query SQL
async function executeQuery(sqlQuery, params = []) {
    try {
        const [results] = await connectionPool.execute(sqlQuery, params);
        return results;
    } catch (error) {
        console.error('Lỗi khi thực thi query:', error.message);
        console.error('SQL:', sqlQuery);
        console.error('Params:', params);
        throw error;
    }
}

// Hàm lấy 1 dòng dữ liệu từ database
async function getOneRow(sqlQuery, params = []) {
    const results = await executeQuery(sqlQuery, params);

    // Kiểm tra có dữ liệu không
    if (results.length > 0) {
        return results[0];
    } else {
        return null;
    }
}

module.exports = {
    connectionPool,
    testDatabaseConnection,
    executeQuery,
    getOneRow
};
