// Kiểm tra quyền truy cập
function checkAccessPermission(card, door, user) {
    //Kiểm tra thẻ có active không
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

    //Kiểm tra cửa có bị khóa không
    if (door.is_locked) {
        return {
            granted: false,
            reason: 'Cửa đang bị khóa khẩn cấp'
        };
    }

    //Admin và Security luôn được vào
    if (user.role === 'admin' || user.role === 'security') {
        return {
            granted: true,
            reason: null
        };
    }

    // Kiểm tra thời gian
    const now = new Date();
    const currentHour = now.getHours();

    if (currentHour < 7 || currentHour > 21) {
        return {
            granted: false,
            reason: 'Ngoài giờ cho phép truy cập (07:00 - 21:00)'
        };
    }

    //kiểm tra ngày trong tuần 
    const dayOfWeek = now.getDay();

    if (dayOfWeek === 0) {
        return {
            granted: false,
            reason: 'Chủ nhật không làm việc'
        };
    }

    // Kiểm tra access level của cửa

    // Tất cả nhân viên đều vào được
    if (door.access_level === 'all') {
        return {
            granted: true,
            reason: null
        };
    }

    // Chỉ nhân viên cùng phòng ban
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

    // chỉ Manager hoặc Director
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

    // Mặc định là từ chối
    return {
        granted: false,
        reason: 'Không có quyền truy cập'
    };
}

module.exports = {
    checkAccessPermission
};
