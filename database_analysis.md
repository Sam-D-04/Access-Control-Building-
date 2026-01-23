# Phân tích: Tách JSON thành bảng permission_doors

## 1. Vấn đề với thiết kế hiện tại (dùng JSON)

### Cấu trúc hiện tại:
```sql
CREATE TABLE `permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `allowed_door_ids` json DEFAULT NULL,  -- ❌ Vấn đề ở đây
  ...
)
```

### Nhược điểm:

#### A. **Không có ràng buộc tham chiếu (Referential Integrity)**
- ❌ Không thể tạo FOREIGN KEY constraint
- ❌ Nếu xóa door (id=5), các permission vẫn chứa `[1,2,5]` → dữ liệu không nhất quán
- ❌ Không có CASCADE DELETE tự động

#### B. **Hiệu năng truy vấn kém**
```sql
-- ❌ Query phức tạp và chậm
SELECT * FROM permissions
WHERE JSON_CONTAINS(allowed_door_ids, '5', '$');

-- ❌ Không thể tạo INDEX trên JSON field
-- ❌ Không thể JOIN trực tiếp với bảng doors
```

#### C. **Logic code phức tạp**
```javascript
// ❌ Phải parse JSON mỗi lần
const permission = await db.query('SELECT * FROM permissions WHERE id = ?', [1]);
const doorIds = JSON.parse(permission.allowed_door_ids); // [1, 2, 3]

// ❌ Kiểm tra quyền phức tạp
if (doorIds.includes(requestedDoorId)) {
  // granted
}

// ❌ Thêm door vào permission
doorIds.push(newDoorId);
await db.query('UPDATE permissions SET allowed_door_ids = ? WHERE id = ?',
  [JSON.stringify(doorIds), permissionId]);
```

#### D. **Khó bảo trì và mở rộng**
- ❌ Không thể query "Có bao nhiêu permission cho phép vào door X?"
- ❌ Không thể query "Permission nào cho phép vào nhiều cửa nhất?"
- ❌ Khó thêm metadata (ví dụ: thời gian hiệu lực riêng cho từng cửa)

---

## 2. Giải pháp: Tạo bảng permission_doors (N:M)

### Cấu trúc mới:

```sql
-- Bảng permissions (đã tối ưu)
CREATE TABLE `permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL UNIQUE,
  `description` text,
  `door_access_mode` enum('all','specific','none') DEFAULT 'specific',
  -- ❌ XÓA: allowed_door_ids json
  `time_restrictions` json DEFAULT NULL,
  `priority` int DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ✅ Bảng trung gian MỚI
CREATE TABLE `permission_doors` (
  `id` int NOT NULL AUTO_INCREMENT,
  `permission_id` int NOT NULL COMMENT 'FK tới permissions',
  `door_id` int NOT NULL COMMENT 'FK tới doors',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_permission_door` (`permission_id`, `door_id`),
  KEY `idx_permission` (`permission_id`),
  KEY `idx_door` (`door_id`),
  CONSTRAINT `fk_permission_doors_permission`
    FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_permission_doors_door`
    FOREIGN KEY (`door_id`) REFERENCES `doors` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Quan hệ N:M giữa permissions và doors';
```

### Ưu điểm:

#### A. **Ràng buộc tham chiếu chặt chẽ**
- ✅ FOREIGN KEY đảm bảo door_id luôn hợp lệ
- ✅ CASCADE DELETE tự động: Xóa door → xóa tất cả liên kết
- ✅ Không thể insert door_id không tồn tại

#### B. **Hiệu năng cao**
```sql
-- ✅ Query đơn giản và nhanh
SELECT d.*
FROM doors d
JOIN permission_doors pd ON d.id = pd.door_id
WHERE pd.permission_id = 5;

-- ✅ Có INDEX, query rất nhanh
-- ✅ JOIN trực tiếp giữa các bảng
```

#### C. **Logic code đơn giản**
```javascript
// ✅ Kiểm tra quyền đơn giản
const hasAccess = await db.query(`
  SELECT 1 FROM permission_doors
  WHERE permission_id = ? AND door_id = ?
`, [permissionId, doorId]);

if (hasAccess.length > 0) {
  // granted
}

// ✅ Thêm door vào permission
await db.query(`
  INSERT INTO permission_doors (permission_id, door_id)
  VALUES (?, ?)
`, [permissionId, doorId]);

// ✅ Xóa door khỏi permission
await db.query(`
  DELETE FROM permission_doors
  WHERE permission_id = ? AND door_id = ?
`, [permissionId, doorId]);
```

#### D. **Dễ mở rộng**
```sql
-- ✅ Query thống kê dễ dàng
-- Đếm số permission cho phép vào door X
SELECT COUNT(*) FROM permission_doors WHERE door_id = 5;

-- Permission nào cho phép nhiều cửa nhất?
SELECT permission_id, COUNT(*) as door_count
FROM permission_doors
GROUP BY permission_id
ORDER BY door_count DESC;

-- Doors nào được nhiều permission nhất?
SELECT door_id, COUNT(*) as permission_count
FROM permission_doors
GROUP BY door_id
ORDER BY permission_count DESC;
```

---

## 3. So sánh trực quan

### Dữ liệu mẫu:

**Thiết kế CŨ (JSON):**
```
permissions:
id | name          | allowed_door_ids
1  | Office Hours  | [1, 2, 3, 4]
2  | VIP Access    | [1, 2, 3, 4, 5, 6]
3  | Night Shift   | [1, 7, 8]
```

**Thiết kế MỚI (Bảng trung gian):**
```
permissions:
id | name          | door_access_mode
1  | Office Hours  | specific
2  | VIP Access    | specific
3  | Night Shift   | specific

permission_doors:
id | permission_id | door_id
1  | 1             | 1
2  | 1             | 2
3  | 1             | 3
4  | 1             | 4
5  | 2             | 1
6  | 2             | 2
7  | 2             | 3
8  | 2             | 4
9  | 2             | 5
10 | 2             | 6
11 | 3             | 1
12 | 3             | 7
13 | 3             | 8
```

---

## 4. Thay đổi Logic Code

### A. Kiểm tra quyền truy cập (checkAccess)

#### Code CŨ (JSON):
```javascript
async function checkAccess(userId, doorId) {
  // 1. Lấy permission của user (giả sử user có permission_id)
  const user = await db.query(
    'SELECT permission_id FROM users WHERE id = ?',
    [userId]
  );

  // 2. Lấy permission
  const permission = await db.query(
    'SELECT door_access_mode, allowed_door_ids FROM permissions WHERE id = ?',
    [user.permission_id]
  );

  // 3. Kiểm tra mode
  if (permission.door_access_mode === 'all') {
    return true;
  }

  if (permission.door_access_mode === 'none') {
    return false;
  }

  // 4. Parse JSON và kiểm tra
  const allowedDoors = JSON.parse(permission.allowed_door_ids) || [];
  return allowedDoors.includes(doorId);
}
```

#### Code MỚI (Bảng trung gian):
```javascript
async function checkAccess(userId, doorId) {
  // 1. Lấy permission của user
  const user = await db.query(
    'SELECT permission_id FROM users WHERE id = ?',
    [userId]
  );

  // 2. Lấy permission mode
  const permission = await db.query(
    'SELECT door_access_mode FROM permissions WHERE id = ?',
    [user.permission_id]
  );

  // 3. Kiểm tra mode
  if (permission.door_access_mode === 'all') {
    return true;
  }

  if (permission.door_access_mode === 'none') {
    return false;
  }

  // 4. Kiểm tra trong bảng permission_doors (đơn giản hơn)
  const access = await db.query(`
    SELECT 1 FROM permission_doors
    WHERE permission_id = ? AND door_id = ?
    LIMIT 1
  `, [user.permission_id, doorId]);

  return access.length > 0;
}
```

### B. Lấy danh sách cửa được phép

#### Code CŨ (JSON):
```javascript
async function getAllowedDoors(permissionId) {
  const permission = await db.query(
    'SELECT door_access_mode, allowed_door_ids FROM permissions WHERE id = ?',
    [permissionId]
  );

  if (permission.door_access_mode === 'all') {
    // Lấy tất cả doors
    return await db.query('SELECT * FROM doors WHERE is_active = 1');
  }

  if (permission.door_access_mode === 'none') {
    return [];
  }

  // Parse JSON
  const doorIds = JSON.parse(permission.allowed_door_ids) || [];

  // Query với IN clause
  if (doorIds.length === 0) return [];

  return await db.query(
    `SELECT * FROM doors WHERE id IN (${doorIds.join(',')}) AND is_active = 1`
  );
}
```

#### Code MỚI (Bảng trung gian):
```javascript
async function getAllowedDoors(permissionId) {
  const permission = await db.query(
    'SELECT door_access_mode FROM permissions WHERE id = ?',
    [permissionId]
  );

  if (permission.door_access_mode === 'all') {
    return await db.query('SELECT * FROM doors WHERE is_active = 1');
  }

  if (permission.door_access_mode === 'none') {
    return [];
  }

  // JOIN trực tiếp - đơn giản và hiệu quả
  return await db.query(`
    SELECT d.*
    FROM doors d
    INNER JOIN permission_doors pd ON d.id = pd.door_id
    WHERE pd.permission_id = ? AND d.is_active = 1
  `, [permissionId]);
}
```

### C. Thêm/Xóa door khỏi permission

#### Code CŨ (JSON):
```javascript
// Thêm door
async function addDoorToPermission(permissionId, doorId) {
  const permission = await db.query(
    'SELECT allowed_door_ids FROM permissions WHERE id = ?',
    [permissionId]
  );

  let doorIds = JSON.parse(permission.allowed_door_ids) || [];

  if (!doorIds.includes(doorId)) {
    doorIds.push(doorId);
  }

  await db.query(
    'UPDATE permissions SET allowed_door_ids = ? WHERE id = ?',
    [JSON.stringify(doorIds), permissionId]
  );
}

// Xóa door
async function removeDoorFromPermission(permissionId, doorId) {
  const permission = await db.query(
    'SELECT allowed_door_ids FROM permissions WHERE id = ?',
    [permissionId]
  );

  let doorIds = JSON.parse(permission.allowed_door_ids) || [];
  doorIds = doorIds.filter(id => id !== doorId);

  await db.query(
    'UPDATE permissions SET allowed_door_ids = ? WHERE id = ?',
    [JSON.stringify(doorIds), permissionId]
  );
}
```

#### Code MỚI (Bảng trung gian):
```javascript
// Thêm door - CỰC KỲ đơn giản
async function addDoorToPermission(permissionId, doorId) {
  await db.query(`
    INSERT IGNORE INTO permission_doors (permission_id, door_id)
    VALUES (?, ?)
  `, [permissionId, doorId]);
  // INSERT IGNORE: Nếu đã tồn tại thì bỏ qua (do UNIQUE constraint)
}

// Xóa door - CỰC KỲ đơn giản
async function removeDoorFromPermission(permissionId, doorId) {
  await db.query(`
    DELETE FROM permission_doors
    WHERE permission_id = ? AND door_id = ?
  `, [permissionId, doorId]);
}
```

### D. API Endpoints thay đổi

#### API: Cập nhật permission

**CŨ:**
```javascript
// PUT /api/permissions/:id
router.put('/permissions/:id', async (req, res) => {
  const { name, door_access_mode, allowed_door_ids } = req.body;

  // Validate door_ids
  if (door_access_mode === 'specific') {
    // Phải parse và validate JSON
    const doorIds = JSON.parse(allowed_door_ids);
    // Kiểm tra từng door có tồn tại không
    for (let doorId of doorIds) {
      const door = await db.query('SELECT 1 FROM doors WHERE id = ?', [doorId]);
      if (!door) {
        return res.status(400).json({ error: 'Invalid door_id' });
      }
    }
  }

  await db.query(`
    UPDATE permissions
    SET name = ?, door_access_mode = ?, allowed_door_ids = ?
    WHERE id = ?
  `, [name, door_access_mode, JSON.stringify(allowed_door_ids), req.params.id]);

  res.json({ success: true });
});
```

**MỚI:**
```javascript
// PUT /api/permissions/:id
router.put('/permissions/:id', async (req, res) => {
  const { name, door_access_mode, door_ids } = req.body;

  // Start transaction
  await db.query('START TRANSACTION');

  try {
    // Update permission
    await db.query(`
      UPDATE permissions
      SET name = ?, door_access_mode = ?
      WHERE id = ?
    `, [name, door_access_mode, req.params.id]);

    // Nếu mode = specific, cập nhật permission_doors
    if (door_access_mode === 'specific' && door_ids) {
      // Xóa tất cả liên kết cũ
      await db.query(
        'DELETE FROM permission_doors WHERE permission_id = ?',
        [req.params.id]
      );

      // Thêm liên kết mới (FK tự động validate door_id)
      for (let doorId of door_ids) {
        await db.query(`
          INSERT INTO permission_doors (permission_id, door_id)
          VALUES (?, ?)
        `, [req.params.id, doorId]);
      }
    }

    await db.query('COMMIT');
    res.json({ success: true });

  } catch (error) {
    await db.query('ROLLBACK');
    // FK constraint tự động báo lỗi nếu door_id không hợp lệ
    res.status(400).json({ error: error.message });
  }
});
```

---

## 5. Migration Script

```sql
-- Script chuyển đổi từ JSON sang bảng permission_doors

-- Bước 1: Tạo bảng mới
CREATE TABLE `permission_doors` (
  `id` int NOT NULL AUTO_INCREMENT,
  `permission_id` int NOT NULL,
  `door_id` int NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_permission_door` (`permission_id`, `door_id`),
  CONSTRAINT `fk_permission_doors_permission`
    FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_permission_doors_door`
    FOREIGN KEY (`door_id`) REFERENCES `doors` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bước 2: Migrate dữ liệu từ JSON sang bảng mới
-- (Cần script bên ngoài để parse JSON và insert)

-- Bước 3: Xóa cột JSON
ALTER TABLE permissions DROP COLUMN allowed_door_ids;
```

---

## 6. Kết luận

### ✅ Nên chuyển sang bảng permission_doors vì:

1. **Tính toàn vẹn dữ liệu**: FOREIGN KEY + CASCADE
2. **Hiệu năng**: INDEX + JOIN nhanh hơn JSON parsing
3. **Code đơn giản**: Ít bug, dễ maintain
4. **Mở rộng**: Dễ thêm metadata (expired_at, notes...)
5. **Query phong phú**: Dễ dàng thống kê và phân tích

### ⚠️ Trade-off:

- Số lượng record tăng (1 permission có 10 doors → 10 records)
- Phải dùng JOIN (nhưng với INDEX thì rất nhanh)
- Migration dữ liệu cũ cần script

### 🎯 Kết luận cuối cùng:

**CHẮC CHẮN nên tách thành bảng riêng!** Đây là best practice trong database design.
