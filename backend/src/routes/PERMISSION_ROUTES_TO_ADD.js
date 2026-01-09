/**
 * PERMISSION ROUTES - COPY VÀO FILE routes/index.js
 *
 * HƯỚNG DẪN:
 * 1. Mở file backend/src/routes/index.js
 * 2. Thêm import controller ở đầu file (dòng ~11):
 *    const permissionController = require('../controllers/permissionController');
 *
 * 3. Copy toàn bộ các routes bên dưới vào file index.js (sau CARD ROUTES, trước DOOR ROUTES)
 */

// ===============================================
// PERMISSION ROUTES - /api/permissions
// ===============================================

// --- PERMISSION TEMPLATES MANAGEMENT ---

// GET /api/permissions - Lấy danh sách tất cả permission templates
router.get('/permissions', authenticateToken, requireRole('admin'), permissionController.getAllPermissionsHandler);

// GET /api/permissions/:id - Lấy chi tiết một permission template
router.get('/permissions/:id', authenticateToken, requireRole('admin'), permissionController.getPermissionByIdHandler);

// POST /api/permissions - Tạo permission template mới (admin only)
router.post('/permissions', authenticateToken, requireRole('admin'), permissionController.createPermissionHandler);

// PUT /api/permissions/:id - Cập nhật permission template
router.put('/permissions/:id', authenticateToken, requireRole('admin'), permissionController.updatePermissionHandler);

// DELETE /api/permissions/:id - Xóa permission template
// Query param: ?hard_delete=true để xóa hẳn, không truyền thì chỉ set is_active=false
router.delete('/permissions/:id', authenticateToken, requireRole('admin'), permissionController.deletePermissionHandler);

// GET /api/permissions/:id/cards - Lấy danh sách cards có permission này
router.get('/permissions/:id/cards', authenticateToken, requireRole('admin', 'security'), permissionController.getCardsByPermissionHandler);


// --- CARD PERMISSION ASSIGNMENT ---

// GET /api/cards/:cardId/permissions - Lấy tất cả permissions của một card
router.get('/cards/:cardId/permissions', authenticateToken, requireRole('admin', 'security'), permissionController.getCardPermissionsHandler);

// POST /api/cards/:cardId/permissions - Gán permission cho card
router.post('/cards/:cardId/permissions', authenticateToken, requireRole('admin'), permissionController.assignPermissionToCardHandler);

// PUT /api/card-permissions/:id - Cập nhật card_permission assignment (override, extend, etc.)
router.put('/card-permissions/:id', authenticateToken, requireRole('admin'), permissionController.updateCardPermissionHandler);

// DELETE /api/card-permissions/:id - Xóa một permission assignment khỏi card
router.delete('/card-permissions/:id', authenticateToken, requireRole('admin'), permissionController.removePermissionFromCardHandler);

// DELETE /api/cards/:cardId/permissions - Xóa TẤT CẢ permissions của card
router.delete('/cards/:cardId/permissions', authenticateToken, requireRole('admin'), permissionController.removeAllCardPermissionsHandler);

// ===============================================
// END PERMISSION ROUTES
// ===============================================
