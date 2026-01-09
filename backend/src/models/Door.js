const { executeQuery, getOneRow } = require('../config/database');

// tìm cửa theo ID
async function findDoorById(doorId) {
    const sql = 'SELECT * FROM doors WHERE id = ?';
    const door = await getOneRow(sql, [doorId]);
    return door;
}

// lấy tất cả cửa
async function getAllDoors() {
    const sql = `
        SELECT
            id,
            name,
            location,
            is_locked,
            is_active,
            created_at
        FROM doors
        WHERE is_active = TRUE
        ORDER BY id ASC
    `;

    const doors = await executeQuery(sql, []);
    return doors;
}

// tạo cửa mới
async function createDoor(doorData) {
    const sql = `
        INSERT INTO doors (
            name,
            location,
            is_locked,
            is_active
        ) VALUES (?, ?, ?, ?)
    `;

    const params = [
        doorData.name,
        doorData.location || null,
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
    createDoor,
    updateDoor,
    lockDoor,
    unlockDoor,
    deleteDoor,
    permanentDeleteDoor
};
