const { executeQuery, getOneRow } = require('../config/database');

 // Tìm permission theo ID
async function findPermissionById(permissionId) {
    const sql = `SELECT * FROM permissions WHERE id = ?`;
    
    // Dùng executeQuery thay vì getOneRow
    const results = await executeQuery(sql, [permissionId]);
    const permission = results.length > 0 ? results[0] : null;

    // Parse JSON fields
    if (permission) {
        // ... giữ nguyên logic parse JSON cũ của bạn ...
        permission.allowed_door_ids = permission.allowed_door_ids ? JSON.parse(permission.allowed_door_ids) : [];
        permission.time_restrictions = permission.time_restrictions ? JSON.parse(permission.time_restrictions) : null;
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
    const fields = [];
    const params = [];

    // Chỉ update những field có trong updateData
    if (updateData.name !== undefined) {
        fields.push('name = ?');
        params.push(updateData.name);
    }
    if (updateData.description !== undefined) {
        fields.push('description = ?');
        params.push(updateData.description);
    }
    if (updateData.door_access_mode !== undefined) {
        fields.push('door_access_mode = ?');
        params.push(updateData.door_access_mode);
    }
    if (updateData.allowed_door_ids !== undefined) {
        fields.push('allowed_door_ids = ?');
        params.push(updateData.allowed_door_ids ? JSON.stringify(updateData.allowed_door_ids) : null);
    }
    if (updateData.time_restrictions !== undefined) {
        fields.push('time_restrictions = ?');
        params.push(updateData.time_restrictions ? JSON.stringify(updateData.time_restrictions) : null);
    }
    if (updateData.priority !== undefined) {
        fields.push('priority = ?');
        params.push(updateData.priority);
    }
    if (updateData.is_active !== undefined) {
        fields.push('is_active = ?');
        params.push(updateData.is_active);
    }

    // Luôn update updated_at
    fields.push('updated_at = CURRENT_TIMESTAMP');

    // Nếu không có field nào để update, return false
    if (fields.length === 1) { // Chỉ có updated_at
        return false;
    }

    const sql = `UPDATE permissions SET ${fields.join(', ')} WHERE id = ?`;
    params.push(permissionId);

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
    const fields = [];
    const params = [];

    // Chỉ update những field có trong updateData
    if (updateData.override_doors !== undefined) {
        fields.push('override_doors = ?');
        params.push(updateData.override_doors);
    }
    if (updateData.custom_door_ids !== undefined) {
        fields.push('custom_door_ids = ?');
        params.push(updateData.custom_door_ids ? JSON.stringify(updateData.custom_door_ids) : null);
    }
    if (updateData.override_time !== undefined) {
        fields.push('override_time = ?');
        params.push(updateData.override_time);
    }
    if (updateData.custom_time_restrictions !== undefined) {
        fields.push('custom_time_restrictions = ?');
        params.push(updateData.custom_time_restrictions ? JSON.stringify(updateData.custom_time_restrictions) : null);
    }
    if (updateData.additional_door_ids !== undefined) {
        fields.push('additional_door_ids = ?');
        params.push(updateData.additional_door_ids ? JSON.stringify(updateData.additional_door_ids) : null);
    }
    if (updateData.valid_from !== undefined) {
        fields.push('valid_from = ?');
        params.push(updateData.valid_from);
    }
    if (updateData.valid_until !== undefined) {
        fields.push('valid_until = ?');
        params.push(updateData.valid_until);
    }
    if (updateData.is_active !== undefined) {
        fields.push('is_active = ?');
        params.push(updateData.is_active);
    }

    // Luôn update updated_at
    fields.push('updated_at = CURRENT_TIMESTAMP');

    // Nếu không có field nào để update, return false
    if (fields.length === 1) { // Chỉ có updated_at
        return false;
    }

    const sql = `UPDATE card_permissions SET ${fields.join(', ')} WHERE id = ?`;
    params.push(cardPermissionId);

    const result = await executeQuery(sql, params);
    return result.affectedRows > 0;
}

async function removePermissionFromCard(cardPermissionId) {
    const sql = 'DELETE FROM card_permissions WHERE id = ?';
    const result = await executeQuery(sql, [cardPermissionId]);
    return result.affectedRows > 0;
}
async function deletePermission(permissionId, hardDelete = false) {
    if (hardDelete) {
        // Hard delete - Xóa vĩnh viễn
        // Kiểm tra xem permission có đang được sử dụng không
        const usageCheck = await getOneRow(
            'SELECT COUNT(*) as count FROM card_permissions WHERE permission_id = ?',
            [permissionId]
        );

        if (usageCheck.count > 0) {
            throw new Error(`Không thể xóa permission này vì đang có ${usageCheck.count} thẻ sử dụng`);
        }

        const sql = 'DELETE FROM permissions WHERE id = ?';
        const result = await executeQuery(sql, [permissionId]);
        return result.affectedRows > 0;
    } else {
        // Soft delete - Chỉ vô hiệu hóa
        const sql = 'UPDATE permissions SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
        const result = await executeQuery(sql, [permissionId]);
        return result.affectedRows > 0;
    }
}

async function removeAllCardPermissions(cardId) {
    const sql = `DELETE FROM card_permissions WHERE card_id = ?`;
    const result = await executeQuery(sql, [cardId]);
    return result.affectedRows; // Trả về số lượng đã xóa, không phải boolean
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