/**
 * ACCESS CONTROL SERVICE - PERMISSION-BASED VERSION
 *
 * File này là phiên bản MỚI sử dụng hệ thống permission từ database.
 *
 * HƯỚNG DẪN SỬ DỤNG:
 * 1. Sau khi chạy migration SQL để tạo bảng permissions
 * 2. BACKUP file accessControlService.js cũ
 * 3. THAY THẾ nội dung file accessControlService.js bằng file này
 *
 * LOGIC MỚI:
 * - Card được gán các permissions từ bảng card_permissions
 * - Mỗi permission có thể định nghĩa:
 *   + Cửa nào được phép vào (door_access_mode: all/specific/none)
 *   + Giới hạn thời gian (time_restrictions)
 *   + Độ ưu tiên (priority)
 * - Card có thể override hoặc extend permissions
 * - Admin/Security vẫn có quyền cao nhất (bypass tất cả)
 */

const { getCardPermissions } = require('../models/Permission');

/**
 * Kiểm tra quyền truy cập dựa trên permission system
 * @param {Object} card - Thông tin thẻ
 * @param {Object} door - Thông tin cửa
 * @param {Object} user - Thông tin user
 * @returns {Promise<{granted: boolean, reason: string|null}>}
 */
async function checkAccessPermission(card, door, user) {
    // ============================================
    // 1. KIỂM TRA CƠ BẢN (giống như cũ)
    // ============================================

    // Kiểm tra thẻ có active không
    if (!card.is_active) {
        return {
            granted: false,
            reason: 'Thẻ đã bị vô hiệu hóa'
        };
    }

    // Kiểm tra thẻ có hết hạn không
    if (card.expired_at) {
        const now = new Date();
        const expiredDate = new Date(card.expired_at);

        if (now > expiredDate) {
            return {
                granted: false,
                reason: 'Thẻ đã hết hạn'
            };
        }
    }

    // Kiểm tra user có active không
    if (!user.is_active) {
        return {
            granted: false,
            reason: 'Tài khoản đã bị vô hiệu hóa'
        };
    }

    // Kiểm tra cửa có bị khóa không
    if (door.is_locked) {
        return {
            granted: false,
            reason: 'Cửa đang bị khóa khẩn cấp'
        };
    }

    // Admin và Security luôn được vào (quyền cao nhất)
    if (user.role === 'admin' || user.role === 'security') {
        return {
            granted: true,
            reason: null
        };
    }

    // ============================================
    // 2. KIỂM TRA PERMISSIONS TỪ DATABASE (MỚI)
    // ============================================

    try {
        // Lấy tất cả permissions của card này
        const cardPermissions = await getCardPermissions(card.id);

        if (!cardPermissions || cardPermissions.length === 0) {
            // Card không có permission nào -> từ chối
            return {
                granted: false,
                reason: 'Thẻ chưa được gán quyền truy cập'
            };
        }

        // Kiểm tra từng permission (theo thứ tự priority từ cao xuống thấp)
        for (const cp of cardPermissions) {
            // Kiểm tra thời hạn hiệu lực của permission assignment
            if (!isPermissionAssignmentValid(cp)) {
                continue; // Skip permission này
            }

            // Kiểm tra giới hạn thời gian
            const timeCheck = checkTimeRestrictions(cp);
            if (!timeCheck.allowed) {
                // Nếu permission có time restriction và không pass -> skip
                // (cho phép permission khác có thể cho phép)
                continue;
            }

            // Kiểm tra quyền truy cập cửa
            const doorCheck = checkDoorAccess(cp, door);
            if (doorCheck.granted) {
                // Nếu một permission cho phép -> granted
                return {
                    granted: true,
                    reason: null
                };
            }
        }

        // Nếu không có permission nào cho phép -> từ chối
        return {
            granted: false,
            reason: 'Không có quyền truy cập cửa này'
        };

    } catch (error) {
        console.error('Error checking card permissions:', error);

        // Nếu có lỗi khi query database -> fallback về logic cũ (an toàn)
        return checkAccessPermissionLegacy(card, door, user);
    }
}

/**
 * Kiểm tra thời hạn hiệu lực của permission assignment
 */
function isPermissionAssignmentValid(cardPermission) {
    const now = new Date();

    // Kiểm tra valid_from
    if (cardPermission.valid_from) {
        const validFrom = new Date(cardPermission.valid_from);
        if (now < validFrom) {
            return false; // Chưa đến thời gian hiệu lực
        }
    }

    // Kiểm tra valid_until
    if (cardPermission.valid_until) {
        const validUntil = new Date(cardPermission.valid_until);
        if (now > validUntil) {
            return false; // Đã hết thời hạn
        }
    }

    return true;
}

/**
 * Kiểm tra giới hạn thời gian (time_restrictions)
 */
function checkTimeRestrictions(cardPermission) {
    let timeRestrictions;

    // Nếu card có override_time -> dùng custom_time_restrictions
    if (cardPermission.override_time && cardPermission.custom_time_restrictions) {
        timeRestrictions = cardPermission.custom_time_restrictions;
    }
    // Nếu không, dùng time_restrictions từ permission gốc
    else if (cardPermission.base_time_restrictions) {
        timeRestrictions = cardPermission.base_time_restrictions;
    }
    // Nếu không có giới hạn thời gian -> luôn cho phép
    else {
        return { allowed: true };
    }

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDay = now.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday

    // Kiểm tra ngày trong tuần
    if (timeRestrictions.allowed_days && Array.isArray(timeRestrictions.allowed_days)) {
        if (!timeRestrictions.allowed_days.includes(currentDay)) {
            return {
                allowed: false,
                reason: 'Ngoài ngày cho phép truy cập'
            };
        }
    }

    // Kiểm tra giờ
    if (timeRestrictions.start_time && timeRestrictions.end_time) {
        const [startHour, startMinute] = timeRestrictions.start_time.split(':').map(Number);
        const [endHour, endMinute] = timeRestrictions.end_time.split(':').map(Number);

        const currentTimeInMinutes = currentHour * 60 + currentMinute;
        const startTimeInMinutes = startHour * 60 + startMinute;
        const endTimeInMinutes = endHour * 60 + endMinute;

        if (currentTimeInMinutes < startTimeInMinutes || currentTimeInMinutes > endTimeInMinutes) {
            return {
                allowed: false,
                reason: `Ngoài giờ cho phép truy cập (${timeRestrictions.start_time} - ${timeRestrictions.end_time})`
            };
        }
    }

    return { allowed: true };
}

/**
 * Kiểm tra quyền truy cập cửa
 */
function checkDoorAccess(cardPermission, door) {
    let allowedDoorIds = [];
    let doorAccessMode = cardPermission.door_access_mode;

    // 1. Xử lý override_doors (nếu card override danh sách cửa)
    if (cardPermission.override_doors && cardPermission.custom_door_ids) {
        allowedDoorIds = cardPermission.custom_door_ids;
        doorAccessMode = 'specific'; // Override luôn là specific mode
    }
    // 2. Nếu không override, dùng permission gốc
    else {
        if (doorAccessMode === 'all') {
            // Cho phép tất cả cửa
            allowedDoorIds = null; // null = all doors
        } else if (doorAccessMode === 'specific' && cardPermission.base_allowed_door_ids) {
            allowedDoorIds = cardPermission.base_allowed_door_ids;
        } else if (doorAccessMode === 'none') {
            // Không cho phép cửa nào
            return { granted: false };
        }
    }

    // 3. Thêm additional_door_ids (quyền bổ sung)
    if (cardPermission.additional_door_ids && Array.isArray(cardPermission.additional_door_ids)) {
        if (allowedDoorIds === null) {
            // Nếu đã là 'all', không cần thêm gì
        } else if (Array.isArray(allowedDoorIds)) {
            // Merge additional doors vào
            allowedDoorIds = [...allowedDoorIds, ...cardPermission.additional_door_ids];
            // Remove duplicates
            allowedDoorIds = [...new Set(allowedDoorIds)];
        } else {
            allowedDoorIds = cardPermission.additional_door_ids;
        }
    }

    // 4. Kiểm tra door hiện tại
    if (allowedDoorIds === null) {
        // 'all' mode -> cho phép tất cả
        return { granted: true };
    } else if (Array.isArray(allowedDoorIds) && allowedDoorIds.includes(door.id)) {
        // Specific mode -> kiểm tra door.id có trong danh sách không
        return { granted: true };
    }

    // Không có quyền
    return { granted: false };
}

/**
 * LEGACY FALLBACK - Logic cũ (dùng khi có lỗi database)
 * Đây là logic từ file accessControlService.js cũ
 */
function checkAccessPermissionLegacy(card, door, user) {
    // Kiểm tra thời gian
    const now = new Date();
    const currentHour = now.getHours();

    if (currentHour < 7 || currentHour > 21) {
        return {
            granted: false,
            reason: 'Ngoài giờ cho phép truy cập (07:00 - 21:00)'
        };
    }

    // Kiểm tra ngày trong tuần
    const dayOfWeek = now.getDay();

    if (dayOfWeek === 0) {
        return {
            granted: false,
            reason: 'Chủ nhật không làm việc'
        };
    }

    // Kiểm tra access level của cửa
    if (door.access_level === 'all') {
        return {
            granted: true,
            reason: null
        };
    }

    if (door.access_level === 'department') {
        if (user.department_id === door.department_id) {
            return {
                granted: true,
                reason: null
            };
        } else {
            return {
                granted: false,
                reason: 'Không có quyền truy cập phòng này'
            };
        }
    }

    if (door.access_level === 'vip') {
        if (user.position === 'manager' || user.position === 'director') {
            return {
                granted: true,
                reason: null
            };
        } else {
            return {
                granted: false,
                reason: 'Chỉ Manager hoặc Director mới được vào'
            };
        }
    }

    return {
        granted: false,
        reason: 'Không có quyền truy cập'
    };
}

module.exports = {
    checkAccessPermission
};
