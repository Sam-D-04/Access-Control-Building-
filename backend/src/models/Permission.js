const { executeQuery, getOneRow } = require('../config/database');

 // Tìm permission theo ID
async function findPermissionById(permissionId) {
    const sql = `
        SELECT * FROM permissions
        WHERE id = ?
    `;
    const permission = await getOneRow(sql, [permissionId]);

    // Parse JSON fields an toàn
    if (permission) {
        permission.allowed_door_ids = safeJsonParse(permission.allowed_door_ids, []);
        permission.time_restrictions = safeJsonParse(permission.time_restrictions, null);
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

    // Parse JSON fields cho tất cả records với Try-Catch
    return results.map(permission => {
        permission.allowed_door_ids = safeJsonParse(permission.allowed_door_ids, []);
        permission.time_restrictions = safeJsonParse(permission.time_restrictions, null);
        return permission;
    });
}

// Hàm phụ trợ để parse JSON an toàn
function safeJsonParse(jsonString, fallbackValue) {
    if (!jsonString) return fallbackValue;
    // Nếu nó đã là object/array (do driver DB tự parse), trả về luôn
    if (typeof jsonString === 'object') return jsonString; 
    
    try {
        return JSON.parse(jsonString);
    } catch (e) {
        console.warn('JSON parse error:', e.message, 'Value:', jsonString);
        // Fallback: Nếu chuỗi dạng "1,2,3" thì thử split
        if (typeof jsonString === 'string' && jsonString.includes(',')) {
            return jsonString.split(',').map(item => item.trim()); // Chuyển "1,2" thành ["1", "2"]
        }
        return fallbackValue;
    }
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



// ===============================================
// CARD_PERMISSIONS TABLE 
// ===============================================

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

    // Parse JSON fields an toàn
    return results.map(row => {
        row.custom_door_ids = safeJsonParse(row.custom_door_ids, null);
        row.additional_door_ids = safeJsonParse(row.additional_door_ids, null);
        row.custom_time_restrictions = safeJsonParse(row.custom_time_restrictions, null);
        row.base_allowed_door_ids = safeJsonParse(row.base_allowed_door_ids, null);
        row.base_time_restrictions = safeJsonParse(row.base_time_restrictions, null);
        return row;
    });
}

// ... (Giữ nguyên các hàm assignPermissionToCard, updateCardPermission, remove... không đổi)
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

async function removePermissionFromCard(cardPermissionId) {
    const sql = 'DELETE FROM card_permissions WHERE id = ?';
    const result = await executeQuery(sql, [cardPermissionId]);
    return result.affectedRows > 0;
}
async function deletePermission(permissionId) {
    // Kiểm tra xem permission có đang được sử dụng không
    const usageCheck = await getOneRow(
        'SELECT COUNT(*) as count FROM card_permissions WHERE permission_id = ?',
        [permissionId]
    );

    if (usageCheck.count > 0) {
        throw new Error(`Không thể xóa permission này vì đang có ${usageCheck.count} thẻ sử dụng`);
    }

    // Hard delete nếu không có ai dùng
    const sql = 'DELETE FROM permissions WHERE id = ?';
    const result = await executeQuery(sql, [permissionId]);
    return result.affectedRows > 0;
}

async function removeAllCardPermissions(cardId) {
    const sql = `DELETE FROM card_permissions WHERE card_id = ?`;
    const result = await executeQuery(sql, [cardId]);
    return result.affectedRows > 0;
}

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