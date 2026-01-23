-- =====================================================
-- SCRIPT GÁN PERMISSIONS CHO TẤT CẢ CARDS ĐANG HOẠT ĐỘNG
-- =====================================================
-- Mọi card nhân viên sẽ có:
-- 1. Office Hours Only (permission_id = 2)
-- 2. Permission theo phòng ban của họ
-- 3. Valid đến 31/12/2026
-- =====================================================

-- =====================================================
-- BƯỚC 1: GÁN "OFFICE HOURS ONLY" CHO TẤT CẢ CARDS
-- =====================================================

INSERT INTO card_permissions (card_id, permission_id, assigned_at, valid_from, valid_until, is_active, notes)
SELECT
    c.id as card_id,
    2 as permission_id,  -- Office Hours Only
    NOW() as assigned_at,
    CURDATE() as valid_from,
    '2026-12-31' as valid_until,
    1 as is_active,
    'Auto-assigned: Office Hours Only - Valid until end of 2026' as notes
FROM cards c
INNER JOIN users u ON c.user_id = u.id
WHERE c.status = 'active'
  AND u.role != 'security'  -- Bỏ qua bảo vệ
ON DUPLICATE KEY UPDATE
    valid_until = '2026-12-31',
    is_active = 1,
    notes = 'Updated: Office Hours Only - Valid until end of 2026';

-- =====================================================
-- BƯỚC 2: GÁN PERMISSION THEO PHÒNG BAN
-- =====================================================

-- IT Department → IT Department Access (permission_id = 4)
INSERT INTO card_permissions (card_id, permission_id, assigned_at, valid_from, valid_until, is_active, notes)
SELECT
    c.id as card_id,
    4 as permission_id,  -- IT Department Access
    NOW() as assigned_at,
    CURDATE() as valid_from,
    '2026-12-31' as valid_until,
    1 as is_active,
    'Auto-assigned: IT Department Access - Valid until end of 2026' as notes
FROM cards c
INNER JOIN users u ON c.user_id = u.id
WHERE c.status = 'active'
  AND u.department_id IN (4, 10, 11, 12, 13)  -- IT và các team IT
ON DUPLICATE KEY UPDATE
    valid_until = '2026-12-31',
    is_active = 1,
    notes = 'Updated: IT Department Access - Valid until end of 2026';

-- HR Department → HR Department Access (permission_id = 5)
INSERT INTO card_permissions (card_id, permission_id, assigned_at, valid_from, valid_until, is_active, notes)
SELECT
    c.id as card_id,
    5 as permission_id,  -- HR Department Access
    NOW() as assigned_at,
    CURDATE() as valid_from,
    '2026-12-31' as valid_until,
    1 as is_active,
    'Auto-assigned: HR Department Access - Valid until end of 2026' as notes
FROM cards c
INNER JOIN users u ON c.user_id = u.id
WHERE c.status = 'active'
  AND u.department_id = 8  -- HR Department
ON DUPLICATE KEY UPDATE
    valid_until = '2026-12-31',
    is_active = 1,
    notes = 'Updated: HR Department Access - Valid until end of 2026';

-- Finance Department → Finance Department Access (permission_id = 6)
INSERT INTO card_permissions (card_id, permission_id, assigned_at, valid_from, valid_until, is_active, notes)
SELECT
    c.id as card_id,
    6 as permission_id,  -- Finance Department Access
    NOW() as assigned_at,
    CURDATE() as valid_from,
    '2026-12-31' as valid_until,
    1 as is_active,
    'Auto-assigned: Finance Department Access - Valid until end of 2026' as notes
FROM cards c
INNER JOIN users u ON c.user_id = u.id
WHERE c.status = 'active'
  AND u.department_id = 9  -- Finance Department
ON DUPLICATE KEY UPDATE
    valid_until = '2026-12-31',
    is_active = 1,
    notes = 'Updated: Finance Department Access - Valid until end of 2026';

-- Sales Department → Sales Department Access (permission_id = 16)
INSERT INTO card_permissions (card_id, permission_id, assigned_at, valid_from, valid_until, is_active, notes)
SELECT
    c.id as card_id,
    16 as permission_id,  -- Sales Department Access
    NOW() as assigned_at,
    CURDATE() as valid_from,
    '2026-12-31' as valid_until,
    1 as is_active,
    'Auto-assigned: Sales Department Access - Valid until end of 2026' as notes
FROM cards c
INNER JOIN users u ON c.user_id = u.id
WHERE c.status = 'active'
  AND u.department_id = 7  -- Sales Department
ON DUPLICATE KEY UPDATE
    valid_until = '2026-12-31',
    is_active = 1,
    notes = 'Updated: Sales Department Access - Valid until end of 2026';

-- Marketing Department → Marketing Department Access (permission_id = 17)
INSERT INTO card_permissions (card_id, permission_id, assigned_at, valid_from, valid_until, is_active, notes)
SELECT
    c.id as card_id,
    17 as permission_id,  -- Marketing Department Access
    NOW() as assigned_at,
    CURDATE() as valid_from,
    '2026-12-31' as valid_until,
    1 as is_active,
    'Auto-assigned: Marketing Department Access - Valid until end of 2026' as notes
FROM cards c
INNER JOIN users u ON c.user_id = u.id
WHERE c.status = 'active'
  AND u.department_id IN (6, 14, 15)  -- Marketing và các team Marketing
ON DUPLICATE KEY UPDATE
    valid_until = '2026-12-31',
    is_active = 1,
    notes = 'Updated: Marketing Department Access - Valid until end of 2026';

-- Engineering Department → R&D Department Access (permission_id = 18)
INSERT INTO card_permissions (card_id, permission_id, assigned_at, valid_from, valid_until, is_active, notes)
SELECT
    c.id as card_id,
    18 as permission_id,  -- R&D Department Access
    NOW() as assigned_at,
    CURDATE() as valid_from,
    '2026-12-31' as valid_until,
    1 as is_active,
    'Auto-assigned: Engineering/R&D Access - Valid until end of 2026' as notes
FROM cards c
INNER JOIN users u ON c.user_id = u.id
WHERE c.status = 'active'
  AND u.department_id = 5  -- Engineering Department
ON DUPLICATE KEY UPDATE
    valid_until = '2026-12-31',
    is_active = 1,
    notes = 'Updated: Engineering/R&D Access - Valid until end of 2026';

-- =====================================================
-- BƯỚC 3: GÁN MANAGER ACCESS CHO CÁC MANAGER
-- =====================================================

INSERT INTO card_permissions (card_id, permission_id, assigned_at, valid_from, valid_until, is_active, notes)
SELECT
    c.id as card_id,
    12 as permission_id,  -- Manager Access
    NOW() as assigned_at,
    CURDATE() as valid_from,
    '2026-12-31' as valid_until,
    1 as is_active,
    'Auto-assigned: Manager Access - Valid until end of 2026' as notes
FROM cards c
INNER JOIN users u ON c.user_id = u.id
WHERE c.status = 'active'
  AND u.position = 'manager'
  AND u.role != 'security'
ON DUPLICATE KEY UPDATE
    valid_until = '2026-12-31',
    is_active = 1,
    notes = 'Updated: Manager Access - Valid until end of 2026';

-- =====================================================
-- BƯỚC 4: GÁN DIRECTOR ACCESS CHO DIRECTOR
-- =====================================================

INSERT INTO card_permissions (card_id, permission_id, assigned_at, valid_from, valid_until, is_active, notes)
SELECT
    c.id as card_id,
    13 as permission_id,  -- Director Access
    NOW() as assigned_at,
    CURDATE() as valid_from,
    '2026-12-31' as valid_until,
    1 as is_active,
    'Auto-assigned: Director Access - Valid until end of 2026' as notes
FROM cards c
INNER JOIN users u ON c.user_id = u.id
WHERE c.status = 'active'
  AND u.position = 'director'
ON DUPLICATE KEY UPDATE
    valid_until = '2026-12-31',
    is_active = 1,
    notes = 'Updated: Director Access - Valid until end of 2026';

-- =====================================================
-- BƯỚC 5: GÁN SECURITY GUARD ACCESS CHO BẢO VỆ
-- =====================================================

-- Lấy ID của Security Guard Access permission
SET @security_permission_id = (SELECT id FROM permissions WHERE name = 'Security Guard Access' LIMIT 1);

INSERT INTO card_permissions (card_id, permission_id, assigned_at, valid_from, valid_until, is_active, notes)
SELECT
    c.id as card_id,
    @security_permission_id as permission_id,
    NOW() as assigned_at,
    CURDATE() as valid_from,
    '2026-12-31' as valid_until,
    1 as is_active,
    'Auto-assigned: Security Guard Access - Valid until end of 2026' as notes
FROM cards c
INNER JOIN users u ON c.user_id = u.id
WHERE c.status = 'active'
  AND u.role = 'security'
ON DUPLICATE KEY UPDATE
    valid_until = '2026-12-31',
    is_active = 1,
    notes = 'Updated: Security Guard Access - Valid until end of 2026';

-- =====================================================
-- BƯỚC 6: GÁN PARKING ACCESS CHO TẤT CẢ
-- =====================================================

INSERT INTO card_permissions (card_id, permission_id, assigned_at, valid_from, valid_until, is_active, notes)
SELECT
    c.id as card_id,
    8 as permission_id,  -- Parking Access
    NOW() as assigned_at,
    CURDATE() as valid_from,
    '2026-12-31' as valid_until,
    1 as is_active,
    'Auto-assigned: Parking Access - Valid until end of 2026' as notes
FROM cards c
INNER JOIN users u ON c.user_id = u.id
WHERE c.status = 'active'
ON DUPLICATE KEY UPDATE
    valid_until = '2026-12-31',
    is_active = 1,
    notes = 'Updated: Parking Access - Valid until end of 2026';

-- =====================================================
-- KIỂM TRA KẾT QUẢ
-- =====================================================

-- Xem tổng quan permissions đã gán
SELECT
    u.employee_id,
    u.full_name,
    u.position,
    u.role,
    d.name as department,
    c.card_uid,
    c.status as card_status,
    COUNT(cp.id) as permission_count,
    GROUP_CONCAT(p.name SEPARATOR ' | ') as permissions
FROM users u
LEFT JOIN cards c ON u.id = c.user_id
LEFT JOIN departments d ON u.department_id = d.id
LEFT JOIN card_permissions cp ON c.id = cp.card_id AND cp.is_active = 1
LEFT JOIN permissions p ON cp.permission_id = p.id
WHERE c.status = 'active'
GROUP BY u.id, u.employee_id, u.full_name, u.position, u.role, d.name, c.card_uid, c.status
ORDER BY u.employee_id;

-- Xem chi tiết permissions theo phòng ban
SELECT
    d.name as department,
    COUNT(DISTINCT c.id) as total_cards,
    GROUP_CONCAT(DISTINCT p.name SEPARATOR ' | ') as assigned_permissions
FROM departments d
INNER JOIN users u ON d.id = u.department_id
INNER JOIN cards c ON u.id = c.user_id
INNER JOIN card_permissions cp ON c.id = cp.card_id
INNER JOIN permissions p ON cp.permission_id = p.id
WHERE c.status = 'active' AND cp.is_active = 1
GROUP BY d.id, d.name
ORDER BY d.id;

-- Kiểm tra cards chưa có permission nào
SELECT
    u.employee_id,
    u.full_name,
    c.card_uid,
    c.status
FROM users u
INNER JOIN cards c ON u.id = c.user_id
LEFT JOIN card_permissions cp ON c.id = cp.card_id AND cp.is_active = 1
WHERE c.status = 'active'
  AND cp.id IS NULL
ORDER BY u.employee_id;

-- Thống kê permissions được gán
SELECT
    p.name as permission_name,
    COUNT(cp.id) as assigned_count,
    GROUP_CONCAT(DISTINCT c.card_uid SEPARATOR ', ') as card_uids
FROM permissions p
LEFT JOIN card_permissions cp ON p.id = cp.permission_id AND cp.is_active = 1
LEFT JOIN cards c ON cp.card_id = c.id
WHERE p.is_active = 1
GROUP BY p.id, p.name
ORDER BY assigned_count DESC, p.priority DESC;

-- =====================================================
-- SUMMARY
-- =====================================================
/*
PERMISSIONS ĐÃ GÁN:

1. TẤT CẢ NHÂN VIÊN (trừ bảo vệ):
   ✅ Office Hours Only (7h-21h, T2-T7)
   ✅ Parking Access
   ✅ Valid đến: 31/12/2026

2. THEO PHÒNG BAN:
   ✅ IT → IT Department Access (24/7)
   ✅ HR → HR Department Access (8h-18h, T2-T6)
   ✅ Finance → Finance Department Access (8h-17h, T2-T6)
   ✅ Sales → Sales Department Access (8h-19h, T2-T7)
   ✅ Marketing → Marketing Department Access (8h-18h, T2-T6)
   ✅ Engineering → R&D Access (7h-22h, cả tuần)

3. THEO CHỨC VỤ:
   ✅ Manager → Manager Access (specific doors)
   ✅ Director → Director Access (all doors)

4. BẢO VỆ:
   ✅ Security Guard Access (24/7, tất cả cửa TRỪPHÒNG SERVER)

LƯU Ý:
- Tất cả permissions valid đến 31/12/2026
- Sử dụng ON DUPLICATE KEY UPDATE nên có thể chạy nhiều lần
- Cards inactive sẽ không được gán
*/
