const { executeQuery, getOneRow } = require('../config/database');

// tìm phòng ban theo ID
async function findDepartmentById(deptId) {
    const sql = 'SELECT * FROM departments WHERE id = ?';
    const department = await getOneRow(sql, [deptId]);
    return department;
}

// lấy tất cả phòng ban (chỉ 3 phòng hardcoded)
async function getAllDepartments() {
    const sql = 'SELECT * FROM departments ORDER BY id ASC';
    const departments = await executeQuery(sql, []);
    return departments;
}

// đếm số nhân viên trong phòng ban
async function countEmployeesInDepartment(deptId) {
    const sql = `
        SELECT
            d.id,
            d.name,
            COUNT(u.id) as employee_count
        FROM departments d
        LEFT JOIN users u ON d.id = u.department_id
        WHERE d.id = ?
        GROUP BY d.id
    `;

    const result = await getOneRow(sql, [deptId]);
    return result;
}

// lấy tất cả phòng ban kèm số nhân viên
async function getAllDepartmentsWithCount() {
    const sql = `
        SELECT
            d.id,
            d.name,
            d.description,
            d.created_at,
            COUNT(u.id) as employee_count
        FROM departments d
        LEFT JOIN users u ON d.id = u.department_id
        GROUP BY d.id
        ORDER BY d.id ASC
    `;

    const departments = await executeQuery(sql, []);
    return departments;
}
module.exports = {
    findDepartmentById,
    getAllDepartments,
    countEmployeesInDepartment,
    getAllDepartmentsWithCount
};
