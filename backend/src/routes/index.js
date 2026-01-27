const express = require('express');
const router = express.Router();

// Import controllers
const authController = require('../controllers/authController');
const accessController = require('../controllers/accessController');
const doorController = require('../controllers/doorController');
const userController = require('../controllers/userController');
const cardController = require('../controllers/cardController');
const departmentController = require('../controllers/departmentController');
const visitorController = require('../controllers/visitorController');
const permissionController = require('../controllers/permissionController');
const cardPermissionHandlers = require('../controllers/cardPermissionHandlers');

// Import middlewares
const { authenticateToken, requireRole } = require('../middlewares/auth');


// AUTH ROUTES - /api/auth

// POST /api/auth/login - Đăng nhập
router.post('/auth/login', authController.login);

// GET /api/auth/me - Lấy thông tin user hiện tại (cần token)
router.get('/auth/me', authenticateToken, authController.getMe);



// USER ROUTES - /api/users

// GET /api/users - Lấy danh sách users
router.get('/users', authenticateToken, requireRole('admin', 'security'), userController.getAllUsersHandler);

// GET /api/users/:id - Lấy thông tin user theo ID 
router.get('/users/:id', authenticateToken, requireRole('admin', 'security'), userController.getUserByIdHandler);

// POST /api/users - Tạo user mới 
router.post('/users', authenticateToken, requireRole('admin'), userController.createUserHandler);

// PUT /api/users/:id - Cập nhật thông tin user 
router.put('/users/:id', authenticateToken, requireRole('admin'), userController.updateUserHandler);

// DELETE /api/users/:id - Xóa user
router.delete('/users/:id', authenticateToken, requireRole('admin'), userController.deleteUserHandler);



// CARD ROUTES - /api/cards

// GET /api/cards - Lấy danh sách thẻ
router.get('/cards', authenticateToken, requireRole('admin', 'security'), cardController.getAllCardsHandler);

// GET /api/cards/:id - Lấy thông tin thẻ theo ID
router.get('/cards/:id', authenticateToken, requireRole('admin', 'security'), cardController.getCardByIdHandler);

// POST /api/cards - Tạo thẻ mới
router.post('/cards', authenticateToken, requireRole('admin'), cardController.createCardHandler);

// PUT /api/cards/:id - Cập nhật thông tin thẻ
router.put('/cards/:id', authenticateToken, requireRole('admin'), cardController.updateCardHandler);

// PUT /api/cards/:id/activate - Kích hoạt thẻ
router.put('/cards/:id/activate', authenticateToken, requireRole('admin'), cardController.activateCardHandler);

// PUT /api/cards/:id/deactivate - Vô hiệu hóa thẻ
router.put('/cards/:id/deactivate', authenticateToken, requireRole('admin'), cardController.deactivateCardHandler);

// DELETE /api/cards/:id - Xóa thẻ
router.delete('/cards/:id', authenticateToken, requireRole('admin'), cardController.deleteCardHandler);

// CARD PERMISSIONS ROUTES (Many-to-Many)
// GET /api/cards/:cardId/permissions - Lấy tất cả permissions của card
router.get('/cards/:cardId/permissions', authenticateToken, requireRole('admin', 'security'), cardPermissionHandlers.getCardPermissionsHandler);

// PUT /api/cards/:cardId/permissions - Gán permission cho card (thêm mới)
router.put('/cards/:cardId/permissions', authenticateToken, requireRole('admin'), cardPermissionHandlers.assignPermissionHandler);

// DELETE /api/cards/:cardId/permissions - Xóa TẤT CẢ permissions của card
router.delete('/cards/:cardId/permissions', authenticateToken, requireRole('admin'), cardPermissionHandlers.removeAllPermissionsHandler);

// PUT /api/card-permissions/:id - Cập nhật một permission assignment
router.put('/card-permissions/:id', authenticateToken, requireRole('admin'), cardPermissionHandlers.updateCardPermissionHandler);

// DELETE /api/card-permissions/:id - Xóa MỘT permission cụ thể
router.delete('/card-permissions/:id', authenticateToken, requireRole('admin'), cardPermissionHandlers.removePermissionHandler);



// DOOR ROUTES - /api/doors

// GET /api/doors - Lấy danh sách cửa
router.get('/doors', authenticateToken, doorController.getDoorsHandler);

// GET /api/doors/:id - Lấy thông tin cửa theo ID
router.get('/doors/:id', authenticateToken, doorController.getDoorByIdHandler);

// POST /api/doors - Tạo cửa mới 
router.post('/doors', authenticateToken, requireRole('admin'), doorController.createDoorHandler);

// PUT /api/doors/:id - Cập nhật thông tin cửa 
router.put('/doors/:id', authenticateToken, requireRole('admin'), doorController.updateDoorHandler);

// PUT /api/doors/:id/lock - Khóa cửa khẩn cấp
router.put('/doors/:id/lock', authenticateToken, requireRole('admin', 'security'), doorController.lockDoorHandler);

// PUT /api/doors/:id/unlock - Mở khóa cửa
router.put('/doors/:id/unlock', authenticateToken, requireRole('admin', 'security'), doorController.unlockDoorHandler);

// DELETE /api/doors/:id - Xóa cửa 
router.delete('/doors/:id', authenticateToken, requireRole('admin'), doorController.deleteDoorHandler);



// DEPARTMENT ROUTES - /api/departments

// GET /api/departments - Lấy danh sách phòng ban (?format=tree để lấy dạng cây)
router.get('/departments', authenticateToken, departmentController.getAllDepartmentsHandler);

// GET /api/departments/root - Lấy departments gốc (level 0)
router.get('/departments/root', authenticateToken, departmentController.getRootDepartmentsHandler);

// GET /api/departments/:id - Lấy thông tin phòng ban theo ID
router.get('/departments/:id', authenticateToken, departmentController.getDepartmentByIdHandler);

// GET /api/departments/:id/children - Lấy children trực tiếp
router.get('/departments/:id/children', authenticateToken, departmentController.getChildrenHandler);

// POST /api/departments - Tạo phòng ban mới (admin only)
router.post('/departments', authenticateToken, requireRole('admin'), departmentController.createDepartmentHandler);

// PUT /api/departments/:id - Cập nhật phòng ban (admin only)
router.put('/departments/:id', authenticateToken, requireRole('admin'), departmentController.updateDepartmentHandler);

// DELETE /api/departments/:id - Xóa phòng ban (admin only)
router.delete('/departments/:id', authenticateToken, requireRole('admin'), departmentController.deleteDepartmentHandler);



// ACCESS ROUTES - /api/access

// POST /api/access/request - Yêu cầu truy cập 
router.post('/access/request', accessController.requestAccess);

// POST /api/access/scan-qr - Scan QR code từ scanner
router.post('/access/scan-qr', authenticateToken, requireRole('admin', 'security'), accessController.scanQR);

// GET /api/access/logs - Lấy danh sách logs
router.get('/access/logs', authenticateToken, requireRole('admin', 'security'), accessController.getLogs);

// GET /api/access/my-logs - Lấy logs của user hiện tại
router.get('/access/my-logs', authenticateToken, accessController.getMyLogs);

// GET /api/access/recent - Lấy logs gần nhất
router.get('/access/recent', authenticateToken, accessController.getRecent);

// GET /api/access/stats - Thống kê hôm nay
router.get('/access/stats', authenticateToken, accessController.getStats);



// VISITOR ROUTES - /api/visitors

// POST - Chụp ảnh check-in (Base64)
router.post('/visitors/capture', authenticateToken, requireRole('admin', 'security'), visitorController.captureVisitorPhoto);

// GET - Lấy danh sách (có filter: date, start_time, end_time)
router.get('/visitors/photos', authenticateToken, requireRole('admin', 'security'), visitorController.getVisitorPhotos);

// GET - Lấy 1 ảnh theo ID
router.get('/visitors/photos/:id', authenticateToken, requireRole('admin', 'security'), visitorController.getVisitorPhotoById);

// DELETE - Xóa ảnh (admin only)
router.delete('/visitors/photos/:id', authenticateToken, requireRole('admin'), visitorController.deleteVisitorPhoto);

// PUT - Checkout (Base64)
router.put('/visitors/photos/:id/checkout', authenticateToken, requireRole('admin', 'security'), visitorController.checkoutVisitor);

// GET - Thống kê (có filter: date)
router.get('/visitors/stats', authenticateToken, requireRole('admin', 'security'), visitorController.getVisitorStats);


// PERMISSION ROUTES - /api/permissions

// GET /api/permissions - Lấy tất cả permissions
router.get('/permissions', authenticateToken, requireRole('admin', 'security'), permissionController.getAllPermissionsHandler);

// GET /api/permissions/:id - Lấy chi tiết permission
router.get('/permissions/:id', authenticateToken, requireRole('admin', 'security'), permissionController.getPermissionByIdHandler);

// POST /api/permissions - Tạo permission mới (admin only)
router.post('/permissions', authenticateToken, requireRole('admin'), permissionController.createPermissionHandler);

// PUT /api/permissions/:id - Cập nhật permission (admin only)
router.put('/permissions/:id', authenticateToken, requireRole('admin'), permissionController.updatePermissionHandler);

// DELETE /api/permissions/:id - Xóa permission (admin only, soft delete)
router.delete('/permissions/:id', authenticateToken, requireRole('admin'), permissionController.deletePermissionHandler);

// GET /api/permissions/:id/doors - Lấy danh sách doors được phép của permission
router.get('/permissions/:id/doors', authenticateToken, requireRole('admin', 'security'), permissionController.getAllowedDoorsHandler);

// POST /api/permissions/:id/doors/:doorId - Thêm door vào permission (admin only)
router.post('/permissions/:id/doors/:doorId', authenticateToken, requireRole('admin'), permissionController.addDoorHandler);

// DELETE /api/permissions/:id/doors/:doorId - Xóa door khỏi permission (admin only)
router.delete('/permissions/:id/doors/:doorId', authenticateToken, requireRole('admin'), permissionController.removeDoorHandler);




module.exports = router;
