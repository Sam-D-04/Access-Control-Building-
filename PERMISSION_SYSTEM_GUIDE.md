# 📋 HƯỚNG DẪN HỆ THỐNG PHÂN QUYỀN (PERMISSION SYSTEM)

> **Hệ thống phân quyền dựa trên Database cho Access Control Building**
> Giúp quản lý quyền truy cập linh hoạt, tái sử dụng và dễ bảo trì.

---

## 📚 MỤC LỤC

1. [Tổng quan](#tổng-quan)
2. [Cài đặt](#cài-đặt)
3. [Cấu trúc Database](#cấu-trúc-database)
4. [API Endpoints](#api-endpoints)
5. [Ví dụ sử dụng](#ví-dụ-sử-dụng)
6. [Use Cases](#use-cases)
7. [Testing](#testing)

---

## 🎯 TỔNG QUAN

### Vấn đề cũ:
- Logic phân quyền **hardcode** trong code
- Khó tùy chỉnh quyền cho từng card cụ thể
- Không tái sử dụng được các quy tắc phân quyền
- Muốn thay đổi phải sửa code và deploy lại

### Giải pháp mới:
✅ **Permission Templates**: Tạo các mẫu phân quyền tái sử dụng
✅ **Card Permissions**: Gán nhiều permissions cho card, có thể override/extend
✅ **Priority System**: Hệ thống ưu tiên khi có nhiều permissions
✅ **Time Restrictions**: Giới hạn thời gian cho từng permission
✅ **Flexible Door Access**: Chỉ định cụ thể cửa nào được phép

---

## 🛠️ CÀI ĐẶT

### Bước 1: Tạo Database Tables

```bash
# Chạy file SQL migration
mysql -u root -p access_control < backend/database/migrations/add_permission_tables.sql

# Hoặc copy SQL và chạy trong MySQL Workbench/phpMyAdmin
```

File SQL sẽ tạo 3 bảng:
- `permissions` - Permission templates
- `card_permissions` - Gán permissions cho cards
- `door_required_permissions` - (Optional) Quy định cửa cần permissions gì

### Bước 2: Thêm Routes

Mở file `backend/src/routes/index.js`:

**Thêm import controller** (dòng ~11):
```javascript
const permissionController = require('../controllers/permissionController');
```

**Copy routes** từ file `backend/src/routes/PERMISSION_ROUTES_TO_ADD.js` vào sau CARD ROUTES:
```javascript
// PERMISSION ROUTES - /api/permissions
router.get('/permissions', authenticateToken, requireRole('admin'), permissionController.getAllPermissionsHandler);
router.get('/permissions/:id', authenticateToken, requireRole('admin'), permissionController.getPermissionByIdHandler);
router.post('/permissions', authenticateToken, requireRole('admin'), permissionController.createPermissionHandler);
// ... (copy tất cả routes)
```

### Bước 3: Thay thế Access Control Service

⚠️ **QUAN TRỌNG: Backup file cũ trước!**

```bash
# Backup file cũ
cp backend/src/services/accessControlService.js backend/src/services/accessControlService_OLD.js

# Thay thế bằng phiên bản mới
cp backend/src/services/accessControlService_WITH_PERMISSIONS.js backend/src/services/accessControlService.js
```

### Bước 4: Restart Server

```bash
cd backend
npm run dev
```

---

## 🗄️ CẤU TRÚC DATABASE

### Bảng `permissions` - Permission Templates

| Field | Type | Description |
|-------|------|-------------|
| `id` | INT | Primary key |
| `name` | VARCHAR(100) | Tên permission (unique) |
| `description` | TEXT | Mô tả |
| `door_access_mode` | ENUM('all', 'specific', 'none') | Chế độ truy cập cửa |
| `allowed_door_ids` | JSON | Danh sách door_id: `[1,2,3]` |
| `time_restrictions` | JSON | Giới hạn thời gian (xem format bên dưới) |
| `priority` | INT | Độ ưu tiên (cao hơn = ưu tiên hơn) |
| `is_active` | BOOLEAN | Trạng thái hoạt động |

**Format `time_restrictions`:**
```json
{
  "start_time": "07:00",
  "end_time": "21:00",
  "allowed_days": [1, 2, 3, 4, 5, 6]
}
```
- `allowed_days`: 0=CN, 1=T2, 2=T3, ..., 6=T7

### Bảng `card_permissions` - Gán Permissions

| Field | Type | Description |
|-------|------|-------------|
| `id` | INT | Primary key |
| `card_id` | INT | FK to cards |
| `permission_id` | INT | FK to permissions |
| `override_doors` | BOOLEAN | Override danh sách cửa? |
| `custom_door_ids` | JSON | Danh sách cửa custom: `[1,2]` |
| `override_time` | BOOLEAN | Override giới hạn thời gian? |
| `custom_time_restrictions` | JSON | Time restrictions custom |
| `additional_door_ids` | JSON | Cửa bổ sung thêm: `[7,8]` |
| `valid_from` | DATETIME | Bắt đầu hiệu lực |
| `valid_until` | DATETIME | Hết hiệu lực |
| `is_active` | BOOLEAN | Trạng thái |

---

## 🌐 API ENDPOINTS

### Permission Templates Management

#### 1️⃣ Lấy tất cả permissions
```http
GET /api/permissions?active_only=true
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Full Access",
      "description": "Quyền truy cập không giới hạn",
      "door_access_mode": "all",
      "allowed_door_ids": null,
      "time_restrictions": null,
      "priority": 100,
      "is_active": true
    }
  ],
  "count": 1
}
```

#### 2️⃣ Tạo permission mới
```http
POST /api/permissions
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Office Hours Access",
  "description": "Truy cập giờ hành chính",
  "door_access_mode": "all",
  "time_restrictions": {
    "start_time": "08:00",
    "end_time": "18:00",
    "allowed_days": [1, 2, 3, 4, 5]
  },
  "priority": 50,
  "is_active": true
}
```

#### 3️⃣ Cập nhật permission
```http
PUT /api/permissions/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Updated Name",
  "priority": 60
}
```

#### 4️⃣ Xóa permission
```http
DELETE /api/permissions/:id?hard_delete=false
Authorization: Bearer {token}
```
- `hard_delete=true`: Xóa hẳn khỏi database
- `hard_delete=false`: Chỉ set `is_active = false`

---

### Card Permission Assignment

#### 5️⃣ Lấy permissions của card
```http
GET /api/cards/:cardId/permissions
Authorization: Bearer {token}
```

#### 6️⃣ Gán permission cho card
```http
POST /api/cards/:cardId/permissions
Authorization: Bearer {token}
Content-Type: application/json

{
  "permission_id": 2,
  "is_active": true
}
```

**Gán với override:**
```json
{
  "permission_id": 3,
  "override_doors": true,
  "custom_door_ids": [1, 2, 5],
  "is_active": true
}
```

**Gán với additional doors:**
```json
{
  "permission_id": 4,
  "additional_door_ids": [7, 8],
  "valid_from": "2025-01-01 00:00:00",
  "valid_until": "2025-12-31 23:59:59",
  "is_active": true
}
```

#### 7️⃣ Cập nhật card_permission
```http
PUT /api/card-permissions/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "additional_door_ids": [9, 10],
  "valid_until": "2026-12-31 23:59:59"
}
```

#### 8️⃣ Xóa permission khỏi card
```http
DELETE /api/card-permissions/:id
Authorization: Bearer {token}
```

#### 9️⃣ Xóa TẤT CẢ permissions của card
```http
DELETE /api/cards/:cardId/permissions
Authorization: Bearer {token}
```

---

## 💡 VÍ DỤ SỬ DỤNG

### Scenario 1: Nhân viên thường

**Tạo permission "Office Hours":**
```bash
curl -X POST http://localhost:3000/api/permissions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Office Hours Access",
    "description": "Truy cập giờ hành chính T2-T6",
    "door_access_mode": "all",
    "time_restrictions": {
      "start_time": "08:00",
      "end_time": "18:00",
      "allowed_days": [1,2,3,4,5]
    },
    "priority": 50
  }'
```

**Gán cho card_id = 5:**
```bash
curl -X POST http://localhost:3000/api/cards/5/permissions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "permission_id": 2
  }'
```

### Scenario 2: Giám đốc - Full Access

**Tạo permission "Director Access":**
```bash
curl -X POST http://localhost:3000/api/permissions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Director Full Access",
    "description": "Quyền cao nhất, không giới hạn",
    "door_access_mode": "all",
    "time_restrictions": null,
    "priority": 100
  }'
```

### Scenario 3: Nhân viên bảo vệ - 24/7 một số cửa

**Tạo permission "Security Access":**
```bash
curl -X POST http://localhost:3000/api/permissions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Security 24/7",
    "description": "Bảo vệ - cửa 1,2,10 24/7",
    "door_access_mode": "specific",
    "allowed_door_ids": [1, 2, 10],
    "time_restrictions": null,
    "priority": 90
  }'
```

### Scenario 4: Thực tập sinh - Có thầy mới vào được

**Gán permission "Office Hours" nhưng chỉ cho phép cửa 1 (cửa chính):**
```bash
curl -X POST http://localhost:3000/api/cards/10/permissions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "permission_id": 2,
    "override_doors": true,
    "custom_door_ids": [1]
  }'
```

### Scenario 5: Nhân viên tạm thời - Chỉ 3 tháng

**Gán permission có thời hạn:**
```bash
curl -X POST http://localhost:3000/api/cards/15/permissions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "permission_id": 2,
    "valid_from": "2025-01-01 00:00:00",
    "valid_until": "2025-03-31 23:59:59"
  }'
```

---

## 🎯 USE CASES

### 1. Nhân viên thăng chức

**Trước:** Phải sửa code logic hardcode
**Sau:**
```bash
# Gán thêm permission "Manager Access" cho card
curl -X POST http://localhost:3000/api/cards/20/permissions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"permission_id": 5}'
```

### 2. Dự án đặc biệt - Cần vào phòng Server tạm thời

**Trước:** Phải thêm logic đặc biệt trong code
**Sau:**
```bash
# Gán permission "Server Room" có thời hạn 1 tuần
curl -X POST http://localhost:3000/api/cards/25/permissions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "permission_id": 7,
    "valid_from": "2025-06-01 08:00:00",
    "valid_until": "2025-06-07 18:00:00"
  }'
```

### 3. Thay đổi giờ làm việc công ty

**Trước:** Sửa hardcode `if (currentHour < 7 || currentHour > 21)`
**Sau:**
```bash
# Cập nhật permission template
curl -X PUT http://localhost:3000/api/permissions/2 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "time_restrictions": {
      "start_time": "07:30",
      "end_time": "20:00",
      "allowed_days": [1,2,3,4,5,6]
    }
  }'
```

### 4. Thêm cửa mới - Chỉ Manager trở lên

**Trước:** Phải sửa code và deploy
**Sau:**
```bash
# Cập nhật permission "Manager Access" thêm door_id mới
curl -X PUT http://localhost:3000/api/permissions/5 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "allowed_door_ids": [3, 4, 5, 11]
  }'
```

---

## 🧪 TESTING

### Test 1: Kiểm tra card có permissions

```bash
# Lấy permissions của card_id = 1
curl -X GET http://localhost:3000/api/cards/1/permissions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test 2: Thử truy cập (request access)

```bash
# POST /api/access/request
curl -X POST http://localhost:3000/api/access/request \
  -H "Content-Type: application/json" \
  -d '{
    "card_uid": "ABC123",
    "door_id": 1
  }'
```

**Kết quả mong đợi:**
- ✅ `granted: true` nếu card có permission hợp lệ
- ❌ `granted: false` với lý do cụ thể

### Test 3: Kiểm tra logs

```bash
# Xem access logs
curl -X GET http://localhost:3000/api/access/logs \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🔍 SO SÁNH CŨ VÀ MỚI

| Tính năng | Cũ (Hardcode) | Mới (Permission System) |
|-----------|---------------|------------------------|
| **Thêm quy tắc mới** | Sửa code, deploy | Tạo permission qua API |
| **Tùy chỉnh cho card** | Không thể | Override/extend dễ dàng |
| **Giới hạn thời gian** | Hardcode 7h-21h | Linh hoạt per permission |
| **Tái sử dụng** | Không | Có (permission templates) |
| **Độ ưu tiên** | Không | Có (priority field) |
| **Thời hạn hiệu lực** | Không | Có (valid_from/until) |
| **Testing** | Khó | Dễ (query trực tiếp DB) |

---

## 📝 LƯU Ý

### 1. Admin và Security bypass tất cả
```javascript
// Trong accessControlService.js
if (user.role === 'admin' || user.role === 'security') {
    return { granted: true }; // Luôn cho phép
}
```

### 2. Priority cao hơn = ưu tiên hơn
Nếu card có nhiều permissions:
- Check theo thứ tự `priority DESC`
- Permission đầu tiên cho phép → granted
- Tất cả đều không cho phép → denied

### 3. Legacy fallback
Nếu có lỗi database, hệ thống sẽ fallback về logic cũ (hardcode) để đảm bảo an toàn.

### 4. Database indexes
Các index đã được tạo sẵn để tối ưu performance:
- `card_id` trong `card_permissions`
- `permission_id` trong `card_permissions`
- `name` trong `permissions`

---

## 🚀 NEXT STEPS

### Tính năng nâng cao có thể thêm:

1. **Permission Groups**: Nhóm nhiều permissions lại
2. **Role-based Permissions**: Gán permission theo role (auto-assign)
3. **Time-limited Override**: Override tạm thời (VD: khẩn cấp)
4. **Audit Trail**: Log mọi thay đổi permissions
5. **Permission Templates Library**: Thư viện mẫu có sẵn
6. **Bulk Operations**: Gán permissions hàng loạt
7. **Conditional Permissions**: Permissions phụ thuộc điều kiện (VD: cần 2FA)

---

## ❓ FAQ

**Q: Card có nhiều permissions, cái nào được ưu tiên?**
A: Check theo `priority` từ cao xuống thấp. Permission đầu tiên cho phép → granted.

**Q: Nếu xóa permission, card có permission đó sẽ như thế nào?**
A: Nếu `soft delete` (is_active=false), card vẫn giữ assignment nhưng không áp dụng. Nếu `hard delete`, assignment cũng bị xóa (CASCADE).

**Q: Có thể gán nhiều permissions cùng lúc không?**
A: Có, gọi API `POST /api/cards/:cardId/permissions` nhiều lần với `permission_id` khác nhau.

**Q: Override vs Additional, khác nhau thế nào?**
A:
- **Override**: Thay thế hoàn toàn danh sách cửa/time từ permission gốc
- **Additional**: Thêm vào (extend) danh sách cửa từ permission gốc

**Q: Performance có ảnh hưởng không?**
A: Mỗi request access sẽ query thêm 1 lần database để lấy permissions. Với database được index tốt và connection pool, impact là minimal (<10ms).

---

## 📞 HỖ TRỢ

Nếu gặp vấn đề, kiểm tra:
1. ✅ Database tables đã được tạo chưa
2. ✅ Routes đã được thêm vào `index.js` chưa
3. ✅ `accessControlService.js` đã được thay thế chưa
4. ✅ Server đã restart chưa
5. ✅ Check logs: `console.error()` trong các controller

---

**Chúc bạn triển khai thành công! 🎉**
