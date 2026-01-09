-- =====================================================
-- PERMISSION SYSTEM FOR ACCESS CONTROL
-- =====================================================
-- Tạo bảng permissions để định nghĩa các quyền truy cập
-- Cards sẽ kế thừa permissions + có thể override/extend thêm

-- 1. Bảng PERMISSIONS - Định nghĩa các permission templates có thể tái sử dụng
CREATE TABLE IF NOT EXISTS permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE COMMENT 'Tên permission (VD: "Full Access", "Office Hours", "VIP Access")',
    description TEXT COMMENT 'Mô tả chi tiết permission',

    -- Cấu hình quyền truy cập cửa
    door_access_mode ENUM('all', 'specific', 'none') DEFAULT 'specific' COMMENT 'all=tất cả cửa, specific=chỉ định cụ thể, none=không có',
    allowed_door_ids JSON COMMENT 'Danh sách door_id được phép (nếu mode=specific): [1,2,3]',

    -- Giới hạn thời gian
    time_restrictions JSON COMMENT 'Giới hạn thời gian: {"start_time":"07:00","end_time":"21:00","allowed_days":[1,2,3,4,5,6]}',

    -- Cấp độ ưu tiên (cao hơn = ưu tiên hơn khi conflict)
    priority INT DEFAULT 0 COMMENT 'Độ ưu tiên: số cao hơn = quyền cao hơn',

    -- Trạng thái
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_name (name),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Bảng định nghĩa các permission templates';

-- 2. Bảng CARD_PERMISSIONS - Gán permissions cho cards (với khả năng override)
CREATE TABLE IF NOT EXISTS card_permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    card_id INT NOT NULL COMMENT 'FK tới cards table',
    permission_id INT NOT NULL COMMENT 'FK tới permissions table',

    -- Override settings (nếu cần tùy chỉnh riêng cho card này)
    override_doors BOOLEAN DEFAULT FALSE COMMENT 'Có override danh sách cửa không?',
    custom_door_ids JSON COMMENT 'Danh sách cửa custom (nếu override_doors=true): [1,2,5]',

    override_time BOOLEAN DEFAULT FALSE COMMENT 'Có override giới hạn thời gian không?',
    custom_time_restrictions JSON COMMENT 'Giới hạn thời gian custom (nếu override_time=true)',

    -- Quyền bổ sung (thêm vào permission gốc)
    additional_door_ids JSON COMMENT 'Cửa được thêm vào (ngoài permission gốc): [7,8,9]',

    -- Thời gian hiệu lực của permission này cho card
    valid_from DATETIME COMMENT 'Bắt đầu hiệu lực',
    valid_until DATETIME COMMENT 'Hết hiệu lực',

    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,

    -- Một card không thể có cùng permission 2 lần
    UNIQUE KEY unique_card_permission (card_id, permission_id),

    INDEX idx_card (card_id),
    INDEX idx_permission (permission_id),
    INDEX idx_active (is_active),
    INDEX idx_valid_time (valid_from, valid_until)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Gán permissions cho cards với khả năng override';

-- 3. Bảng DOOR_REQUIRED_PERMISSIONS (Optional) - Quy định cửa nào cần permissions nào
CREATE TABLE IF NOT EXISTS door_required_permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    door_id INT NOT NULL COMMENT 'FK tới doors table',
    required_permission_ids JSON COMMENT 'Danh sách permission_id cần có để mở cửa: [1,2] (có 1 trong số này là được)',
    require_all BOOLEAN DEFAULT FALSE COMMENT 'TRUE=cần tất cả permissions, FALSE=cần ít nhất 1',

    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (door_id) REFERENCES doors(id) ON DELETE CASCADE,

    UNIQUE KEY unique_door (door_id),
    INDEX idx_door (door_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Quy định cửa cần permissions gì (optional, nâng cao)';

-- =====================================================
-- DỮ LIỆU MẪU (Sample Data)
-- =====================================================

-- Tạo các permission templates mẫu
INSERT INTO permissions (name, description, door_access_mode, allowed_door_ids, time_restrictions, priority) VALUES
('Full Access', 'Quyền truy cập không giới hạn tất cả cửa, mọi thời điểm', 'all', NULL, NULL, 100),

('Office Hours Access', 'Truy cập giờ hành chính (7h-21h, T2-T7)', 'all', NULL,
 '{"start_time":"07:00","end_time":"21:00","allowed_days":[1,2,3,4,5,6]}', 50),

('Weekday Only', 'Chỉ truy cập T2-T6, giờ hành chính', 'all', NULL,
 '{"start_time":"08:00","end_time":"18:00","allowed_days":[1,2,3,4,5]}', 40),

('VIP Access', 'Truy cập VIP (cửa 1,2,3)', 'specific', '[1,2,3]', NULL, 80),

('Security Access', 'Truy cập an ninh 24/7', 'all', NULL, NULL, 90),

('Restricted Access', 'Giới hạn truy cập (chỉ cửa chính)', 'specific', '[1]',
 '{"start_time":"08:00","end_time":"17:00","allowed_days":[1,2,3,4,5]}', 20);

-- =====================================================
-- VÍ DỤ SỬ DỤNG
-- =====================================================

-- Ví dụ 1: Gán "Office Hours Access" cho card_id = 1 (nhân viên thường)
-- INSERT INTO card_permissions (card_id, permission_id, is_active)
-- VALUES (1, 2, TRUE);

-- Ví dụ 2: Gán "VIP Access" cho card_id = 2, nhưng thêm quyền cửa 5,6
-- INSERT INTO card_permissions (card_id, permission_id, additional_door_ids, is_active)
-- VALUES (2, 4, '[5,6]', TRUE);

-- Ví dụ 3: Gán "Weekday Only" nhưng override để chỉ cho phép cửa 1,2
-- INSERT INTO card_permissions (card_id, permission_id, override_doors, custom_door_ids, is_active)
-- VALUES (3, 3, TRUE, '[1,2]', TRUE);

-- Ví dụ 4: Gán permission có thời hạn (chỉ hiệu lực từ ngày 1/1/2025 đến 31/12/2025)
-- INSERT INTO card_permissions (card_id, permission_id, valid_from, valid_until, is_active)
-- VALUES (4, 2, '2025-01-01 00:00:00', '2025-12-31 23:59:59', TRUE);

-- =====================================================
-- QUERIES HỮU ÍCH
-- =====================================================

-- Xem tất cả permissions của một card
-- SELECT
--     c.card_uid,
--     p.name as permission_name,
--     p.description,
--     cp.override_doors,
--     cp.custom_door_ids,
--     cp.additional_door_ids,
--     cp.valid_from,
--     cp.valid_until
-- FROM card_permissions cp
-- JOIN cards c ON c.id = cp.card_id
-- JOIN permissions p ON p.id = cp.permission_id
-- WHERE cp.card_id = 1 AND cp.is_active = TRUE;

-- Xem tất cả cards có một permission cụ thể
-- SELECT
--     c.card_uid,
--     u.full_name,
--     cp.is_active,
--     cp.valid_from,
--     cp.valid_until
-- FROM card_permissions cp
-- JOIN cards c ON c.id = cp.card_id
-- JOIN users u ON u.id = c.user_id
-- WHERE cp.permission_id = 2 AND cp.is_active = TRUE;
