const { executeQuery, getOneRow } = require('../config/database');


 // Tìm permission theo ID
async function findPermissionById(permissionId) {
    const sql = `
        SELECT * FROM permissions
        WHERE id = ?
    `;
    const permission = await getOneRow(sql, [permissionId]);

    // Parse JSON fields
    if (permission) {
        if (permission.allowed_door_ids) {
            permission.allowed_door_ids = JSON.parse(permission.allowed_door_ids);
        }
        if (permission.time_restrictions) {
            permission.time_restrictions = JSON.parse(permission.time_restrictions);
        }
    }

    return permission;
}


 //Lấy tất cả permissions (có thể filter theo is_active)

async function getAllPermissions(activeOnly = false) {
    let sql = `SELECT * FROM permissions`;

    if (activeOnly) {
        sql += ` WHERE is_active = TRUE`;
    }

    sql += ` ORDER BY priority DESC, name ASC`;

    const results = await executeQuery(sql);

    // Parse JSON fields cho tất cả records
    return results.map(permission => {
        if (permission.allowed_door_ids) {
            permission.allowed_door_ids = JSON.parse(permission.allowed_door_ids);
        }
        if (permission.time_restrictions) {
            permission.time_restrictions = JSON.parse(permission.time_restrictions);
        }
        return permission;
    });
}

 //Tạo permission mới
async function createPermission(permissionData) {
    const {
        name,
        description,
        door_access_mode = 'specific',
        allowed_door_ids = null,
        time_restrictions = null,
        priority = 0,
        is_active = true
    } = permissionData;

    const sql = `
        INSERT INTO permissions
        (name, description, door_access_mode, allowed_door_ids, time_restrictions, priority, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
        name,
        description,
        door_access_mode,
        allowed_door_ids ? JSON.stringify(allowed_door_ids) : null,
        time_restrictions ? JSON.stringify(time_restrictions) : null,
        priority,
        is_active
    ];

    const result = await executeQuery(sql, params);
    return result.insertId;
}


// Cập nhật permission

async function updatePermission(permissionId, updateData) {
    const {
        name,
        description,
        door_access_mode,
        allowed_door_ids,
        time_restrictions,
        priority,
        is_active
    } = updateData;

    const sql = `
        UPDATE permissions
        SET
            name = COALESCE(?, name),
            description = COALESCE(?, description),
            door_access_mode = COALESCE(?, door_access_mode),
            allowed_door_ids = COALESCE(?, allowed_door_ids),
            time_restrictions = COALESCE(?, time_restrictions),
            priority = COALESCE(?, priority),
            is_active = COALESCE(?, is_active),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `;

    const params = [
        name || null,
        description || null,
        door_access_mode || null,
        allowed_door_ids ? JSON.stringify(allowed_door_ids) : null,
        time_restrictions ? JSON.stringify(time_restrictions) : null,
        priority !== undefined ? priority : null,
        is_active !== undefined ? is_active : null,
        permissionId
    ];

    const result = await executeQuery(sql, params);
    return result.affectedRows > 0;
}

/**
 * Xóa permission (soft delete hoặc hard delete)
 * @param {number} permissionId
 * @param {boolean} hardDelete - true = xóa hẳn, false = set is_active = false
 * @returns {Promise<boolean>}
 */
async function deletePermission(permissionId, hardDelete = false) {
    let sql;

    if (hardDelete) {
        sql = `DELETE FROM permissions WHERE id = ?`;
    } else {
        sql = `UPDATE permissions SET is_active = FALSE WHERE id = ?`;
    }

    const result = await executeQuery(sql, [permissionId]);
    return result.affectedRows > 0;
}

// ===============================================
// CARD_PERMISSIONS TABLE - Gán permissions cho cards
// ===============================================

/**
 * Lấy tất cả permissions của một card
 * @param {number} cardId
 * @returns {Promise<Array>}
 */
async function getCardPermissions(cardId) {
    const sql = `
        SELECT
            cp.*,
            p.name as permission_name,
            p.description as permission_description,
            p.door_access_mode,
            p.allowed_door_ids as base_allowed_door_ids,
            p.time_restrictions as base_time_restrictions,
            p.priority
        FROM card_permissions cp
        JOIN permissions p ON p.id = cp.permission_id
        WHERE cp.card_id = ? AND cp.is_active = TRUE AND p.is_active = TRUE
        ORDER BY p.priority DESC
    `;

    const results = await executeQuery(sql, [cardId]);

    // Parse JSON fields
    return results.map(row => {
        if (row.custom_door_ids) row.custom_door_ids = JSON.parse(row.custom_door_ids);
        if (row.additional_door_ids) row.additional_door_ids = JSON.parse(row.additional_door_ids);
        if (row.custom_time_restrictions) row.custom_time_restrictions = JSON.parse(row.custom_time_restrictions);
        if (row.base_allowed_door_ids) row.base_allowed_door_ids = JSON.parse(row.base_allowed_door_ids);
        if (row.base_time_restrictions) row.base_time_restrictions = JSON.parse(row.base_time_restrictions);
        return row;
    });
}

/**
 * Gán permission cho card
 * @param {Object} data
 * @returns {Promise<number>} - ID của card_permission vừa tạo
 */
async function assignPermissionToCard(data) {
    const {
        card_id,
        permission_id,
        override_doors = false,
        custom_door_ids = null,
        override_time = false,
        custom_time_restrictions = null,
        additional_door_ids = null,
        valid_from = null,
        valid_until = null,
        is_active = true
    } = data;

    const sql = `
        INSERT INTO card_permissions
        (card_id, permission_id, override_doors, custom_door_ids, override_time,
         custom_time_restrictions, additional_door_ids, valid_from, valid_until, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
        card_id,
        permission_id,
        override_doors,
        custom_door_ids ? JSON.stringify(custom_door_ids) : null,
        override_time,
        custom_time_restrictions ? JSON.stringify(custom_time_restrictions) : null,
        additional_door_ids ? JSON.stringify(additional_door_ids) : null,
        valid_from,
        valid_until,
        is_active
    ];

    const result = await executeQuery(sql, params);
    return result.insertId;
}

/**
 * Cập nhật card_permission
 * @param {number} cardPermissionId
 * @param {Object} updateData
 * @returns {Promise<boolean>}
 */
async function updateCardPermission(cardPermissionId, updateData) {
    const {
        override_doors,
        custom_door_ids,
        override_time,
        custom_time_restrictions,
        additional_door_ids,
        valid_from,
        valid_until,
        is_active
    } = updateData;

    const sql = `
        UPDATE card_permissions
        SET
            override_doors = COALESCE(?, override_doors),
            custom_door_ids = COALESCE(?, custom_door_ids),
            override_time = COALESCE(?, override_time),
            custom_time_restrictions = COALESCE(?, custom_time_restrictions),
            additional_door_ids = COALESCE(?, additional_door_ids),
            valid_from = COALESCE(?, valid_from),
            valid_until = COALESCE(?, valid_until),
            is_active = COALESCE(?, is_active),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `;

    const params = [
        override_doors !== undefined ? override_doors : null,
        custom_door_ids ? JSON.stringify(custom_door_ids) : null,
        override_time !== undefined ? override_time : null,
        custom_time_restrictions ? JSON.stringify(custom_time_restrictions) : null,
        additional_door_ids ? JSON.stringify(additional_door_ids) : null,
        valid_from || null,
        valid_until || null,
        is_active !== undefined ? is_active : null,
        cardPermissionId
    ];

    const result = await executeQuery(sql, params);
    return result.affectedRows > 0;
}

/**
 * Xóa permission khỏi card
 * @param {number} cardPermissionId
 * @returns {Promise<boolean>}
 */
async function removePermissionFromCard(cardPermissionId) {
    const sql = `DELETE FROM card_permissions WHERE id = ?`;
    const result = await executeQuery(sql, [cardPermissionId]);
    return result.affectedRows > 0;
}

/**
 * Xóa tất cả permissions của một card
 * @param {number} cardId
 * @returns {Promise<boolean>}
 */
async function removeAllCardPermissions(cardId) {
    const sql = `DELETE FROM card_permissions WHERE card_id = ?`;
    const result = await executeQuery(sql, [cardId]);
    return result.affectedRows > 0;
}

/**
 * Lấy danh sách cards có một permission cụ thể
 * @param {number} permissionId
 * @returns {Promise<Array>}
 */
async function getCardsByPermission(permissionId) {
    const sql = `
        SELECT
            c.*,
            u.full_name,
            u.email,
            u.employee_id,
            cp.is_active as assignment_active,
            cp.valid_from,
            cp.valid_until
        FROM card_permissions cp
        JOIN cards c ON c.id = cp.card_id
        LEFT JOIN users u ON u.id = c.user_id
        WHERE cp.permission_id = ? AND cp.is_active = TRUE
        ORDER BY u.full_name
    `;

    return executeQuery(sql, [permissionId]);
}


module.exports = {
    // Permissions
    findPermissionById,
    getAllPermissions,
    createPermission,
    updatePermission,
    deletePermission,

    // Card Permissions
    getCardPermissions,
    assignPermissionToCard,
    updateCardPermission,
    removePermissionFromCard,
    removeAllCardPermissions,
    getCardsByPermission
};