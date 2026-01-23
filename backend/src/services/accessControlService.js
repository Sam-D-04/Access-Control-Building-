const { findPermissionById, hasAccessToDoor, checkTimeRestrictions } = require('../models/Permission');

async function checkAccessPermission(card, door, user) {
    // 1. Kiểm tra cơ bản về thẻ
    if (!card.is_active) {
        return { granted: false, reason: 'Thẻ đã bị vô hiệu hóa' };
    }

    if (card.expired_at) {
        const now = new Date();
        const expiredDate = new Date(card.expired_at);
        if (now > expiredDate) {
            return { granted: false, reason: 'Thẻ đã hết hạn' };
        }
    }

    // 2. Kiểm tra user
    if (!user.is_active) {
        return { granted: false, reason: 'Tài khoản đã bị vô hiệu hóa' };
    }

    // 3. Kiểm tra cửa
    if (door.is_locked) {
        return { granted: false, reason: 'Cửa đang bị khóa khẩn cấp' };
    }

    if (!door.is_active) {
        return { granted: false, reason: 'Cửa không hoạt động' };
    }

    // 4. Admin và Security luôn được vào (bypass permission check)
    if (user.role === 'admin' || user.role === 'security') {
        return { granted: true, reason: null };
    }

    // 5. Kiểm tra permission của CARD (KHÔNG PHẢI USER)
    if (!card.permission_id) {
        return {
            granted: false,
            reason: 'Thẻ chưa được gán quyền truy cập'
        };
    }

    try {
        // Lấy thông tin permission từ CARD
        const permission = await findPermissionById(card.permission_id);

        if (!permission) {
            return {
                granted: false,
                reason: 'Permission không tồn tại'
            };
        }

        if (!permission.is_active) {
            return {
                granted: false,
                reason: 'Permission đã bị vô hiệu hóa'
            };
        }

        // 6. Kiểm tra time restrictions
        const timeCheck = checkTimeRestrictions(permission, new Date());
        if (!timeCheck.allowed) {
            return {
                granted: false,
                reason: timeCheck.reason
            };
        }

        // 7. Kiểm tra quyền truy cập cửa (dùng permission_doors)
        const hasDoorAccess = await hasAccessToDoor(permission.id, door.id);

        if (!hasDoorAccess) {
            return {
                granted: false,
                reason: 'Không có quyền truy cập cửa này'
            };
        }

        // Tất cả checks đều pass
        return { granted: true, reason: null };

    } catch (error) {
        console.error('Error in checkAccessPermission:', error);
        return {
            granted: false,
            reason: 'Lỗi hệ thống kiểm tra quyền'
        };
    }
}

module.exports = {
    checkAccessPermission
};
