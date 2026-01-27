const {
    getCardPermissions,
    assignPermissionToCard,
    removePermissionFromCard,
    updateCardPermission
} = require('../models/CardPermission');

const { findCardById } = require('../models/Card');

// GET /api/cards/:cardId/permissions - Lấy tất cả permissions của card
async function getCardPermissionsHandler(req, res, next) {
    try {
        const cardId = req.params.cardId;

        // Kiểm tra card tồn tại
        const card = await findCardById(cardId);
        if (!card) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thẻ'
            });
        }

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

// PUT /api/cards/:cardId/permissions - Gán permission cho card
async function assignPermissionHandler(req, res, next) {
    try {
        const cardId = req.params.cardId;
        const { permission_id, valid_from, valid_until, notes } = req.body;

        // Validate
        if (!permission_id) {
            return res.status(400).json({
                success: false,
                message: 'permission_id là bắt buộc'
            });
        }

        // Kiểm tra card tồn tại
        const card = await findCardById(cardId);
        if (!card) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thẻ'
            });
        }

        // Gán permission
        const assignedBy = req.user?.id || null;
        await assignPermissionToCard(cardId, permission_id, assignedBy, {
            valid_from,
            valid_until,
            notes
        });

        console.log(`Permission ${permission_id} assigned to card ${cardId} by ${req.user?.full_name || 'system'}`);

        // Lấy lại danh sách permissions
        const permissions = await getCardPermissions(cardId);

        return res.json({
            success: true,
            message: 'Gán permission thành công',
            data: permissions
        });

    } catch (error) {
        console.error('Error in assignPermissionHandler:', error);

        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(400).json({
                success: false,
                message: 'Permission ID không hợp lệ'
            });
        }

        next(error);
    }
}

// DELETE /api/cards/:cardId/permissions - Xóa TẤT CẢ permissions của card
async function removeAllPermissionsHandler(req, res, next) {
    try {
        const cardId = req.params.cardId;

        // Kiểm tra card tồn tại
        const card = await findCardById(cardId);
        if (!card) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thẻ'
            });
        }

        const { removeAllPermissionsFromCard } = require('../models/CardPermission');
        await removeAllPermissionsFromCard(cardId);

        console.log(`All permissions removed from card ${cardId} by ${req.user?.full_name || 'system'}`);

        return res.json({
            success: true,
            message: 'Đã xóa tất cả permissions của thẻ'
        });

    } catch (error) {
        console.error('Error in removeAllPermissionsHandler:', error);
        next(error);
    }
}

// DELETE /api/card-permissions/:id - Xóa MỘT permission assignment cụ thể
async function removePermissionHandler(req, res, next) {
    try {
        const cardPermissionId = req.params.id;

        const removed = await removePermissionFromCard(cardPermissionId);

        if (!removed) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy permission assignment'
            });
        }

        console.log(`Card permission ${cardPermissionId} removed by ${req.user?.full_name || 'system'}`);

        return res.json({
            success: true,
            message: 'Đã xóa permission'
        });

    } catch (error) {
        console.error('Error in removePermissionHandler:', error);
        next(error);
    }
}

// PUT /api/card-permissions/:id - Cập nhật card permission assignment
async function updateCardPermissionHandler(req, res, next) {
    try {
        const cardPermissionId = req.params.id;
        const { valid_from, valid_until, notes, is_active } = req.body;

        const updated = await updateCardPermission(cardPermissionId, {
            valid_from,
            valid_until,
            notes,
            is_active
        });

        if (!updated) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy permission assignment'
            });
        }

        console.log(`Card permission ${cardPermissionId} updated by ${req.user?.full_name || 'system'}`);

        return res.json({
            success: true,
            message: 'Cập nhật thành công'
        });

    } catch (error) {
        console.error('Error in updateCardPermissionHandler:', error);
        next(error);
    }
}

module.exports = {
    getCardPermissionsHandler,
    assignPermissionHandler,
    removeAllPermissionsHandler,
    removePermissionHandler,
    updateCardPermissionHandler
};
