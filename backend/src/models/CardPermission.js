const { executeQuery, getOneRow } = require('../config/database');

// Lấy tất cả permissions của một card
async function getCardPermissions(cardId) {
    const sql = `
        SELECT
            cp.id,
            cp.card_id,
            cp.permission_id,
            cp.assigned_at,
            cp.valid_from,
            cp.valid_until,
            cp.is_active,
            cp.notes,
            p.name as permission_name,
            p.description as permission_description,
            p.door_access_mode,
            p.priority,
            p.time_restrictions,
            u.full_name as assigned_by_name
        FROM card_permissions cp
        INNER JOIN permissions p ON cp.permission_id = p.id
        LEFT JOIN users u ON cp.assigned_by = u.id
        WHERE cp.card_id = ? AND cp.is_active = TRUE
        ORDER BY p.priority DESC, cp.assigned_at DESC
    `;
    const permissions = await executeQuery(sql, [cardId]);

    // Parse JSON fields
    return permissions.map(p => {
        if (p.time_restrictions && typeof p.time_restrictions === 'string') {
            p.time_restrictions = JSON.parse(p.time_restrictions);
        }
        return p;
    });
}

// Gán permission cho card
async function assignPermissionToCard(cardId, permissionId, assignedBy = null, options = {}) {
    const { valid_from, valid_until, notes } = options;

    const sql = `
        INSERT INTO card_permissions (card_id, permission_id, assigned_by, valid_from, valid_until, notes)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            is_active = TRUE,
            assigned_by = VALUES(assigned_by),
            valid_from = VALUES(valid_from),
            valid_until = VALUES(valid_until),
            notes = VALUES(notes),
            assigned_at = CURRENT_TIMESTAMP
    `;

    const result = await executeQuery(sql, [
        cardId,
        permissionId,
        assignedBy,
        valid_from || null,
        valid_until || null,
        notes || null
    ]);

    return result.insertId || result.affectedRows > 0;
}

// Xóa một permission khỏi card (soft delete)
async function removePermissionFromCard(cardPermissionId) {
    const sql = 'UPDATE card_permissions SET is_active = FALSE WHERE id = ?';
    const result = await executeQuery(sql, [cardPermissionId]);
    return result.affectedRows > 0;
}

// Xóa tất cả permissions của card (soft delete)
async function removeAllPermissionsFromCard(cardId) {
    const sql = 'UPDATE card_permissions SET is_active = FALSE WHERE card_id = ?';
    const result = await executeQuery(sql, [cardId]);
    return result.affectedRows > 0;
}

// Xóa vĩnh viễn (hard delete)
async function permanentDeleteCardPermission(cardPermissionId) {
    const sql = 'DELETE FROM card_permissions WHERE id = ?';
    const result = await executeQuery(sql, [cardPermissionId]);
    return result.affectedRows > 0;
}

// Kiểm tra card có permission cụ thể không
async function hasPermission(cardId, permissionId) {
    const sql = `
        SELECT 1 FROM card_permissions
        WHERE card_id = ? AND permission_id = ? AND is_active = TRUE
        LIMIT 1
    `;
    const result = await executeQuery(sql, [cardId, permissionId]);
    return result.length > 0;
}

// Lấy tất cả cards có permission cụ thể
async function getCardsByPermission(permissionId) {
    const sql = `
        SELECT
            c.*,
            u.full_name as user_name,
            u.email as user_email,
            d.name as department_name,
            cp.assigned_at,
            cp.valid_from,
            cp.valid_until
        FROM card_permissions cp
        INNER JOIN cards c ON cp.card_id = c.id
        LEFT JOIN users u ON c.user_id = u.id
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE cp.permission_id = ? AND cp.is_active = TRUE
        ORDER BY cp.assigned_at DESC
    `;
    return await executeQuery(sql, [permissionId]);
}

// Lấy chi tiết một card permission assignment
async function getCardPermissionById(cardPermissionId) {
    const sql = `
        SELECT
            cp.*,
            p.name as permission_name,
            p.description as permission_description,
            p.door_access_mode,
            p.priority,
            c.card_uid,
            c.status as card_status,
            u.full_name as assigned_by_name
        FROM card_permissions cp
        INNER JOIN permissions p ON cp.permission_id = p.id
        INNER JOIN cards c ON cp.card_id = c.id
        LEFT JOIN users u ON cp.assigned_by = u.id
        WHERE cp.id = ?
    `;
    const result = await getOneRow(sql, [cardPermissionId]);

    if (result && result.time_restrictions && typeof result.time_restrictions === 'string') {
        result.time_restrictions = JSON.parse(result.time_restrictions);
    }

    return result;
}

// Update card permission (valid dates, notes, etc)
async function updateCardPermission(cardPermissionId, updates) {
    const { valid_from, valid_until, notes, is_active } = updates;

    const sql = `
        UPDATE card_permissions
        SET valid_from = ?, valid_until = ?, notes = ?, is_active = ?
        WHERE id = ?
    `;

    const result = await executeQuery(sql, [
        valid_from !== undefined ? valid_from : null,
        valid_until !== undefined ? valid_until : null,
        notes !== undefined ? notes : null,
        is_active !== undefined ? is_active : true,
        cardPermissionId
    ]);

    return result.affectedRows > 0;
}

module.exports = {
    getCardPermissions,
    assignPermissionToCard,
    removePermissionFromCard,
    removeAllPermissionsFromCard,
    permanentDeleteCardPermission,
    hasPermission,
    getCardsByPermission,
    getCardPermissionById,
    updateCardPermission
};
