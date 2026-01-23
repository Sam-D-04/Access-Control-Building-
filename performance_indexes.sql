-- Performance Optimization Indexes
-- Chạy file này để cải thiện hiệu năng database

-- Index cho permission_doors.permission_id để JOIN nhanh hơn
CREATE INDEX IF NOT EXISTS idx_permission_doors_permission_id
ON permission_doors(permission_id);

-- Index cho permissions.is_active và priority để WHERE + ORDER BY nhanh hơn
CREATE INDEX IF NOT EXISTS idx_permissions_active_priority
ON permissions(is_active, priority);

-- Index cho cards.permission_id để JOIN nhanh hơn khi query cards by permission
CREATE INDEX IF NOT EXISTS idx_cards_permission_id
ON cards(permission_id);

-- Kiểm tra các indexes đã tạo
SHOW INDEX FROM permission_doors;
SHOW INDEX FROM permissions;
SHOW INDEX FROM cards;
