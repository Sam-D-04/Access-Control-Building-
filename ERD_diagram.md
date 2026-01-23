# Entity Relationship Diagram - Hệ thống Kiểm Soát Ra Vào Tòa Nhà

## Tổng quan các thực thể (Entities)

### 1. **users** (Người dùng)
- **Khóa chính**: id
- **Thuộc tính**:
  - employee_id (UNIQUE)
  - email (UNIQUE)
  - password
  - full_name
  - phone
  - avatar
  - department_id (FK)
  - position: (staff, manager, director)
  - role: (admin, security, employee)
  - is_active
  - created_at, updated_at

### 2. **departments** (Phòng ban)
- **Khóa chính**: id
- **Thuộc tính**:
  - name (UNIQUE)
  - parent_id (FK - tự tham chiếu)
  - description
  - level (0=root, 1=level 1...)
  - created_at

### 3. **cards** (Thẻ RFID)
- **Khóa chính**: id
- **Thuộc tính**:
  - card_uid (UNIQUE - Mã thẻ RFID)
  - user_id (FK)
  - is_active
  - issued_at
  - expired_at
  - notes
  - created_at, updated_at

### 4. **doors** (Cửa)
- **Khóa chính**: id
- **Thuộc tính**:
  - name
  - location
  - department_id (FK)
  - is_locked (Khóa khẩn cấp)
  - is_active
  - created_at, updated_at

### 5. **permissions** (Quyền truy cập)
- **Khóa chính**: id
- **Thuộc tính**:
  - name (UNIQUE)
  - description
  - door_access_mode: (all, specific, none)
  - allowed_door_ids (JSON - danh sách door_id)
  - time_restrictions (JSON - giới hạn thời gian)
  - priority
  - is_active
  - created_at, updated_at

### 6. **access_logs** (Nhật ký truy cập)
- **Khóa chính**: id
- **Thuộc tính**:
  - card_id (FK)
  - user_id (FK)
  - door_id (FK)
  - access_time
  - status: (granted, denied)
  - denial_reason
  - created_at

### 7. **door_departments** (Quan hệ Cửa-Phòng ban)
- **Khóa chính**: id
- **Thuộc tính**:
  - door_id (FK)
  - department_id (FK)
  - created_at
- **Ràng buộc**: UNIQUE(door_id, department_id)

### 8. **visitor_photos** (Ảnh khách thăm)
- **Khóa chính**: id
- **Thuộc tính**:
  - photo_path (check-in)
  - checkout_photo_path
  - notes
  - captured_at
  - is_checkout
  - time_out
  - created_at

---

## Sơ đồ ERD với ký hiệu mối quan hệ

```
                                    departments
                                    ┌─────────────────┐
                                    │ id (PK)         │
                         ┌──────────│ name            │
                         │          │ parent_id (FK)  │◄───┐
                         │          │ description     │    │ 0..1
                         │          │ level           │    │ (parent)
                         │          └─────────────────┘    │
                         │                   │              │
                         │ 0..1              │ 1            │
                         │                   │              │
                         │                   │              │
                    users│                   │              │
         ┌───────────────┴──────┐            │              │
         │ id (PK)              │            │              │
         │ employee_id (UNIQUE) │            │              │
         │ email (UNIQUE)       │            │ *            │
         │ full_name            │            │              │
         │ department_id (FK)   │────────────┘              │
         │ position             │                           │
         │ role                 │                           │
         │ is_active            │                           │
         └──────┬───────────────┘                           │
                │                                            │
                │ 1                                          │
                │                                            │
                │ *                                          │
         ┌──────┴────────────┐                              │
         │ cards             │                              │
         │ ┌───────────────┐ │                              │
         │ │ id (PK)       │ │                              │
         │ │ card_uid      │ │                              │
         │ │ user_id (FK)  │ │                              │
         │ │ is_active     │ │                              │
         │ │ issued_at     │ │                              │
         │ │ expired_at    │ │                              │
         │ └───────────────┘ │                              │
         └──────┬────────────┘                              │
                │                                            │
                │ 0..1                                       │
                │                                            │
                │ *                                          │
         ┌──────┴────────────────┐                          │
         │ access_logs           │                          │
         │ ┌───────────────────┐ │                          │
         │ │ id (PK)           │ │                          │
         │ │ card_id (FK)      │ │                          │
         │ │ user_id (FK)      │─┼──────────────────────────┘
         │ │ door_id (FK)      │ │          0..1
         │ │ access_time       │ │
         │ │ status            │ │
         │ │ denial_reason     │ │
         │ └───────────────────┘ │
         └───────────┬───────────┘
                     │
                     │ *
                     │
                     │ 1
              ┌──────┴──────┐
              │ doors       │
              │ ┌─────────┐ │
              │ │ id (PK) │ │◄────────┐
              │ │ name    │ │         │
              │ │ location│ │         │
              │ │ dept_id │─┼─────┐   │
              │ │(FK)     │ │     │   │
              │ │is_locked│ │     │   │
              │ └─────────┘ │     │   │
              └─────────────┘     │   │
                                  │   │
                         0..1     │   │ *
                                  │   │
                                  │   │ 1
                    ┌─────────────┴───┴──────────────┐
                    │ door_departments              │
                    │ ┌───────────────────────────┐ │
                    │ │ id (PK)                   │ │
                    │ │ door_id (FK)              │ │
                    │ │ department_id (FK)        │ │
                    │ │ UNIQUE(door_id, dept_id)  │ │
                    │ └───────────────────────────┘ │
                    └───────────────────────────────┘


              ┌─────────────────────┐
              │ permissions         │
              │ ┌─────────────────┐ │
              │ │ id (PK)         │ │
              │ │ name (UNIQUE)   │ │
              │ │ description     │ │
              │ │ door_access_mode│ │
              │ │ allowed_door_ids│ │ (JSON)
              │ │ time_restrictions│ │ (JSON)
              │ │ priority        │ │
              │ └─────────────────┘ │
              └─────────────────────┘


              ┌──────────────────────┐
              │ visitor_photos       │
              │ ┌──────────────────┐ │
              │ │ id (PK)          │ │
              │ │ photo_path       │ │
              │ │ checkout_photo   │ │
              │ │ notes            │ │
              │ │ captured_at      │ │
              │ │ is_checkout      │ │
              │ │ time_out         │ │
              │ └──────────────────┘ │
              └──────────────────────┘
```

---

## Chi tiết các mối quan hệ

### 1. **users** ──── **departments** (N:1)
- **Quan hệ**: Nhiều users thuộc 1 department
- **Ký hiệu**: users(*) ──────── (1) departments
- **FK**: users.department_id → departments.id
- **ON DELETE**: SET NULL

### 2. **departments** ──── **departments** (N:1) - Tự tham chiếu
- **Quan hệ**: Phân cấp phòng ban (parent-child)
- **Ký hiệu**: departments(*) ──────── (0..1) departments (parent)
- **FK**: departments.parent_id → departments.id
- **ON DELETE**: CASCADE

### 3. **users** ──── **cards** (1:N)
- **Quan hệ**: 1 user có thể có nhiều thẻ
- **Ký hiệu**: users(1) ──────── (*) cards
- **FK**: cards.user_id → users.id
- **ON DELETE**: SET NULL

### 4. **cards** ──── **access_logs** (1:N)
- **Quan hệ**: 1 thẻ có nhiều lần truy cập
- **Ký hiệu**: cards(0..1) ──────── (*) access_logs
- **FK**: access_logs.card_id → cards.id
- **ON DELETE**: SET NULL

### 5. **users** ──── **access_logs** (1:N)
- **Quan hệ**: 1 user có nhiều lần truy cập
- **Ký hiệu**: users(0..1) ──────── (*) access_logs
- **FK**: access_logs.user_id → users.id
- **ON DELETE**: SET NULL

### 6. **doors** ──── **access_logs** (1:N)
- **Quan hệ**: 1 cửa có nhiều lần truy cập
- **Ký hiệu**: doors(1) ──────── (*) access_logs
- **FK**: access_logs.door_id → doors.id
- **ON DELETE**: CASCADE

### 7. **departments** ──── **doors** (1:N)
- **Quan hệ**: 1 phòng ban có thể quản lý nhiều cửa
- **Ký hiệu**: departments(0..1) ──────── (*) doors
- **FK**: doors.department_id → departments.id
- **ON DELETE**: SET NULL

### 8. **doors** ──── **door_departments** ──── **departments** (N:M)
- **Quan hệ**: Nhiều-nhiều (nhiều cửa có thể cho phép nhiều phòng ban truy cập)
- **Ký hiệu**:
  - doors(1) ──────── (*) door_departments
  - departments(1) ──────── (*) door_departments
- **Bảng trung gian**: door_departments
- **ON DELETE**: CASCADE

### 9. **permissions** (Độc lập)
- **Quan hệ**: Bảng template định nghĩa quyền, không có FK trực tiếp
- **Lưu ý**: Sử dụng JSON để lưu danh sách door_id được phép

### 10. **visitor_photos** (Độc lập)
- **Quan hệ**: Bảng lưu ảnh khách thăm, không có FK

---

## Giải thích ký hiệu

- `(PK)` = Primary Key (Khóa chính)
- `(FK)` = Foreign Key (Khóa ngoại)
- `(UNIQUE)` = Ràng buộc duy nhất
- `1` = Bắt buộc có đúng 1
- `0..1` = Tùy chọn (có thể NULL)
- `*` = Nhiều (0 hoặc nhiều hơn)
- `──────` = Đường nét liền biểu thị mối quan hệ

---

## Lưu ý đặc biệt

1. **Cascade Delete**:
   - `departments.parent_id`: Xóa phòng ban cha → xóa tất cả con
   - `door_departments`: Xóa cửa/phòng ban → xóa liên kết
   - `access_logs.door_id`: Xóa cửa → xóa tất cả log

2. **Set NULL**:
   - `users.department_id`: Xóa phòng ban → user vẫn tồn tại (dept = NULL)
   - `cards.user_id`: Xóa user → thẻ vẫn tồn tại
   - `access_logs.card_id`, `access_logs.user_id`: Giữ lại log lịch sử

3. **JSON Fields**:
   - `permissions.allowed_door_ids`: Danh sách ID cửa được phép
   - `permissions.time_restrictions`: Giới hạn giờ/ngày truy cập

4. **Self-referencing**:
   - `departments.parent_id` → `departments.id`: Cấu trúc cây phân cấp
