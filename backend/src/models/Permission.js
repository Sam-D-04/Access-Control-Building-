const { executeQuery, getOneRow } = require('../config/database');

// Lấy tất cả permissions
async function getAllPermissions() {
    const sql = `
        SELECT * FROM permissions 
        WHERE is_active = 1
        ORDER BY priority DESC
    `;
    const permissions = await executeQuery(sql, []);
    
    // Parse JSON cho mỗi permission
    return permissions.map(p => {
        if (p.time_restrictions) {
            p.time_restrictions = JSON.parse(p.time_restrictions);
        }
        return p;
    });
}

// Tìm permission theo ID (kèm danh sách doors)
async function findPermissionById(permissionId) {
    const sql = 'SELECT * FROM permissions WHERE id = ?';
    const permission = await getOneRow(sql, [permissionId]);
    
    if (!permission) {
        return null;
    }
    
    // Parse JSON time_restrictions
    if (permission.time_restrictions) {
        permission.time_restrictions = JSON.parse(permission.time_restrictions);
    }
    
    // Lấy danh sách doors (nếu mode = 'specific')
    if (permission.door_access_mode === 'specific') {
        const doorsSql = `
            SELECT d.id, d.name, d.location
            FROM doors d
            INNER JOIN permission_doors pd ON d.id = pd.door_id
            WHERE pd.permission_id = ?
            ORDER BY d.name
        `;
        const doors = await executeQuery(doorsSql, [permissionId]);
        
        permission.doors = doors;
        permission.door_ids = doors.map(d => d.id);
    } else {
        permission.doors = [];
        permission.door_ids = [];
    }
    
    return permission;
}

// Tạo permission mới
async function createPermission(permissionData) {
    const { name, description, door_access_mode, time_restrictions, priority, door_ids } = permissionData;
    
    // Begin transaction
    await executeQuery('START TRANSACTION', []);
    
    try {
        // Insert permission
        const sql = `
            INSERT INTO permissions (name, description, door_access_mode, time_restrictions, priority)
            VALUES (?, ?, ?, ?, ?)
        `;
        
        const params = [
            name,
            description || null,
            door_access_mode || 'specific',
            time_restrictions ? JSON.stringify(time_restrictions) : null,
            priority || 0
        ];
        
        const result = await executeQuery(sql, params);
        const permissionId = result.insertId;
        
        // Nếu mode = 'specific', insert vào permission_doors
        if (door_access_mode === 'specific' && door_ids && door_ids.length > 0) {
            const doorSql = 'INSERT INTO permission_doors (permission_id, door_id) VALUES ?';
            const values = door_ids.map(doorId => [permissionId, doorId]);
            await executeQuery(doorSql, [values]);
        }
        
        await executeQuery('COMMIT', []);
        return await findPermissionById(permissionId);
        
    } catch (error) {
        await executeQuery('ROLLBACK', []);
        throw error;
    }
}

// Cập nhật permission
async function updatePermission(permissionId, permissionData) {
    const { name, description, door_access_mode, time_restrictions, priority, is_active, door_ids } = permissionData;
    
    await executeQuery('START TRANSACTION', []);
    
    try {
        // Update permission
        const sql = `
            UPDATE permissions
            SET name = ?, 
                description = ?,
                door_access_mode = ?,
                time_restrictions = ?,
                priority = ?,
                is_active = ?
            WHERE id = ?
        `;
        
        const params = [
            name,
            description || null,
            door_access_mode || 'specific',
            time_restrictions ? JSON.stringify(time_restrictions) : null,
            priority || 0,
            is_active !== undefined ? is_active : 1,
            permissionId
        ];
        
        await executeQuery(sql, params);
        
        // Nếu mode = 'specific', cập nhật permission_doors
        if (door_access_mode === 'specific') {
            // Xóa tất cả liên kết cũ
            await executeQuery('DELETE FROM permission_doors WHERE permission_id = ?', [permissionId]);
            
            // Thêm liên kết mới
            if (door_ids && door_ids.length > 0) {
                const doorSql = 'INSERT INTO permission_doors (permission_id, door_id) VALUES ?';
                const values = door_ids.map(doorId => [permissionId, doorId]);
                await executeQuery(doorSql, [values]);
            }
        } else {
            // Nếu mode không phải 'specific', xóa tất cả liên kết
            await executeQuery('DELETE FROM permission_doors WHERE permission_id = ?', [permissionId]);
        }
        
        await executeQuery('COMMIT', []);
        return await findPermissionById(permissionId);
        
    } catch (error) {
        await executeQuery('ROLLBACK', []);
        throw error;
    }
}

// Xóa permission (soft delete)
async function deletePermission(permissionId) {
    const sql = 'UPDATE permissions SET is_active = 0 WHERE id = ?';
    const result = await executeQuery(sql, [permissionId]);
    return result.affectedRows > 0;
}

// Xóa permission vĩnh viễn (hard delete - CASCADE sẽ tự động xóa permission_doors)
async function permanentDeletePermission(permissionId) {
    const sql = 'DELETE FROM permissions WHERE id = ?';
    const result = await executeQuery(sql, [permissionId]);
    return result.affectedRows > 0;
}

// Thêm door vào permission
async function addDoorToPermission(permissionId, doorId) {
    const sql = `
        INSERT IGNORE INTO permission_doors (permission_id, door_id)
        VALUES (?, ?)
    `;
    await executeQuery(sql, [permissionId, doorId]);
    return true;
}

// Xóa door khỏi permission
async function removeDoorFromPermission(permissionId, doorId) {
    const sql = `
        DELETE FROM permission_doors
        WHERE permission_id = ? AND door_id = ?
    `;
    const result = await executeQuery(sql, [permissionId, doorId]);
    return result.affectedRows > 0;
}

// Lấy danh sách doors được phép cho permission
async function getAllowedDoors(permissionId) {
    const permissionSql = 'SELECT door_access_mode FROM permissions WHERE id = ?';
    const permission = await getOneRow(permissionSql, [permissionId]);
    
    if (!permission) {
        return [];
    }
    
    const { door_access_mode } = permission;
    
    // Nếu mode = 'all', trả về tất cả doors
    if (door_access_mode === 'all') {
        const sql = 'SELECT * FROM doors WHERE is_active = 1';
        return await executeQuery(sql, []);
    }
    
    // Nếu mode = 'none', trả về mảng rỗng
    if (door_access_mode === 'none') {
        return [];
    }
    
    // Nếu mode = 'specific', JOIN với permission_doors
    const sql = `
        SELECT d.*
        FROM doors d
        INNER JOIN permission_doors pd ON d.id = pd.door_id
        WHERE pd.permission_id = ? AND d.is_active = 1
    `;
    return await executeQuery(sql, [permissionId]);
}

// Kiểm tra permission có quyền vào door không
async function hasAccessToDoor(permissionId, doorId) {
    const sql = 'SELECT door_access_mode FROM permissions WHERE id = ? AND is_active = 1';
    const permission = await getOneRow(sql, [permissionId]);
    
    if (!permission) {
        return false;
    }
    
    const { door_access_mode } = permission;
    
    // Nếu mode = 'all', có quyền vào tất cả
    if (door_access_mode === 'all') {
        return true;
    }
    
    // Nếu mode = 'none', không có quyền
    if (door_access_mode === 'none') {
        return false;
    }
    
    // Nếu mode = 'specific', kiểm tra trong permission_doors
    const checkSql = `
        SELECT 1 FROM permission_doors
        WHERE permission_id = ? AND door_id = ?
        LIMIT 1
    `;
    const rows = await executeQuery(checkSql, [permissionId, doorId]);
    return rows.length > 0;
}

// Kiểm tra time restrictions
function checkTimeRestrictions(permission, accessTime = new Date()) {
    if (!permission.time_restrictions) {
        return { allowed: true };
    }
    
    const restrictions = typeof permission.time_restrictions === 'string'
        ? JSON.parse(permission.time_restrictions)
        : permission.time_restrictions;
    
    const { start_time, end_time, allowed_days } = restrictions;
    
    // Kiểm tra ngày trong tuần (1=Monday, 7=Sunday)
    const dayOfWeek = accessTime.getDay() || 7; // 0=Sunday -> 7
    if (allowed_days && !allowed_days.includes(dayOfWeek)) {
        return {
            allowed: false,
            reason: `Không được phép truy cập vào ngày ${['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][accessTime.getDay()]}`
        };
    }
    
    // Kiểm tra giờ
    if (start_time && end_time) {
        const currentTime = accessTime.getHours() * 60 + accessTime.getMinutes();
        const [startHour, startMin] = start_time.split(':').map(Number);
        const [endHour, endMin] = end_time.split(':').map(Number);
        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;
        
        // Xử lý trường hợp qua nửa đêm (ví dụ: 18:00 - 06:00)
        if (startMinutes > endMinutes) {
            if (currentTime < startMinutes && currentTime > endMinutes) {
                return {
                    allowed: false,
                    reason: `Ngoài giờ cho phép truy cập (${start_time} - ${end_time})`
                };
            }
        } else {
            if (currentTime < startMinutes || currentTime > endMinutes) {
                return {
                    allowed: false,
                    reason: `Ngoài giờ cho phép truy cập (${start_time} - ${end_time})`
                };
            }
        }
    }
    
    return { allowed: true };
}

module.exports = {
    getAllPermissions,
    findPermissionById,
    createPermission,
    updatePermission,
    deletePermission,
    permanentDeletePermission,
    addDoorToPermission,
    removeDoorFromPermission,
    getAllowedDoors,
    hasAccessToDoor,
    checkTimeRestrictions
};
