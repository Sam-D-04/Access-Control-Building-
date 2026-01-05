const { executeQuery, getOneRow } = require('../config/database');
const bcrypt = require('bcryptjs');

// tìm user theo email
async function findUserByEmail(email) {
    //SQL 
    const sql = 'SELECT * FROM users WHERE email = ?';
    // Thực thi
    const user = await getOneRow(sql, [email]);

    return user;
}

// tìm user theo ID
async function findUserById(userId) {
    const sql = 'SELECT * FROM users WHERE id = ?';
    // Thực thi 
    const user = await getOneRow(sql, [userId]);

    return user;
}

// tìm user theo employee_id
async function findUserByEmployeeId(employeeId) {
    const sql = 'SELECT * FROM users WHERE employee_id = ?';
    const user = await getOneRow(sql, [employeeId]);

    return user;
}

// lấy tất cả users
async function getAllUsers() {
    const sql = `
        SELECT
            u.id,
            u.employee_id,
            u.email,
            u.full_name,
            u.phone,
            u.avatar,
            u.department_id,
            d.name as department_name,
            u.position,
            u.role,
            u.is_active,
            u.created_at
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        ORDER BY u.created_at DESC
    `;
    const users = await executeQuery(sql, []);

    return users;
}

// tạo user mới
async function createUser(userData) {
    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    const sql = `
        INSERT INTO users (
            employee_id,
            email,
            password,
            full_name,
            phone,
            avatar,
            department_id,
            position,
            role,
            is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
        userData.employee_id,
        userData.email,
        hashedPassword,
        userData.full_name,
        userData.phone || null,
        userData.avatar || null,
        userData.department_id || null,
        userData.position || 'staff',
        userData.role || 'employee',
        userData.is_active !== undefined ? userData.is_active : true
    ];

    const result = await executeQuery(sql, params);

    return await findUserById(result.insertId);
}

// cập nhật user
async function updateUser(userId, userData) {
    // Tạo câu SQL update động
    const updateFields = [];
    const params = [];

    // Kiểm tra từng field để update
    if (userData.email) {
        updateFields.push('email = ?');
        params.push(userData.email);
    }

    if (userData.full_name) {
        updateFields.push('full_name = ?');
        params.push(userData.full_name);
    }

    if (userData.phone !== undefined) {
        updateFields.push('phone = ?');
        params.push(userData.phone);
    }

    if (userData.avatar !== undefined) {
        updateFields.push('avatar = ?');
        params.push(userData.avatar);
    }

    if (userData.department_id !== undefined) {
        updateFields.push('department_id = ?');
        params.push(userData.department_id);
    }

    if (userData.position) {
        updateFields.push('position = ?');
        params.push(userData.position);
    }

    if (userData.role) {
        updateFields.push('role = ?');
        params.push(userData.role);
    }

    if (userData.is_active !== undefined) {
        updateFields.push('is_active = ?');
        params.push(userData.is_active);
    }

    if (userData.password) {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        updateFields.push('password = ?');
        params.push(hashedPassword);
    }

    // Nếu không có field nào để update thì return
    if (updateFields.length === 0) {
        return await findUserById(userId);
    }

    // Thêm userId vào params
    params.push(userId);

    //SQL
    const sql = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
    await executeQuery(sql, params);

    return await findUserById(userId);
}

// xóa user
async function deleteUser(userId) {

    const sql = 'DELETE FROM users WHERE id = ?';

    const result = await executeQuery(sql, [userId]);

    return result.affectedRows > 0;
}

// kiểm tra password
async function verifyPassword(plainPassword, hashedPassword) {
    // Dùng bcrypt để so sánh password
    const isMatch = await bcrypt.compare(plainPassword, hashedPassword);

    return isMatch;
}

module.exports = {
    findUserByEmail,
    findUserById,
    findUserByEmployeeId,
    getAllUsers,
    createUser,
    updateUser,
    deleteUser,
    verifyPassword
};
