-- Migration: Card có nhiều permissions (Many-to-Many)
-- Chạy script này để chuyển từ one-to-one sang many-to-many

-- BƯỚC 1: Tạo bảng card_permissions mới (junction table)
CREATE TABLE IF NOT EXISTS card_permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    card_id INT NOT NULL,
    permission_id INT NOT NULL,
    assigned_by INT NULL COMMENT 'User ID người gán permission',
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_from DATE NULL COMMENT 'Ngày bắt đầu hiệu lực',
    valid_until DATE NULL COMMENT 'Ngày hết hiệu lực',
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT NULL,

    -- Foreign keys
    CONSTRAINT fk_card_permissions_card FOREIGN KEY (card_id)
        REFERENCES cards(id) ON DELETE CASCADE,
    CONSTRAINT fk_card_permissions_permission FOREIGN KEY (permission_id)
        REFERENCES permissions(id) ON DELETE CASCADE,
    CONSTRAINT fk_card_permissions_user FOREIGN KEY (assigned_by)
        REFERENCES users(id) ON DELETE SET NULL,

    -- Đảm bảo không trùng lặp (1 card không thể có cùng 1 permission 2 lần)
    UNIQUE KEY unique_card_permission (card_id, permission_id),

    -- Indexes để query nhanh
    INDEX idx_card_id (card_id),
    INDEX idx_permission_id (permission_id),
    INDEX idx_active (is_active),
    INDEX idx_valid_dates (valid_from, valid_until)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- BƯỚC 2: Migrate data từ cards.permission_id sang card_permissions
INSERT INTO card_permissions (card_id, permission_id, is_active)
SELECT
    id as card_id,
    permission_id,
    TRUE as is_active
FROM cards
WHERE permission_id IS NOT NULL;

-- BƯỚC 3: (TÙY CHỌN) Xóa cột permission_id khỏi bảng cards
-- CẢNH BÁO: Chỉ chạy sau khi đã test kỹ và backup database!
-- ALTER TABLE cards DROP FOREIGN KEY fk_cards_permission;
-- ALTER TABLE cards DROP COLUMN permission_id;

-- BƯỚC 4: Kiểm tra kết quả
SELECT
    c.card_uid,
    c.status,
    COUNT(cp.id) as permission_count,
    GROUP_CONCAT(p.name SEPARATOR ', ') as permissions
FROM cards c
LEFT JOIN card_permissions cp ON c.id = cp.card_id AND cp.is_active = TRUE
LEFT JOIN permissions p ON cp.permission_id = p.id
GROUP BY c.id
ORDER BY c.id
LIMIT 20;

-- BƯỚC 5: Tạo view để dễ query
CREATE OR REPLACE VIEW vw_card_permissions AS
SELECT
    cp.id,
    cp.card_id,
    cp.permission_id,
    c.card_uid,
    c.status as card_status,
    p.name as permission_name,
    p.description as permission_description,
    p.door_access_mode,
    p.priority,
    cp.assigned_at,
    cp.valid_from,
    cp.valid_until,
    cp.is_active,
    u.full_name as assigned_by_name
FROM card_permissions cp
INNER JOIN cards c ON cp.card_id = c.id
INNER JOIN permissions p ON cp.permission_id = p.id
LEFT JOIN users u ON cp.assigned_by = u.id
WHERE cp.is_active = TRUE;
