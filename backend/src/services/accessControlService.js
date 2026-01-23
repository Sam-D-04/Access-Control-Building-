const { findPermissionById, hasAccessToDoor, checkTimeRestrictions } = require('../models/Permission');
const { getCardPermissions } = require('../models/CardPermission');

/**
 * Format thời gian hiện tại cho error message
 */
function formatCurrentTime(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const dayNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const dayName = dayNames[date.getDay()];
    return `${hours}:${minutes} - ${dayName}`;
}

/**
 * Kiểm tra 1 permission có cho phép truy cập không
 * Trả về object với granted, reason, permission_name
 */
async function checkSinglePermission(permission, door, accessTime) {
    const permissionName = permission.permission_name || 'Unknown';
    const doorName = door.name || 'Unknown Door';

    // Kiểm tra permission có active không
    if (!permission.is_active) {
        return {
            granted: false,
            reason: `Permission "${permissionName}" đã bị vô hiệu hóa`,
            permission_name: permissionName
        };
    }

    // Kiểm tra valid_from và valid_until
    const now = new Date();
    if (permission.valid_from) {
        const validFrom = new Date(permission.valid_from);
        if (now < validFrom) {
            return {
                granted: false,
                reason: `Permission "${permissionName}" chưa có hiệu lực (Bắt đầu: ${validFrom.toLocaleDateString('vi-VN')})`,
                permission_name: permissionName
            };
        }
    }
    if (permission.valid_until) {
        const validUntil = new Date(permission.valid_until);
        if (now > validUntil) {
            return {
                granted: false,
                reason: `Permission "${permissionName}" đã hết hạn (Hết hạn: ${validUntil.toLocaleDateString('vi-VN')})`,
                permission_name: permissionName
            };
        }
    }

    // Kiểm tra time restrictions
    const timeCheck = checkTimeRestrictions(permission, accessTime);
    if (!timeCheck.allowed) {
        return {
            granted: false,
            reason: `Permission "${permissionName}": ${timeCheck.reason}. Hiện tại: ${formatCurrentTime(accessTime)}`,
            permission_name: permissionName
        };
    }

    // Kiểm tra quyền truy cập cửa
    const hasDoorAccess = await hasAccessToDoor(permission.permission_id, door.id);
    if (!hasDoorAccess) {
        return {
            granted: false,
            reason: `Permission "${permissionName}" không cho phép truy cập cửa "${doorName}"`,
            permission_name: permissionName
        };
    }

    // Tất cả checks pass
    return {
        granted: true,
        reason: null,
        permission_name: permissionName
    };
}

/**
 * Kiểm tra quyền truy cập của card (hỗ trợ many-to-many permissions)
 * Nếu BẤT KỲ permission nào cho phép → GRANTED
 * Nếu TẤT CẢ đều deny → DENIED với lý do chi tiết
 */
async function checkAccessPermission(card, door, user) {
    const accessTime = new Date();

    // 1. Kiểm tra cơ bản về thẻ
    if (!card.is_active) {
        return {
            granted: false,
            reason: 'Thẻ đã bị vô hiệu hóa',
            details: null
        };
    }

    if (card.expired_at) {
        const expiredDate = new Date(card.expired_at);
        if (accessTime > expiredDate) {
            return {
                granted: false,
                reason: `Thẻ đã hết hạn (${expiredDate.toLocaleDateString('vi-VN')})`,
                details: null
            };
        }
    }

    // 2. Kiểm tra user
    if (!user.is_active) {
        return {
            granted: false,
            reason: 'Tài khoản đã bị vô hiệu hóa',
            details: null
        };
    }

    // 3. Kiểm tra cửa
    if (door.is_locked) {
        return {
            granted: false,
            reason: `Cửa "${door.name}" đang bị khóa khẩn cấp`,
            details: null
        };
    }

    if (!door.is_active) {
        return {
            granted: false,
            reason: `Cửa "${door.name}" không hoạt động`,
            details: null
        };
    }

    // 4. Admin và Security luôn được vào (bypass permission check)
    if (user.role === 'admin' || user.role === 'security') {
        return {
            granted: true,
            reason: null,
            details: { bypass: true, role: user.role }
        };
    }

    try {
        // 5. Lấy TẤT CẢ permissions của card (many-to-many)
        const cardPermissions = await getCardPermissions(card.id);

        if (!cardPermissions || cardPermissions.length === 0) {
            return {
                granted: false,
                reason: 'Thẻ chưa được gán quyền truy cập nào',
                details: null
            };
        }

        // 6. Kiểm tra TỪNG permission
        const checkResults = [];
        for (const permission of cardPermissions) {
            const result = await checkSinglePermission(permission, door, accessTime);
            checkResults.push(result);

            // Nếu BẤT KỲ permission nào GRANTED → cho phép truy cập
            if (result.granted) {
                return {
                    granted: true,
                    reason: null,
                    details: {
                        matched_permission: permission.permission_name,
                        all_checks: checkResults
                    }
                };
            }
        }

        // TẤT CẢ permissions đều DENIED → tổng hợp lý do
        const denialReasons = checkResults.map(r => `• ${r.reason}`).join('\n');
        const summary = `Không có quyền truy cập. Đã kiểm tra ${checkResults.length} permission(s):\n${denialReasons}`;

        return {
            granted: false,
            reason: summary,
            details: {
                checked_permissions: checkResults.length,
                all_checks: checkResults
            }
        };

    } catch (error) {
        console.error('Error in checkAccessPermission:', error);
        return {
            granted: false,
            reason: 'Lỗi hệ thống kiểm tra quyền: ' + error.message,
            details: { error: error.message }
        };
    }
}

module.exports = {
    checkAccessPermission
};
