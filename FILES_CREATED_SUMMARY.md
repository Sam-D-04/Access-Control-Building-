# 📦 TÓM TẮT CÁC FILE ĐÃ TẠO

## ✅ Danh sách files mới (sẵn sàng copy vào project):

### 1. **Database Migration**
📄 `backend/database/migrations/add_permission_tables.sql`
- Tạo 3 bảng: `permissions`, `card_permissions`, `door_required_permissions`
- Có data mẫu và hướng dẫn sử dụng
- **Chạy ngay:** `mysql -u root -p access_control < backend/database/migrations/add_permission_tables.sql`

### 2. **Model**
📄 `backend/src/models/Permission.js`
- Các function query database cho permissions
- Functions: `getCardPermissions()`, `assignPermissionToCard()`, `createPermission()`, v.v.
- **Không cần sửa gì**, copy trực tiếp vào project

### 3. **Controller**
📄 `backend/src/controllers/permissionController.js`
- API handlers cho permission management
- 11 handlers: create, update, delete, assign, remove, v.v.
- **Không cần sửa gì**, copy trực tiếp vào project

### 4. **Service (Logic phân quyền MỚI)**
📄 `backend/src/services/accessControlService_WITH_PERMISSIONS.js`
- Logic check permission dựa trên database
- Support override, extend, time restrictions, priority
- **Cần thay thế** file `accessControlService.js` cũ (sau khi backup)

### 5. **Routes**
📄 `backend/src/routes/PERMISSION_ROUTES_TO_ADD.js`
- 11 routes mới cho permission management
- **Copy vào** file `backend/src/routes/index.js` (có hướng dẫn chi tiết trong file)

### 6. **Documentation**
📄 `PERMISSION_SYSTEM_GUIDE.md`
- Hướng dẫn chi tiết cách sử dụng
- API endpoints với examples
- Use cases thực tế
- FAQ và troubleshooting

---

## 🚀 HƯỚNG DẪN CÀI ĐẶT NHANH (3 BƯỚC)

### Bước 1: Chạy SQL Migration
```bash
mysql -u root -p access_control < backend/database/migrations/add_permission_tables.sql
```

### Bước 2: Copy các files vào project

**Model:**
```bash
# File đã ở đúng vị trí, không cần di chuyển
# backend/src/models/Permission.js
```

**Controller:**
```bash
# File đã ở đúng vị trí, không cần di chuyển
# backend/src/controllers/permissionController.js
```

**Service (Backup và thay thế):**
```bash
# Backup file cũ
cp backend/src/services/accessControlService.js backend/src/services/accessControlService_OLD.js

# Thay thế bằng phiên bản mới
cp backend/src/services/accessControlService_WITH_PERMISSIONS.js backend/src/services/accessControlService.js
```

**Routes (Thêm vào file index.js):**

1. Mở `backend/src/routes/index.js`
2. Thêm import ở dòng ~11:
   ```javascript
   const permissionController = require('../controllers/permissionController');
   ```
3. Copy tất cả routes từ `PERMISSION_ROUTES_TO_ADD.js` vào sau CARD ROUTES

### Bước 3: Restart server
```bash
cd backend
npm run dev
```

---

## 🧪 TEST NHANH

### 1. Tạo permission template
```bash
curl -X POST http://localhost:3000/api/permissions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Permission",
    "door_access_mode": "all",
    "priority": 50
  }'
```

### 2. Gán permission cho card
```bash
curl -X POST http://localhost:3000/api/cards/1/permissions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"permission_id": 1}'
```

### 3. Kiểm tra permissions của card
```bash
curl -X GET http://localhost:3000/api/cards/1/permissions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Test access request
```bash
curl -X POST http://localhost:3000/api/access/request \
  -H "Content-Type: application/json" \
  -d '{
    "card_uid": "YOUR_CARD_UID",
    "door_id": 1
  }'
```

---

## 📋 CHECKLIST

Trước khi sử dụng, đảm bảo:
- [ ] Đã chạy SQL migration (3 bảng đã được tạo)
- [ ] File `Permission.js` đã có trong `models/`
- [ ] File `permissionController.js` đã có trong `controllers/`
- [ ] File `accessControlService.js` đã được thay thế (đã backup file cũ)
- [ ] Routes đã được thêm vào `routes/index.js`
- [ ] Import `permissionController` đã được thêm vào `routes/index.js`
- [ ] Server đã restart

---

## 🎯 TÍNH NĂNG CHÍNH

✅ **Permission Templates**: Tạo các mẫu phân quyền tái sử dụng
✅ **Card Permissions**: Gán nhiều permissions cho card
✅ **Override Mode**: Card có thể override danh sách cửa/time restrictions
✅ **Extend Mode**: Card có thể thêm cửa bổ sung (additional_door_ids)
✅ **Priority System**: Xử lý conflict khi card có nhiều permissions
✅ **Time Restrictions**: Giới hạn thời gian truy cập (giờ, ngày trong tuần)
✅ **Validity Period**: Permission có thể có thời hạn (valid_from/until)
✅ **Flexible Door Access**: 3 chế độ (all/specific/none)
✅ **Admin Override**: Admin/Security vẫn bypass tất cả
✅ **Legacy Fallback**: Nếu lỗi database → dùng logic cũ

---

## 📊 CẤU TRÚC DATABASE

```
permissions (Permission Templates)
├── id
├── name (unique)
├── description
├── door_access_mode (all/specific/none)
├── allowed_door_ids (JSON: [1,2,3])
├── time_restrictions (JSON: {start_time, end_time, allowed_days})
├── priority (INT)
└── is_active

card_permissions (Gán permissions cho cards)
├── id
├── card_id (FK)
├── permission_id (FK)
├── override_doors (BOOLEAN)
├── custom_door_ids (JSON: [1,2])
├── override_time (BOOLEAN)
├── custom_time_restrictions (JSON)
├── additional_door_ids (JSON: [7,8])
├── valid_from (DATETIME)
├── valid_until (DATETIME)
└── is_active
```

---

## 🔄 SO SÁNH CŨ VÀ MỚI

| | Cũ | Mới |
|---|---|---|
| **Phân quyền** | Hardcode trong code | Database-driven |
| **Tùy chỉnh** | Phải sửa code | API calls |
| **Tái sử dụng** | Không | Permission templates |
| **Thời hạn** | Không | Có (valid_from/until) |
| **Override** | Không | Có |
| **Priority** | Không | Có |
| **Testing** | Khó | Dễ dàng |

---

## 📞 SUPPORT

Nếu gặp lỗi, check:
1. Database tables có tồn tại không? `SHOW TABLES;`
2. Routes có được thêm vào `index.js` không?
3. Import controller có chính xác không?
4. Server có lỗi gì trong console không?
5. Token có hợp lệ không?

Đọc chi tiết tại: **PERMISSION_SYSTEM_GUIDE.md**

---

**🎉 Chúc bạn sử dụng thành công!**
