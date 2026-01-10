const {
    findPermissionById,
    getAllPermissions,
    createPermission,
    updatePermission,
    deletePermission,
    getCardPermissions,
    assignPermissionToCard,
    updateCardPermission,
    removePermissionFromCard,
    removeAllCardPermissions,
    getCardsByPermission
} = require('../models/Permission');

const { getOneRow, executeQuery } = require('../config/database'); // ← Thêm dòng này

// GET /api/permissions - Lấy danh sách tất cả permission templates
async function getAllPermissionsHandler(req, res, next) {
    try {
        const { active_only } = req.query;

        console.log('Đang lấy danh sách permissions...');

        const permissions = await getAllPermissions(active_only === 'true');

        console.log('Dữ liệu lấy được là: ', permissions);

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

// GET /api/permissions/:id - Lấy chi tiết một permission
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

// POST /api/permissions - Tạo permission template mới (admin only)
async function createPermissionHandler(req, res, next) {
    try {
        const {
            name,
            description,
            door_access_mode,
            allowed_door_ids,
            time_restrictions,
            priority,
            is_active
        } = req.body;

        // Validate required fields
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin bắt buộc: name'
            });
        }

        // Validate door_access_mode
        if (door_access_mode && !['all', 'specific', 'none'].includes(door_access_mode)) {
            return res.status(400).json({
                success: false,
                message: 'door_access_mode phải là: all, specific hoặc none'
            });
        }

        // Validate time_restrictions format nếu có
        if (time_restrictions) {
            if (!time_restrictions.start_time || !time_restrictions.end_time) {
                return res.status(400).json({
                    success: false,
                    message: 'time_restrictions phải có start_time và end_time'
                });
            }
        }

        const permissionData = {
            name,
            description,
            door_access_mode,
            allowed_door_ids,
            time_restrictions,
            priority,
            is_active
        };

        const newPermissionId = await createPermission(permissionData);

        // Lấy permission vừa tạo để trả về
        const newPermission = await findPermissionById(newPermissionId);

        return res.status(201).json({
            success: true,
            message: 'Tạo permission thành công',
            data: newPermission
        });

    } catch (error) {
        console.error('Error in createPermissionHandler:', error);

        // Handle duplicate name error
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: 'Tên permission đã tồn tại'
            });
        }

        next(error);
    }
}

// PUT /api/permissions/:id - Cập nhật permission template
async function updatePermissionHandler(req, res, next) {
    try {
        const permissionId = req.params.id;
        const updateData = req.body;

        // Kiểm tra permission có tồn tại không
        const permission = await findPermissionById(permissionId);
        if (!permission) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy permission'
            });
        }

        // Validate door_access_mode nếu update
        if (updateData.door_access_mode && !['all', 'specific', 'none'].includes(updateData.door_access_mode)) {
            return res.status(400).json({
                success: false,
                message: 'door_access_mode phải là: all, specific hoặc none'
            });
        }

        const updated = await updatePermission(permissionId, updateData);

        if (!updated) {
            return res.status(500).json({
                success: false,
                message: 'Không thể cập nhật permission'
            });
        }

        // Lấy permission sau khi update
        const updatedPermission = await findPermissionById(permissionId);

        return res.json({
            success: true,
            message: 'Cập nhật permission thành công',
            data: updatedPermission
        });

    } catch (error) {
        console.error('Error in updatePermissionHandler:', error);

        // Handle duplicate name error
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: 'Tên permission đã tồn tại'
            });
        }

        next(error);
    }
}

// DELETE /api/permissions/:id - Xóa permission template
async function deletePermissionHandler(req, res, next) {
    try {
        const permissionId = req.params.id;
        const { hard_delete } = req.query;

        // Kiểm tra permission có tồn tại không
        const permission = await findPermissionById(permissionId);
        if (!permission) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy permission'
            });
        }

        // Thực hiện xóa
        const deleted = await deletePermission(permissionId, hard_delete === 'true');

        if (!deleted) {
            return res.status(500).json({
                success: false,
                message: 'Không thể xóa permission'
            });
        }

        return res.json({
            success: true,
            message: hard_delete === 'true' ? 'Đã xóa vĩnh viễn permission' : 'Đã vô hiệu hóa permission'
        });

    } catch (error) {
        console.error('Error in deletePermissionHandler:', error);

        // Bắt lỗi Foreign Key (khi xóa cứng permission đang dùng)
        if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === 'ER_ROW_IS_REFERENCED') {
            return res.status(409).json({
                success: false,
                message: 'Không thể xóa vĩnh viễn: Permission này đang được gán cho thẻ. Hãy gỡ bỏ khỏi các thẻ trước hoặc dùng xóa mềm (Soft Delete).'
            });
        }

        next(error);
    }
}

// ===============================================
// CARD PERMISSION ASSIGNMENT
// ===============================================

// GET /api/cards/:cardId/permissions - Lấy tất cả permissions của một card
async function getCardPermissionsHandler(req, res, next) {
    try {
        const cardId = req.params.cardId;

        const permissions = await getCardPermissions(cardId);

        return res.json({
            success: true,
            data: permissions,
            count: permissions.length
        });

    } catch (error) {
        console.error('Error in getCardPermissionsHandler:', error);
        next(error);
    }
}

// POST /api/cards/:cardId/permissions - Gán permission cho card
async function assignPermissionToCardHandler(req, res, next) {
    try {
        const cardId = req.params.cardId;
        const {
            permission_id,
            override_doors,
            custom_door_ids,
            override_time,
            custom_time_restrictions,
            additional_door_ids,
            valid_from,
            valid_until,
            is_active
        } = req.body;

        // Validate required fields
        if (!permission_id) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin bắt buộc: permission_id'
            });
        }

        // Kiểm tra permission có tồn tại không
        const permission = await findPermissionById(permission_id);
        if (!permission) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy permission'
            });
        }

        const data = {
            card_id: cardId,
            permission_id,
            override_doors,
            custom_door_ids,
            override_time,
            custom_time_restrictions,
            additional_door_ids,
            valid_from,
            valid_until,
            is_active
        };

        const newId = await assignPermissionToCard(data);

        return res.status(201).json({
            success: true,
            message: 'Gán permission cho card thành công',
            data: { id: newId }
        });

    } catch (error) {
        console.error('Error in assignPermissionToCardHandler:', error);

        // Handle duplicate assignment
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: 'Card đã có permission này rồi'
            });
        }

        next(error);
    }
}

// PUT /api/card-permissions/:id - Cập nhật card_permission assignment
async function updateCardPermissionHandler(req, res, next) {
    try {
        const cardPermissionId = req.params.id;
        const updateData = req.body;

        const updated = await updateCardPermission(cardPermissionId, updateData);

        if (!updated) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy card_permission hoặc không thể cập nhật'
            });
        }

        return res.json({
            success: true,
            message: 'Cập nhật card permission thành công'
        });

    } catch (error) {
        console.error('Error in updateCardPermissionHandler:', error);
        next(error);
    }
}

// DELETE /api/card-permissions/:id - Xóa một permission assignment (HARD DELETE)
async function removeCardPermissionHandler(req, res, next) {
    try {
        const cardPermissionId = req.params.id;

        // Kiểm tra card permission có tồn tại không
        const cardPermission = await getOneRow(
            'SELECT * FROM card_permissions WHERE id = ?',
            [cardPermissionId]
        );

        if (!cardPermission) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy card permission'
            });
        }

        // Gọi function từ model để xóa
        const deleted = await removePermissionFromCard(cardPermissionId);

        if (!deleted) {
            return res.status(500).json({
                success: false,
                message: 'Xóa quyền thất bại'
            });
        }

        console.log('Card permission removed:', cardPermissionId, 'by', req.user.full_name);

        return res.json({
            success: true,
            message: 'Đã xóa quyền thành công'
        });

    } catch (error) {
        console.error('Error in removeCardPermissionHandler:', error);
        next(error);
    }
}

// DELETE /api/cards/:cardId/permissions - Xóa tất cả permissions của card (HARD DELETE)
async function removeAllCardPermissionsHandler(req, res, next) {
    try {
        const cardId = req.params.cardId;

        // Kiểm tra card có tồn tại không
        const card = await getOneRow('SELECT * FROM cards WHERE id = ?', [cardId]);
        if (!card) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy card'
            });
        }

        // Gọi function từ model để xóa tất cả
        const count = await removeAllCardPermissions(cardId);

        console.log('All card permissions removed for card:', cardId, 'Count:', count, 'by', req.user.full_name);

        return res.json({
            success: true,
            message: `Đã xóa ${count} quyền thành công`,
            count: count
        });

    } catch (error) {
        console.error('Error in removeAllCardPermissionsHandler:', error);
        next(error);
    }
}


// DELETE /api/card-permissions/:id - Xóa một permission assignment khỏi card
async function removePermissionFromCardHandler(req, res, next) {
    try {
        const cardPermissionId = req.params.id;

        // Gọi hàm Model để xóa (hàm này bạn đã thêm ở bước trước)
        const deleted = await removePermissionFromCard(cardPermissionId);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy card_permission hoặc đã bị xóa'
            });
        }

        return res.json({
            success: true,
            message: 'Xóa permission khỏi card thành công'
        });

    } catch (error) {
        console.error('Error in removePermissionFromCardHandler:', error);
        next(error);
    }
}

// GET /api/permissions/:id/cards - Lấy danh sách cards có permission này
async function getCardsByPermissionHandler(req, res, next) {
    try {
        const permissionId = req.params.id;

        // Kiểm tra permission có tồn tại không
        const permission = await findPermissionById(permissionId);
        if (!permission) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy permission'
            });
        }

        const cards = await getCardsByPermission(permissionId);

        return res.json({
            success: true,
            data: cards,
            count: cards.length
        });

    } catch (error) {
        console.error('Error in getCardsByPermissionHandler:', error);
        next(error);
    }
}

module.exports = {
    // Permission templates CRUD
    getAllPermissionsHandler,
    getPermissionByIdHandler,
    createPermissionHandler,
    updatePermissionHandler,
    deletePermissionHandler,

    // Card permission assignments
    getCardPermissionsHandler,
    assignPermissionToCardHandler,
    updateCardPermissionHandler,
    removeCardPermissionHandler,        
    removeAllCardPermissionsHandler,    
    removePermissionFromCardHandler,
    // Query
    getCardsByPermissionHandler
};
