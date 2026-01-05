const { executeQuery, getOneRow } = require('../config/database');

// tìm cửa theo ID
async function findDoorById(doorId) {
    const sql = `
        SELECT
            d.*,
            dept.name as department_name
        FROM doors d
        LEFT JOIN departments dept ON d.department_id = dept.id
        WHERE d.id = ?
    `;

    const door = await getOneRow(sql, [doorId]);
    return door;
}

// lấy tất cả cửa
async function getAllDoors() {
    const sql = `
        SELECT
            d.id,
            d.name,
            d.location,
            d.access_level,
            d.department_id,
            d.is_locked,
            d.is_active,
            d.created_at,
            dept.name as department_name
        FROM doors d
        LEFT JOIN departments dept ON d.department_id = dept.id
        WHERE d.is_active = TRUE
        ORDER BY d.id ASC
    `;

    const doors = await executeQuery(sql, []);
    return doors;
}

// lấy cửa theo access level (all, department, vip)
async function getDoorsByAccessLevel(accessLevel) {
    const sql = `
        SELECT
            d.*,
            dept.name as department_name
        FROM doors d
        LEFT JOIN departments dept ON d.department_id = dept.id
        WHERE d.access_level = ? AND d.is_active = TRUE
        ORDER BY d.id ASC
    `;

    const doors = await executeQuery(sql, [accessLevel]);
    return doors;
}

// lấy cửa theo phòng ban
async function getDoorsByDepartment(departmentId) {
    const sql = `
        SELECT
            d.*,
            dept.name as department_name
        FROM doors d
        LEFT JOIN departments dept ON d.department_id = dept.id
        WHERE d.department_id = ? AND d.is_active = TRUE
        ORDER BY d.id ASC
    `;

    const doors = await executeQuery(sql, [departmentId]);
    return doors;
}

// tạo cửa mới
async function createDoor(doorData) {
    const sql = `
        INSERT INTO doors (
            name,
            location,
            access_level,
            department_id,
            is_locked,
            is_active
        ) VALUES (?, ?, ?, ?, ?, ?)
    `;

    const params = [
        doorData.name,
        doorData.location || null,
        doorData.access_level || 'all',
        doorData.department_id || null,
        doorData.is_locked !== undefined ? doorData.is_locked : false,
        doorData.is_active !== undefined ? doorData.is_active : true
    ];

    const result = await executeQuery(sql, params);
    return await findDoorById(result.insertId);
}

// cập nhật cửa
async function updateDoor(doorId, doorData) {
    const updateFields = [];
    const params = [];

    if (doorData.name) {
        updateFields.push('name = ?');
        params.push(doorData.name);
    }

    if (doorData.location !== undefined) {
        updateFields.push('location = ?');
        params.push(doorData.location);
    }

    if (doorData.access_level) {
        updateFields.push('access_level = ?');
        params.push(doorData.access_level);
    }

    if (doorData.department_id !== undefined) {
        updateFields.push('department_id = ?');
        params.push(doorData.department_id);
    }

    if (doorData.is_locked !== undefined) {
        updateFields.push('is_locked = ?');
        params.push(doorData.is_locked);
    }

    if (doorData.is_active !== undefined) {
        updateFields.push('is_active = ?');
        params.push(doorData.is_active);
    }

    if (updateFields.length === 0) {
        return await findDoorById(doorId);
    }

    params.push(doorId);

    const sql = `UPDATE doors SET ${updateFields.join(', ')} WHERE id = ?`;

    await executeQuery(sql, params);
    return await findDoorById(doorId);
}

// khóa cửa khẩn cấp (QUAN TRỌNG - có MQTT event)
async function lockDoor(doorId) {
    const sql = 'UPDATE doors SET is_locked = TRUE WHERE id = ?';
    await executeQuery(sql, [doorId]);
    return await findDoorById(doorId);
}

// mở khóa cửa (QUAN TRỌNG - có MQTT event)
async function unlockDoor(doorId) {
    const sql = 'UPDATE doors SET is_locked = FALSE WHERE id = ?';
    await executeQuery(sql, [doorId]);
    return await findDoorById(doorId);
}

// xóa cửa (soft delete - set is_active = FALSE)
async function deleteDoor(doorId) {
    const sql = 'UPDATE doors SET is_active = FALSE WHERE id = ?';
    const result = await executeQuery(sql, [doorId]);
    return result.affectedRows > 0;
}

// xóa cửa vĩnh viễn (hard delete - cẩn thận!)
async function permanentDeleteDoor(doorId) {
    const sql = 'DELETE FROM doors WHERE id = ?';
    const result = await executeQuery(sql, [doorId]);
    return result.affectedRows > 0;
}

module.exports = {
    findDoorById,
    getAllDoors,
    getDoorsByAccessLevel,
    getDoorsByDepartment,
    createDoor,
    updateDoor,
    lockDoor,
    unlockDoor,
    deleteDoor,
    permanentDeleteDoor
};
