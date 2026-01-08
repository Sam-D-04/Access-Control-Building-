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

// GET /api/departments - Lấy danh sách phòng ban
router.get('/departments', authenticateToken, departmentController.getAllDepartmentsHandler);

// GET /api/departments/:id - Lấy thông tin phòng ban theo ID
router.get('/departments/:id', authenticateToken, departmentController.getDepartmentByIdHandler);




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
router.post('/visitors/capture',
    authenticateToken,
    requireRole('admin', 'security'),
    visitorController.captureVisitorPhoto
);

router.get('/visitors/photos',
    authenticateToken,
    requireRole('admin', 'security'),
    visitorController.getVisitorPhotos
);

router.get('/visitors/photos/:id',
    authenticateToken,
    requireRole('admin', 'security'),
    visitorController.getVisitorPhotoById
);

router.delete('/visitors/photos/:id',
    authenticateToken,
    requireRole('admin'),
    visitorController.deleteVisitorPhoto
);

router.put('/visitors/photos/:id/checkout',
    authenticateToken,
    requireRole('admin', 'security'),
    visitorController.checkoutVisitor
);
module.exports = router;
