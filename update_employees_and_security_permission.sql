-- =====================================================
-- SCRIPT CẬP NHẬT NHÂN VIÊN VÀ QUYỀN BẢO VỆ
-- =====================================================

-- =====================================================
-- PHẦN 1: GÁN PHÒNG BAN CHO NHÂN VIÊN CHƯA CÓ
-- =====================================================

-- IT Manager → IT Department (4)
UPDATE users SET department_id = 4 WHERE employee_id = 'IT001';

-- IT DevOps → IT-DevOps team (12)
UPDATE users SET department_id = 12 WHERE employee_id = 'IT003';

-- Sales Director → Sales Department (7)
UPDATE users SET department_id = 7 WHERE employee_id = 'SALES001';

-- Sales Staff 1 → Sales Department (7)
UPDATE users SET department_id = 7 WHERE employee_id = 'SALES002';

-- Sales Staff 2 (Account Manager) → Sales Department (7)
UPDATE users SET department_id = 10 WHERE employee_id = 'SALES003';

-- Marketing Manager → Marketing Department (6)
UPDATE users SET department_id = 6 WHERE employee_id = 'MKT001';

-- Content Staff → Marketing-Content team (15)
UPDATE users SET department_id = 15 WHERE employee_id = 'MKT002';

-- Digital Marketing → Marketing-Digital team (14)
UPDATE users SET department_id = 14 WHERE employee_id = 'MKT003';

-- Social Media → Marketing-Digital team (14)
UPDATE users SET department_id = 14 WHERE employee_id = 'MKT004';

-- Designer → Marketing-Content team (15)
UPDATE users SET department_id = 15 WHERE employee_id = 'MKT005';

-- Backend Developer → IT-Backend team (10)
UPDATE users SET department_id = 10 WHERE employee_id = 'IT004';

-- Frontend Developer → IT-Frontend team (11)
UPDATE users SET department_id = 11 WHERE employee_id = 'IT005';

-- QA/Tester → IT-Tester team (13)
UPDATE users SET department_id = 13 WHERE employee_id = 'IT006';

-- HR Training → HR Department (8)
UPDATE users SET department_id = 8 WHERE employee_id = 'HR003';

-- HR C&B → HR Department (8)
UPDATE users SET department_id = 8 WHERE employee_id = 'HR004';

-- HR Admin → HR Department (8)
UPDATE users SET department_id = 8 WHERE employee_id = 'HR005';

-- Sales Business → Sales Department (7)
UPDATE users SET department_id = 7 WHERE employee_id = 'SALES004';

-- =====================================================
-- PHẦN 2: THÊM NHÂN VIÊN MỚI VÀO CÁC PHÒNG BAN THIẾU
-- =====================================================

-- Thêm nhân viên Finance (phòng Finance - 9 chưa có ai)
INSERT INTO users (employee_id, email, password, full_name, phone, department_id, position, role, is_active)
VALUES
('FIN001', 'finance.manager@company.com', '$2a$10$N9qo8uLOickgx2ZMRZoMye1IVI564JNrJl0BqUkI3lnGmzCUP77iK', 'Nguyễn Văn Tài Chính', '0901234611', 9, 'manager', 'employee', 1),
('FIN002', 'finance.accountant@company.com', '$2a$10$N9qo8uLOickgx2ZMRZoMye1IVI564JNrJl0BqUkI3lnGmzCUP77iK', 'Trần Thị Kế Toán', '0901234612', 9, 'staff', 'employee', 1),
('FIN003', 'finance.staff@company.com', '$2a$10$N9qo8uLOickgx2ZMRZoMye1IVI564JNrJl0BqUkI3lnGmzCUP77iK', 'Lê Văn Thu Quỹ', '0901234613', 9, 'staff', 'employee', 1);

-- Thêm nhân viên Engineering (phòng Engineering - 5 chưa có ai)
INSERT INTO users (employee_id, email, password, full_name, phone, department_id, position, role, is_active)
VALUES
('ENG001', 'eng.manager@company.com', '$2a$10$N9qo8uLOickgx2ZMRZoMye1IVI564JNrJl0BqUkI3lnGmzCUP77iK', 'Phạm Văn Kỹ Sư Trưởng', '0901234614', 5, 'manager', 'employee', 1),
('ENG002', 'eng.mechanic@company.com', '$2a$10$N9qo8uLOickgx2ZMRZoMye1IVI564JNrJl0BqUkI3lnGmzCUP77iK', 'Đỗ Văn Cơ Khí', '0901234615', 5, 'staff', 'employee', 1),
('ENG003', 'eng.electric@company.com', '$2a$10$N9qo8uLOickgx2ZMRZoMye1IVI564JNrJl0BqUkI3lnGmzCUP77iK', 'Hoàng Thị Điện Tử', '0901234616', 5, 'staff', 'employee', 1);

-- Thêm bảo vệ bổ sung
INSERT INTO users (employee_id, email, password, full_name, phone, department_id, position, role, is_active)
VALUES
('SEC002', 'security2@company.com', '$2a$10$ucSoOTsE.1zg7/gzNeLxPOvscPGAAd2K4T1ycZ1fQBfVJU.PbeIze', 'Trần Văn Bảo Vệ', '0901234617', NULL, 'staff', 'security', 1),
('SEC003', 'security3@company.com', '$2a$10$ucSoOTsE.1zg7/gzNeLxPOvscPGAAd2K4T1ycZ1fQBfVJU.PbeIze', 'Lê Thị Bảo Vệ', '0901234618', NULL, 'staff', 'security', 1);

-- =====================================================
-- PHẦN 3: TẠO PERMISSION CHO BẢO VỆ
-- =====================================================

-- Permission bảo vệ: Vào được hầu hết các cửa TRỪPHÒNG SERVER
INSERT INTO permissions (name, description, door_access_mode, time_restrictions, priority, is_active)
VALUES (
    'Security Guard Access',
    'Quyền truy cập cho bảo vệ - vào được các khu vực công cộng và phòng ban thường, KHÔNG vào phòng Server',
    'specific',
    NULL,  -- 24/7 access
    85,    -- Priority cao (dưới Full Access và Emergency)
    1
);

-- =====================================================
-- PHẦN 4: GÁN CÁC CỬA CHO PERMISSION BẢO VỆ
-- =====================================================

-- Lấy ID permission vừa tạo
SET @security_permission_id = LAST_INSERT_ID();

-- Gán tất cả các cửa TRỪPHÒNG SERVER (door_id = 6)
-- Danh sách cửa bảo vệ được vào:
INSERT INTO permission_doors (permission_id, door_id)
VALUES
(@security_permission_id, 1),   -- Cửa Sảnh Chính
(@security_permission_id, 2),   -- Cửa Phòng IT
(@security_permission_id, 3),   -- Cửa Phòng HR
(@security_permission_id, 4),   -- Cửa Phòng Sales
(@security_permission_id, 5),   -- Cửa Phòng Họp VIP
-- (@security_permission_id, 6),   -- Cửa Phòng Server - KHÔNG GÁN (bảo vệ không vào được)
(@security_permission_id, 7),   -- Cửa Bãi Đậu Xe
(@security_permission_id, 8),   -- Cửa Thoát Hiểm A
(@security_permission_id, 9),   -- Cửa Phòng Marketing
(@security_permission_id, 10),  -- Cửa Phòng Ăn
(@security_permission_id, 11),  -- Cửa Phòng Gym
(@security_permission_id, 12),  -- Cửa Thư Viện
(@security_permission_id, 13),  -- Cửa Kho Tài Liệu
(@security_permission_id, 17);  -- Cửa Phòng Testing

-- =====================================================
-- PHẦN 5: KIỂM TRA KẾT QUẢ
-- =====================================================

-- Kiểm tra nhân viên chưa có phòng ban
SELECT
    employee_id,
    full_name,
    position,
    role,
    department_id
FROM users
WHERE department_id IS NULL
ORDER BY employee_id;

-- Kiểm tra phân bố nhân viên theo phòng ban
SELECT
    d.id,
    d.name as department_name,
    COUNT(u.id) as employee_count,
    GROUP_CONCAT(u.full_name SEPARATOR ', ') as employees
FROM departments d
LEFT JOIN users u ON d.id = u.department_id
GROUP BY d.id, d.name
ORDER BY d.id;

-- Kiểm tra permission bảo vệ
SELECT
    p.id,
    p.name,
    p.description,
    p.priority,
    COUNT(pd.door_id) as door_count,
    GROUP_CONCAT(d.name SEPARATOR ', ') as allowed_doors
FROM permissions p
LEFT JOIN permission_doors pd ON p.id = pd.permission_id
LEFT JOIN doors d ON pd.door_id = d.id
WHERE p.name = 'Security Guard Access'
GROUP BY p.id, p.name, p.description, p.priority;

-- Kiểm tra cửa nào bảo vệ KHÔNG được vào
SELECT
    d.id,
    d.name as door_name,
    d.location
FROM doors d
WHERE d.id NOT IN (
    SELECT pd.door_id
    FROM permission_doors pd
    INNER JOIN permissions p ON pd.permission_id = p.id
    WHERE p.name = 'Security Guard Access'
)
AND d.is_active = 1
ORDER BY d.id;

-- =====================================================
-- LƯU Ý QUAN TRỌNG
-- =====================================================
/*
1. Password mặc định cho tất cả users: "123456" (đã hash bằng bcrypt)
2. Bảo vệ KHÔNG vào được:
   - Cửa Phòng Server (door_id = 6)
3. Bảo vệ VÀO được tất cả các cửa khác bao gồm:
   - Sảnh chính, phòng IT, HR, Sales, Marketing
   - Phòng họp VIP, bãi đậu xe, thoát hiểm
   - Phòng ăn, gym, thư viện, kho tài liệu
4. Nếu cần thêm/bớt cửa cho bảo vệ:
   - Thêm: INSERT INTO permission_doors VALUES (@security_permission_id, <door_id>);
   - Xóa: DELETE FROM permission_doors WHERE permission_id = @security_permission_id AND door_id = <door_id>;
*/
