const { findCardByUid } = require('../models/Card');
const { findDoorById } = require('../models/Door');
const { createAccessLog, getAllLogs, getLogsByUserId, getRecentLogs, getTodayStats, getTodayStatsByDoor } = require('../models/AccessLog');
const { checkAccessPermission } = require('../services/accessControlService');
const { publishMessage } = require('../config/mqtt');
const { CustomError } = require('../middlewares/errorHandler');

//xử lý yêu cầu truy cập
async function requestAccess(req, res, next) {
    try {
        const { card_uid, door_id } = req.body;

        // Validate input
        if (!card_uid || !door_id) {
            throw new CustomError('Thiếu thông tin card_uid hoặc door_id', 400);
        }

        console.log('Access request:', { card_uid, door_id });

        //Tìm thẻ trong database
        const card = await findCardByUid(card_uid);

        if (!card) {
            // Ghi log denied
            await createAccessLog({
                card_id: null,
                user_id: null,
                door_id: door_id,
                status: 'denied',
                denial_reason: 'Thẻ không tồn tại trong hệ thống'
            });

            return res.status(403).json({
                success: false,
                status: 'denied',
                message: 'Thẻ không tồn tại trong hệ thống'
            });
        }

        //Tìm cửa trong database
        const door = await findDoorById(door_id);

        if (!door) {
            throw new CustomError('Cửa không tồn tại', 404);
        }

        //Lấy thông tin user từ card 
        const user = {
            id: card.user_id,
            full_name: card.full_name,
            email: card.email,
            employee_id: card.employee_id,
            department_id: card.department_id,
            position: card.position,
            role: card.role,
            is_active: card.user_is_active
        };

        //Kiểm tra quyền truy cập 
        const accessCheck = checkAccessPermission(card, door, user);

        //Ghi log vào database
        const log = await createAccessLog({
            card_id: card.id,
            user_id: user.id,
            door_id: door.id,
            status: accessCheck.granted ? 'granted' : 'denied',
            denial_reason: accessCheck.reason
        });

        console.log('Access log created:', {
            user: user.full_name,
            door: door.name,
            status: log.status
        });

        // Publish MQTT message
        publishMessage('access/log', {
            user_name: user.full_name,
            employee_id: user.employee_id,
            department: card.department_name,
            card_uid: card.card_uid,
            door_name: door.name,
            door_location: door.location,
            status: log.status,
            denial_reason: log.denial_reason,
            access_time: log.access_time
        });

        //Trả về response
        if (accessCheck.granted) {
            return res.json({
                success: true,
                status: 'granted',
                message: 'Truy cập được chấp nhận',
                data: {
                    user_name: user.full_name,
                    door_name: door.name,
                    access_time: log.access_time
                }
            });
        } else {
            return res.status(403).json({
                success: false,
                status: 'denied',
                message: accessCheck.reason,
                data: {
                    user_name: user.full_name,
                    door_name: door.name
                }
            });
        }

    } catch (error) {
        next(error);
    }
}

// Lấy danh sách logs
async function getLogs(req, res, next) {
    try {
        const filters = {
            user_id: req.query.user_id,
            door_id: req.query.door_id,
            status: req.query.status,
            start_date: req.query.start_date,
            end_date: req.query.end_date,
            limit: parseInt(req.query.limit) || 20,
            offset: parseInt(req.query.offset) || 0
        };

        const logs = await getAllLogs(filters);

        res.json({
            success: true,
            data: logs,
            pagination: {
                limit: filters.limit,
                offset: filters.offset
            }
        });

    } catch (error) {
        next(error);
    }
}

// Lấy logs của user hiện tại 
async function getMyLogs(req, res, next) {
    try {
        const userId = req.user.id;
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;

        const logs = await getLogsByUserId(userId, limit, offset);

        res.json({
            success: true,
            data: logs
        });

    } catch (error) {
        next(error);
    }
}

// Lấy logs gần nhất cho monitor page
async function getRecent(req, res, next) {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const logs = await getRecentLogs(limit);

        res.json({
            success: true,
            data: logs
        });

    } catch (error) {
        next(error);
    }
}

// Lấy thống kê hôm nay
async function getStats(req, res, next) {
    try {
        const todayStats = await getTodayStats();
        const statsByDoor = await getTodayStatsByDoor();

        res.json({
            success: true,
            data: {
                today: {
                    total: todayStats.total || 0,
                    granted: todayStats.granted || 0,
                    denied: todayStats.denied || 0
                },
                byDoor: statsByDoor
            }
        });

    } catch (error) {
        next(error);
    }
}

// Xử lý scan QR code từ scanner
async function scanQR(req, res, next) {
    try {
        const { qr_data, door_id } = req.body;

        //Validate input
        if (!qr_data || !door_id) {
            throw new CustomError('Thiếu thông tin qr_data hoặc door_id', 400);
        }

        // Parse QR data
        const qrPayload = typeof qr_data === 'string' ? JSON.parse(qr_data) : qr_data;
        const { user_id, employee_id, timestamp } = qrPayload;

        // Validate timestamp 
        const now = Date.now();
        const qrAge = now - timestamp;
        if (qrAge > 120000) {  //2p
            throw new CustomError('QR code đã hết hạn', 400);
        }

        // Tìm user theo user_id
        const { findUserById } = require('../models/User');
        const user = await findUserById(user_id);

        if (!user) {
            throw new CustomError('User không tồn tại', 404);
        }

        // Tìm card của user
        const { findCardsByUserId } = require('../models/Card');
        const userCards = await findCardsByUserId(user_id);
        const activeCard = userCards.find(c => c.is_active);

        if (!activeCard) {
            // Ghi log denied
            await createAccessLog({
                card_id: null,
                user_id: user_id,
                door_id: door_id,
                status: 'denied',
                denial_reason: 'Không có thẻ hoạt động'
            });

            return res.status(403).json({
                success: false,
                status: 'denied',
                message: 'Không có thẻ hoạt động'
            });
        }

        //Tìm cửa
        const door = await findDoorById(door_id);
        if (!door) {
            throw new CustomError('Cửa không tồn tại', 404);
        }

        //Check access permission
        const accessCheck = checkAccessPermission(activeCard, door, user);

        //Ghi log
        const log = await createAccessLog({
            card_id: activeCard.id,
            user_id: user.id,
            door_id: door.id,
            status: accessCheck.granted ? 'granted' : 'denied',
            denial_reason: accessCheck.reason
        });

        console.log('QR Access log created:', {
            user: user.full_name,
            door: door.name,
            status: log.status
        });

        // Publish MQTT message
        publishMessage('access/log', {
            user_name: user.full_name,
            employee_id: user.employee_id,
            department: activeCard.department_name,
            card_uid: activeCard.card_uid,
            door_name: door.name,
            door_location: door.location,
            status: log.status,
            denial_reason: log.denial_reason,
            access_time: log.access_time
        });

        //Trả về response
        if (accessCheck.granted) {
            return res.json({
                success: true,
                status: 'granted',
                message: 'Truy cập được chấp nhận',
                data: {
                    user_name: user.full_name,
                    employee_id: user.employee_id,
                    door_name: door.name,
                    access_time: log.access_time
                }
            });
        } else {
            return res.status(403).json({
                success: false,
                status: 'denied',
                message: accessCheck.reason,
                data: {
                    user_name: user.full_name,
                    employee_id: user.employee_id,
                    door_name: door.name
                }
            });
        }

    } catch (error) {
        next(error);
    }
}

module.exports = {
    requestAccess,
    scanQR,
    getLogs,
    getMyLogs,
    getRecent,
    getStats
};
