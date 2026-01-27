/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

CREATE TABLE `access_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `card_id` int DEFAULT NULL COMMENT 'Thẻ được sử dụng',
  `user_id` int DEFAULT NULL COMMENT 'User thực hiện truy cập',
  `door_id` int NOT NULL COMMENT 'Cửa được truy cập',
  `access_time` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `status` enum('granted','denied') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `denial_reason` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Lý do từ chối (nếu denied)',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_logs_access_time` (`access_time`),
  KEY `idx_logs_user` (`user_id`),
  KEY `idx_logs_door` (`door_id`),
  KEY `idx_logs_card` (`card_id`),
  KEY `idx_logs_status` (`status`),
  CONSTRAINT `access_logs_ibfk_1` FOREIGN KEY (`card_id`) REFERENCES `cards` (`id`) ON DELETE SET NULL,
  CONSTRAINT `access_logs_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `access_logs_ibfk_3` FOREIGN KEY (`door_id`) REFERENCES `doors` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=126 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `card_permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `card_id` int NOT NULL,
  `permission_id` int NOT NULL,
  `assigned_by` int DEFAULT NULL COMMENT 'User ID người gán permission',
  `assigned_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `valid_from` date DEFAULT NULL COMMENT 'Ngày bắt đầu hiệu lực',
  `valid_until` date DEFAULT NULL COMMENT 'Ngày hết hiệu lực',
  `is_active` tinyint(1) DEFAULT '1',
  `notes` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_card_permission` (`card_id`,`permission_id`),
  KEY `fk_card_permissions_user` (`assigned_by`),
  KEY `idx_card_id` (`card_id`),
  KEY `idx_permission_id` (`permission_id`),
  KEY `idx_active` (`is_active`),
  KEY `idx_valid_dates` (`valid_from`,`valid_until`),
  CONSTRAINT `fk_card_permissions_card` FOREIGN KEY (`card_id`) REFERENCES `cards` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_card_permissions_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_card_permissions_user` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=36 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `cards` (
  `id` int NOT NULL AUTO_INCREMENT,
  `card_uid` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Mã thẻ RFID (CARD-XXX)',
  `user_id` int DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `issued_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `expired_at` timestamp NULL DEFAULT NULL COMMENT 'NULL = vĩnh viễn',
  `notes` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Ghi chú',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `card_uid` (`card_uid`),
  KEY `idx_cards_user` (`user_id`),
  KEY `idx_cards_uid` (`card_uid`),
  CONSTRAINT `cards_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `departments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `parent_id` int DEFAULT NULL,
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `level` int DEFAULT '0' COMMENT 'Cấp độ: 0=root, 1=level 1, etc.',
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  KEY `idx_parent` (`parent_id`),
  KEY `idx_level` (`level`),
  CONSTRAINT `departments_ibfk_1` FOREIGN KEY (`parent_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL,
  CONSTRAINT `departments_ibfk_2` FOREIGN KEY (`parent_id`) REFERENCES `departments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `doors` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `location` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `department_id` int DEFAULT NULL,
  `is_locked` tinyint(1) DEFAULT '0' COMMENT 'Khóa khẩn cấp',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_doors_locked` (`is_locked`),
  KEY `idx_door_department` (`department_id`),
  CONSTRAINT `fk_door_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Doors table - Each door belongs to a department (optional)';

CREATE TABLE `permission_doors` (
  `id` int NOT NULL AUTO_INCREMENT,
  `permission_id` int NOT NULL COMMENT 'FK tới permissions',
  `door_id` int NOT NULL COMMENT 'FK tới doors',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_permission_door` (`permission_id`,`door_id`),
  KEY `idx_permission` (`permission_id`),
  KEY `idx_door` (`door_id`),
  CONSTRAINT `fk_permission_doors_door` FOREIGN KEY (`door_id`) REFERENCES `doors` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_permission_doors_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Quan hệ N:M giữa permissions và doors';

CREATE TABLE `permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Tên permission (VD: "Full Access", "Office Hours")',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT 'Mô tả chi tiết permission',
  `door_access_mode` enum('all','specific','none') COLLATE utf8mb4_unicode_ci DEFAULT 'specific' COMMENT 'all=tất cả cửa, specific=chỉ định qua permission_doors, none=không có',
  `time_restrictions` json DEFAULT NULL COMMENT 'Giới hạn thời gian: {"start_time":"07:00","end_time":"21:00","allowed_days":[1,2,3,4,5,6]}',
  `priority` int DEFAULT '0' COMMENT 'Độ ưu tiên: số cao hơn = quyền cao hơn',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  KEY `idx_name` (`name`),
  KEY `idx_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Bảng định nghĩa các permission\r\n';

CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'bcrypt hash',
  `full_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avatar` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Base64 WebP image',
  `department_id` int DEFAULT NULL,
  `position` enum('staff','manager','director') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'staff',
  `role` enum('admin','security','employee') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'employee',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_id` (`employee_id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_users_department` (`department_id`),
  KEY `idx_users_email` (`email`),
  KEY `idx_users_employee_id` (`employee_id`),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=40 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `visitor` (
  `id` int NOT NULL AUTO_INCREMENT,
  `photo_path` longtext COLLATE utf8mb4_unicode_ci,
  `notes` text COLLATE utf8mb4_unicode_ci COMMENT 'Ghi chú: khách đến gặp ai, mục đích gì',
  `captured_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời gian chụp',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `checkout_photo_path` longtext COLLATE utf8mb4_unicode_ci,
  `is_checkout` tinyint(1) DEFAULT '0',
  `time_out` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_captured_at` (`captured_at`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;