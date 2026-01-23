const {
    getAllPermissions,
    findPermissionById,
    createPermission,
    updatePermission,
    deletePermission,
    addDoorToPermission,
    removeDoorFromPermission,
    getAllowedDoors
} = require('../models/Permission');

// GET /api/permissions - Lấy danh sách tất cả permissions
async function getAllPermissionsHandler(req, res, next) {
    try {
        const permissions = await getAllPermissions();
        
        // Lấy số lượng doors cho mỗi permission
        for (let permission of permissions) {
            const doors = await getAllowedDoors(permission.id);
            permission.door_count = doors.length;
        }
        
        return res.json({
            success: true,
            data: permissions,
            count: permissions.length
        });
        
    } catch (error) {
        console.error('Error in getAllPermissionsHandler:', error);
        next(error);
    }
}

// GET /api/permissions/:id - Lấy chi tiết permission
async function getPermissionByIdHandler(req, res, next) {
    try {
        const permissionId = req.params.id;
        
        const permission = await findPermissionById(permissionId);
        
        if (!permission) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy permission'
            });
        }
        
        return res.json({
            success: true,
            data: permission
        });
        
    } catch (error) {
        console.error('Error in getPermissionByIdHandler:', error);
        next(error);
    }
}

// POST /api/permissions - Tạo permission mới
async function createPermissionHandler(req, res, next) {
    try {
        const { name, description, door_access_mode, time_restrictions, priority, door_ids } = req.body;
        
        // Validation
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Tên permission là bắt buộc'
            });
        }
        
        if (door_access_mode === 'specific' && (!door_ids || door_ids.length === 0)) {
            return res.status(400).json({
                success: false,
                message: 'Phải chọn ít nhất 1 cửa khi door_access_mode là "specific"'
            });
        }
        
        const permissionData = {
            name,
            description,
            door_access_mode,
            time_restrictions,
            priority,
            door_ids
        };
        
        const newPermission = await createPermission(permissionData);
        
        console.log('Permission created:', newPermission.id, newPermission.name);
        
        return res.status(201).json({
            success: true,
            message: 'Tạo permission thành công',
            data: newPermission
        });
        
    } catch (error) {
        console.error('Error in createPermissionHandler:', error);
        
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'Tên permission đã tồn tại'
            });
        }
        
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(400).json({
                success: false,
                message: 'Door ID không hợp lệ'
            });
        }
        
        next(error);
    }
}

// PUT /api/permissions/:id - Cập nhật permission
async function updatePermissionHandler(req, res, next) {
    try {
        const permissionId = req.params.id;
        const { name, description, door_access_mode, time_restrictions, priority, is_active, door_ids } = req.body;
        
        // Kiểm tra permission có tồn tại không
        const existingPermission = await findPermissionById(permissionId);
        if (!existingPermission) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy permission'
            });
        }
        
        // Validation
        if (door_access_mode === 'specific' && (!door_ids || door_ids.length === 0)) {
            return res.status(400).json({
                success: false,
                message: 'Phải chọn ít nhất 1 cửa khi door_access_mode là "specific"'
            });
        }
        
        const permissionData = {
            name,
            description,
            door_access_mode,
            time_restrictions,
            priority,
            is_active,
            door_ids
        };
        
        const updatedPermission = await updatePermission(permissionId, permissionData);
        
        console.log('Permission updated:', updatedPermission.id, updatedPermission.name);
        
        return res.json({
            success: true,
            message: 'Cập nhật permission thành công',
            data: updatedPermission
        });
        
    } catch (error) {
        console.error('Error in updatePermissionHandler:', error);
        
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'Tên permission đã tồn tại'
            });
        }
        
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(400).json({
                success: false,
                message: 'Door ID không hợp lệ'
            });
        }
        
        next(error);
    }
}

// DELETE /api/permissions/:id - Xóa permission (soft delete)
async function deletePermissionHandler(req, res, next) {
    try {
        const permissionId = req.params.id;
        
        const existingPermission = await findPermissionById(permissionId);
        if (!existingPermission) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy permission'
            });
        }
        
        const deleted = await deletePermission(permissionId);
        
        if (!deleted) {
            return res.status(500).json({
                success: false,
                message: 'Xóa permission thất bại'
            });
        }
        
        console.log('Permission deleted:', existingPermission.name, 'by', req.user?.full_name || 'system');
        
        return res.json({
            success: true,
            message: 'Đã xóa permission thành công'
        });
        
    } catch (error) {
        console.error('Error in deletePermissionHandler:', error);
        next(error);
    }
}

// POST /api/permissions/:id/doors/:doorId - Thêm door vào permission
async function addDoorHandler(req, res, next) {
    try {
        const { id, doorId } = req.params;
        
        await addDoorToPermission(id, doorId);
        
        console.log('Door', doorId, 'added to permission', id);
        
        return res.json({
            success: true,
            message: 'Thêm door vào permission thành công'
        });
        
    } catch (error) {
        console.error('Error in addDoorHandler:', error);
        
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(400).json({
                success: false,
                message: 'Permission ID hoặc Door ID không hợp lệ'
            });
        }
        
        next(error);
    }
}

// DELETE /api/permissions/:id/doors/:doorId - Xóa door khỏi permission
async function removeDoorHandler(req, res, next) {
    try {
        const { id, doorId } = req.params;
        
        const removed = await removeDoorFromPermission(id, doorId);
        
        if (!removed) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy liên kết permission-door'
            });
        }
        
        console.log('Door', doorId, 'removed from permission', id);
        
        return res.json({
            success: true,
            message: 'Xóa door khỏi permission thành công'
        });
        
    } catch (error) {
        console.error('Error in removeDoorHandler:', error);
        next(error);
    }
}

// GET /api/permissions/:id/doors - Lấy danh sách doors được phép
async function getAllowedDoorsHandler(req, res, next) {
    try {
        const permissionId = req.params.id;
        
        const doors = await getAllowedDoors(permissionId);
        
        return res.json({
            success: true,
            data: doors,
            count: doors.length
        });
        
    } catch (error) {
        console.error('Error in getAllowedDoorsHandler:', error);
        next(error);
    }
}

module.exports = {
    getAllPermissionsHandler,
    getPermissionByIdHandler,
    createPermissionHandler,
    updatePermissionHandler,
    deletePermissionHandler,
    addDoorHandler,
    removeDoorHandler,
    getAllowedDoorsHandler
};
