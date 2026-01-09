const { getCardPermissions } = require('../models/Permission');

/**
 * Kiểm tra quyền truy cập dựa trên PERMISSION SYSTEM
 */
async function checkAccessPermission(card, door, user) {
    // 1. Kiểm tra cơ bản
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

    if (!user.is_active) {
        return { granted: false, reason: 'Tài khoản đã bị vô hiệu hóa' };
    }

    if (door.is_locked) {
        return { granted: false, reason: 'Cửa đang bị khóa khẩn cấp' };
    }

    // Admin và Security luôn được vào
    if (user.role === 'admin' || user.role === 'security') {
        return { granted: true, reason: null };
    }

    // 2. KIỂM TRA PERMISSIONS (MỚI)
    try {
        const cardPermissions = await getCardPermissions(card.id);

        if (!cardPermissions || cardPermissions.length === 0) {
            return {
                granted: false,
                reason: 'Thẻ chưa được gán quyền truy cập'
            };
        }

        // Kiểm tra từng permission (theo priority từ cao xuống thấp)
        for (const cp of cardPermissions) {
            // Check thời hạn hiệu lực
            if (!isPermissionAssignmentValid(cp)) {
                continue;
            }

            // Check giới hạn thời gian
            const timeCheck = checkTimeRestrictions(cp);
            if (!timeCheck.allowed) {
                continue;
            }

            // Check quyền truy cập cửa
            const doorCheck = checkDoorAccess(cp, door);
            if (doorCheck.granted) {
                return { granted: true, reason: null };
            }
        }

        return {
            granted: false,
            reason: 'Không có quyền truy cập cửa này'
        };

    } catch (error) {
        console.error('Error checking card permissions:', error);
        // Fallback: Từ chối nếu lỗi
        return {
            granted: false,
            reason: 'Lỗi hệ thống phân quyền'
        };
    }
}

function isPermissionAssignmentValid(cardPermission) {
    const now = new Date();

    if (cardPermission.valid_from) {
        const validFrom = new Date(cardPermission.valid_from);
        if (now < validFrom) return false;
    }

    if (cardPermission.valid_until) {
        const validUntil = new Date(cardPermission.valid_until);
        if (now > validUntil) return false;
    }

    return true;
}

function checkTimeRestrictions(cardPermission) {
    let timeRestrictions;

    if (cardPermission.override_time && cardPermission.custom_time_restrictions) {
        timeRestrictions = cardPermission.custom_time_restrictions;
    } else if (cardPermission.base_time_restrictions) {
        timeRestrictions = cardPermission.base_time_restrictions;
    } else {
        return { allowed: true };
    }

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDay = now.getDay();

    // Check ngày trong tuần
    if (timeRestrictions.allowed_days && Array.isArray(timeRestrictions.allowed_days)) {
        if (!timeRestrictions.allowed_days.includes(currentDay)) {
            return { allowed: false, reason: 'Ngoài ngày cho phép truy cập' };
        }
    }

    // Check giờ
    if (timeRestrictions.start_time && timeRestrictions.end_time) {
        const [startHour, startMinute] = timeRestrictions.start_time.split(':').map(Number);
        const [endHour, endMinute] = timeRestrictions.end_time.split(':').map(Number);

        const currentTimeInMinutes = currentHour * 60 + currentMinute;
        const startTimeInMinutes = startHour * 60 + startMinute;
        const endTimeInMinutes = endHour * 60 + endMinute;

        if (currentTimeInMinutes < startTimeInMinutes || currentTimeInMinutes > endTimeInMinutes) {
            return {
                allowed: false,
                reason: `Ngoài giờ cho phép (${timeRestrictions.start_time} - ${timeRestrictions.end_time})`
            };
        }
    }

    return { allowed: true };
}

function checkDoorAccess(cardPermission, door) {
    let allowedDoorIds = [];
    let doorAccessMode = cardPermission.door_access_mode;

    // Override doors
    if (cardPermission.override_doors && cardPermission.custom_door_ids) {
        allowedDoorIds = cardPermission.custom_door_ids;
        doorAccessMode = 'specific';
    } else {
        if (doorAccessMode === 'all') {
            allowedDoorIds = null;
        } else if (doorAccessMode === 'specific' && cardPermission.base_allowed_door_ids) {
            allowedDoorIds = cardPermission.base_allowed_door_ids;
        } else if (doorAccessMode === 'none') {
            return { granted: false };
        }
    }

    // Thêm additional doors
    if (cardPermission.additional_door_ids && Array.isArray(cardPermission.additional_door_ids)) {
        if (allowedDoorIds !== null && Array.isArray(allowedDoorIds)) {
            allowedDoorIds = [...allowedDoorIds, ...cardPermission.additional_door_ids];
            allowedDoorIds = [...new Set(allowedDoorIds)];
        } else if (allowedDoorIds === null) {
            // Already 'all'
        } else {
            allowedDoorIds = cardPermission.additional_door_ids;
        }
    }

    // Check door
    if (allowedDoorIds === null) {
        return { granted: true };
    } else if (Array.isArray(allowedDoorIds) && allowedDoorIds.includes(door.id)) {
        return { granted: true };
    }

    return { granted: false };
}

module.exports = {
    checkAccessPermission
};
