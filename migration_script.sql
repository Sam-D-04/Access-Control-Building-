-- ========================================
-- MIGRATION SCRIPT: JSON to permission_doors table
-- Mục đích: Chuyển từ JSON field sang bảng trung gian
-- ========================================

-- BƯỚC 1: Tạo bảng permission_doors
-- ========================================

DROP TABLE IF EXISTS `permission_doors`;

CREATE TABLE `permission_doors` (
  `id` int NOT NULL AUTO_INCREMENT,
  `permission_id` int NOT NULL COMMENT 'FK tới permissions',
  `door_id` int NOT NULL COMMENT 'FK tới doors',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_permission_door` (`permission_id`, `door_id`),
  KEY `idx_permission` (`permission_id`),
  KEY `idx_door` (`door_id`),
  CONSTRAINT `fk_permission_doors_permission`
    FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_permission_doors_door`
    FOREIGN KEY (`door_id`) REFERENCES `doors` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Quan hệ N:M giữa permissions và doors - thay thế JSON field';


-- BƯỚC 2: Migrate dữ liệu từ JSON sang bảng mới
-- ========================================
-- LƯU Ý: MySQL không hỗ trợ parse JSON array trực tiếp trong INSERT
-- Cần dùng script bên ngoài (Node.js, Python) hoặc stored procedure

-- Ví dụ với MySQL 8.0+ (nếu có JSON_TABLE):
/*
INSERT INTO permission_doors (permission_id, door_id)
SELECT
  p.id as permission_id,
  jt.door_id
FROM permissions p
CROSS JOIN JSON_TABLE(
  p.allowed_door_ids,
  '$[*]' COLUMNS (door_id INT PATH '$')
) AS jt
WHERE p.door_access_mode = 'specific'
  AND p.allowed_door_ids IS NOT NULL
  AND JSON_LENGTH(p.allowed_door_ids) > 0;
*/

-- Hoặc dùng Node.js script (khuyến nghị):
-- Xem file: migration_from_json.js


-- BƯỚC 3: Sau khi migrate xong, xóa cột JSON
-- ========================================
-- ⚠️ CHỈ CHẠY SAU KHI ĐÃ VERIFY DỮ LIỆU ĐÚNG!

ALTER TABLE `permissions` DROP COLUMN `allowed_door_ids`;


-- BƯỚC 4: Cập nhật lại cấu trúc bảng permissions
-- ========================================

-- Permissions table (final structure)
/*
CREATE TABLE `permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL COMMENT 'Tên permission',
  `description` text COMMENT 'Mô tả chi tiết permission',
  `door_access_mode` enum('all','specific','none') DEFAULT 'specific'
    COMMENT 'all=tất cả cửa, specific=chỉ định qua permission_doors, none=không có',
  -- ❌ REMOVED: allowed_door_ids json
  `time_restrictions` json DEFAULT NULL
    COMMENT 'Giới hạn thời gian: {"start_time":"07:00","end_time":"21:00","allowed_days":[1,2,3,4,5,6]}',
  `priority` int DEFAULT 0 COMMENT 'Độ ưu tiên: số cao hơn = quyền cao hơn',
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  KEY `idx_name` (`name`),
  KEY `idx_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Bảng định nghĩa các permission templates';
*/


-- ========================================
-- ROLLBACK PLAN (nếu cần quay lại)
-- ========================================

/*
-- 1. Thêm lại cột JSON
ALTER TABLE `permissions`
ADD COLUMN `allowed_door_ids` json DEFAULT NULL
COMMENT 'Danh sách door_id được phép (nếu mode=specific): [1,2,3]'
AFTER `door_access_mode`;

-- 2. Migrate ngược từ permission_doors về JSON
-- (Cần script Node.js)

-- 3. Xóa bảng permission_doors
DROP TABLE IF EXISTS `permission_doors`;
*/


-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Kiểm tra số lượng permissions
SELECT COUNT(*) as total_permissions FROM permissions;

-- Kiểm tra số lượng liên kết permission-door
SELECT COUNT(*) as total_links FROM permission_doors;

-- Kiểm tra permission nào có bao nhiêu doors
SELECT
  p.id,
  p.name,
  p.door_access_mode,
  COUNT(pd.door_id) as door_count
FROM permissions p
LEFT JOIN permission_doors pd ON p.id = pd.permission_id
GROUP BY p.id, p.name, p.door_access_mode
ORDER BY door_count DESC;

-- Kiểm tra door nào được bao nhiêu permissions
SELECT
  d.id,
  d.name,
  COUNT(pd.permission_id) as permission_count
FROM doors d
LEFT JOIN permission_doors pd ON d.id = pd.door_id
GROUP BY d.id, d.name
ORDER BY permission_count DESC;

-- Kiểm tra có permission_door nào tham chiếu đến door không tồn tại không
SELECT pd.*
FROM permission_doors pd
LEFT JOIN doors d ON pd.door_id = d.id
WHERE d.id IS NULL;

-- Kiểm tra có permission_door nào tham chiếu đến permission không tồn tại không
SELECT pd.*
FROM permission_doors pd
LEFT JOIN permissions p ON pd.permission_id = p.id
WHERE p.id IS NULL;
