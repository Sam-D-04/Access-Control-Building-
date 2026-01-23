/**
 * Migration Script: Convert JSON to permission_doors table
 *
 * Chuyển đổi từ permissions.allowed_door_ids (JSON)
 * sang bảng permission_doors (N:M relationship)
 */

const mysql = require('mysql2/promise');

// Cấu hình database
const dbConfig = {
  host: 'localhost',
  user: 'your_username',
  password: 'your_password',
  database: 'access_control_db'
};

async function migrate() {
  const connection = await mysql.createConnection(dbConfig);

  try {
    console.log('🚀 Bắt đầu migration từ JSON sang permission_doors...\n');

    // Bước 1: Đảm bảo bảng permission_doors đã tồn tại
    console.log('📋 Kiểm tra bảng permission_doors...');
    const [tables] = await connection.query(`
      SHOW TABLES LIKE 'permission_doors'
    `);

    if (tables.length === 0) {
      console.error('❌ Bảng permission_doors chưa tồn tại!');
      console.log('   Vui lòng chạy migration_script.sql trước.');
      return;
    }
    console.log('✅ Bảng permission_doors đã tồn tại\n');

    // Bước 2: Lấy tất cả permissions có door_access_mode = 'specific'
    console.log('📊 Lấy danh sách permissions...');
    const [permissions] = await connection.query(`
      SELECT id, name, door_access_mode, allowed_door_ids
      FROM permissions
      WHERE door_access_mode = 'specific'
        AND allowed_door_ids IS NOT NULL
    `);

    console.log(`   Tìm thấy ${permissions.length} permissions cần migrate\n`);

    // Bước 3: Xóa dữ liệu cũ trong permission_doors (nếu có)
    console.log('🗑️  Xóa dữ liệu cũ trong permission_doors...');
    await connection.query('DELETE FROM permission_doors');
    console.log('✅ Đã xóa dữ liệu cũ\n');

    // Bước 4: Migrate từng permission
    let totalInserted = 0;
    let errors = [];

    for (const permission of permissions) {
      try {
        // Parse JSON
        let doorIds = [];
        if (typeof permission.allowed_door_ids === 'string') {
          doorIds = JSON.parse(permission.allowed_door_ids);
        } else if (Array.isArray(permission.allowed_door_ids)) {
          doorIds = permission.allowed_door_ids;
        }

        console.log(`📌 Processing: ${permission.name} (ID: ${permission.id})`);
        console.log(`   Door IDs: [${doorIds.join(', ')}]`);

        // Insert vào permission_doors
        for (const doorId of doorIds) {
          try {
            await connection.query(`
              INSERT INTO permission_doors (permission_id, door_id)
              VALUES (?, ?)
            `, [permission.id, doorId]);

            totalInserted++;
            console.log(`   ✅ Inserted: permission_id=${permission.id}, door_id=${doorId}`);

          } catch (err) {
            if (err.code === 'ER_NO_REFERENCED_ROW_2') {
              errors.push({
                permission_id: permission.id,
                permission_name: permission.name,
                door_id: doorId,
                error: `Door ID ${doorId} không tồn tại trong bảng doors`
              });
              console.log(`   ⚠️  Warning: Door ID ${doorId} không tồn tại`);
            } else {
              throw err;
            }
          }
        }

        console.log('');

      } catch (err) {
        errors.push({
          permission_id: permission.id,
          permission_name: permission.name,
          error: err.message
        });
        console.error(`   ❌ Error processing permission ${permission.id}: ${err.message}\n`);
      }
    }

    // Bước 5: Báo cáo kết quả
    console.log('\n' + '='.repeat(60));
    console.log('📊 KẾT QUẢ MIGRATION');
    console.log('='.repeat(60));
    console.log(`✅ Tổng số permissions đã xử lý: ${permissions.length}`);
    console.log(`✅ Tổng số record đã insert: ${totalInserted}`);
    console.log(`⚠️  Tổng số lỗi: ${errors.length}`);

    if (errors.length > 0) {
      console.log('\n❌ DANH SÁCH LỖI:');
      console.table(errors);
    }

    // Bước 6: Verification
    console.log('\n' + '='.repeat(60));
    console.log('🔍 VERIFICATION');
    console.log('='.repeat(60));

    const [stats] = await connection.query(`
      SELECT
        p.id,
        p.name,
        p.door_access_mode,
        COUNT(pd.door_id) as door_count
      FROM permissions p
      LEFT JOIN permission_doors pd ON p.id = pd.permission_id
      WHERE p.door_access_mode = 'specific'
      GROUP BY p.id, p.name, p.door_access_mode
      ORDER BY door_count DESC
    `);

    console.table(stats);

    // Bước 7: Hỏi xác nhận xóa cột JSON
    console.log('\n' + '='.repeat(60));
    console.log('⚠️  BƯỚC TIẾP THEO (TÙY CHỌN)');
    console.log('='.repeat(60));
    console.log('Sau khi verify dữ liệu đúng, bạn có thể:');
    console.log('1. Xóa cột allowed_door_ids bằng lệnh:');
    console.log('   ALTER TABLE permissions DROP COLUMN allowed_door_ids;');
    console.log('\n2. Hoặc giữ lại cột để backup (khuyến nghị trong giai đoạn đầu)');

  } catch (err) {
    console.error('❌ Migration failed:', err);
    throw err;
  } finally {
    await connection.end();
    console.log('\n🔒 Đã đóng kết nối database');
  }
}

// Chạy migration
migrate()
  .then(() => {
    console.log('\n✅ Migration hoàn tất!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Migration thất bại:', err);
    process.exit(1);
  });


/**
 * CÁCH SỬ DỤNG:
 *
 * 1. Cài đặt dependencies:
 *    npm install mysql2
 *
 * 2. Cập nhật dbConfig ở trên với thông tin database của bạn
 *
 * 3. Chạy migration:
 *    node migration_from_json.js
 *
 * 4. Kiểm tra kết quả trong console
 *
 * 5. Nếu OK, chạy SQL để xóa cột JSON:
 *    ALTER TABLE permissions DROP COLUMN allowed_door_ids;
 */
