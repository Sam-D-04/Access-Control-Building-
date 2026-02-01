const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();

// Script reset password cho tất cả users
async function resetAllPasswords() {
    let connection;

    try {
        console.log('='.repeat(80));
        console.log('RESET PASSWORD - ACCESS CONTROL SYSTEM');
        console.log('='.repeat(80));
        console.log('\nĐang kết nối database...');

        // Kết nối database
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'access_control'
        });

        console.log('✓ Kết nối database thành công\n');

        // Lấy tất cả users
        const [users] = await connection.execute('SELECT id, employee_id, email, full_name FROM users');
        console.log(`Tìm thấy ${users.length} users\n`);

        // Mật khẩu mặc định
        const defaultPassword = '123456';
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(defaultPassword, salt);

        console.log(`Mật khẩu mặc định: ${defaultPassword}`);
        console.log(`Hash: ${hashedPassword}\n`);
        console.log('Đang cập nhật password...\n');

        // Update password cho từng user
        for (const user of users) {
            await connection.execute(
                'UPDATE users SET password = ? WHERE id = ?',
                [hashedPassword, user.id]
            );
            console.log(`✓ [${user.employee_id}] ${user.email} - ${user.full_name}`);
        }

        console.log('\n' + '='.repeat(80));
        console.log(`✓ ĐÃ RESET PASSWORD CHO ${users.length} USERS`);
        console.log('Mật khẩu mới: 123456');
        console.log('='.repeat(80));

    } catch (error) {
        console.error('\n✗ LỖI:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Chạy script
resetAllPasswords();
