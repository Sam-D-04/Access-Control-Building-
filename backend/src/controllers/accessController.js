const { findCardByUid, getCardsByUser } = require('../models/Card'); 
const { findDoorById } = require('../models/Door');
const { findUserById } = require('../models/User');
const { createAccessLog, getAllLogs, getLogsByUserId, getRecentLogs, getTodayStats, getTodayStatsByDoor } = require('../models/AccessLog');
const { checkAccessPermission } = require('../services/accessControlService');
const { publishMessage } = require('../config/mqtt');
const { CustomError } = require('../middlewares/errorHandler');

// Xử lý yêu cầu truy cập 
async function requestAccess(req, res, next) {
    try {
        const { card_uid, door_id } = req.body;

        if (!card_uid || !door_id) {
            throw new CustomError('Thiếu thông tin card_uid hoặc door_id', 400);
        }

        console.log('Access request:', { card_uid, door_id });

        const card = await findCardByUid(card_uid);

        if (!card) {
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

        const door = await findDoorById(door_id);
        if (!door) throw new CustomError('Cửa không tồn tại', 404);

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

        const accessCheck = await checkAccessPermission(card, door, user);

        const log = await createAccessLog({
            card_id: card.id,
            user_id: user.id,
            door_id: door.id,
            status: accessCheck.granted ? 'granted' : 'denied',
            denial_reason: accessCheck.reason
        });

        // MQTT publish...
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

        if (accessCheck.granted) {
            return res.json({
                success: true,
                status: 'granted',
                message: 'Truy cập được chấp nhận',
                data: {
                    user_name: user.full_name,
                    employee_id: user.employee_id,
                    door_name: door.name,
                    access_time: log.access_time,
                    matched_permission: accessCheck.details?.matched_permission
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
                    door_name: door.name,
                    checked_permissions: accessCheck.details?.checked_permissions,
                    denial_details: accessCheck.details?.all_checks
                }
            });
        }
    } catch (error) {
        next(error);
    }
}


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
        res.json({ success: true, data: logs, pagination: { limit: filters.limit, offset: filters.offset } });
    } catch (error) { next(error); }
}

async function getMyLogs(req, res, next) {
    try {
        const userId = req.user.id;
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;
        const logs = await getLogsByUserId(userId, limit, offset);
        res.json({ success: true, data: logs });
    } catch (error) { next(error); }
}

async function getRecent(req, res, next) {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const logs = await getRecentLogs(limit);
        res.json({ success: true, data: logs });
    } catch (error) { next(error); }
}

async function getStats(req, res, next) {
    try {
        const todayStats = await getTodayStats();
        const statsByDoor = await getTodayStatsByDoor();
        res.json({ success: true, data: { today: todayStats, byDoor: statsByDoor } });
    } catch (error) { next(error); }
}

// Xử lý scan QR code
async function scanQR(req, res, next) {
    try {
        const { qr_data, door_id } = req.body;

        if (!qr_data || !door_id) throw new CustomError('Thiếu thông tin qr_data hoặc door_id', 400);

        const qrPayload = typeof qr_data === 'string' ? JSON.parse(qr_data) : qr_data;
        const { user_id, employee_id, timestamp } = qrPayload;

        const now = Date.now();
        if (now - timestamp > 120000) throw new CustomError('QR code đã hết hạn', 400);

        const user = await findUserById(user_id);
        if (!user) throw new CustomError('User không tồn tại', 404);


        const userCards = await getCardsByUser(user_id); 
        const activeCard = userCards.find(c => c.is_active);

        if (!activeCard) {
            await createAccessLog({
                card_id: null,
                user_id: user_id,
                door_id: door_id,
                status: 'denied',
                denial_reason: 'Không có thẻ hoặc thẻ không còn hoạt động'
            });
            return res.status(403).json({
                success: false,
                status: 'denied',
                message: 'Không có thẻ hoặc thẻ không còn hoạt động'
            });
        }

        const door = await findDoorById(door_id);
        if (!door) throw new CustomError('Cửa không tồn tại', 404);

        const accessCheck = await checkAccessPermission(activeCard, door, user);

        const log = await createAccessLog({
            card_id: activeCard.id,
            user_id: user.id,
            door_id: door.id,
            status: accessCheck.granted ? 'granted' : 'denied',
            denial_reason: accessCheck.reason
        });

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

        if (accessCheck.granted) {
            return res.json({
                success: true,
                status: 'granted',
                message: 'Truy cập được chấp nhận',
                data: {
                    user_name: user.full_name,
                    employee_id: user.employee_id,
                    door_name: door.name,
                    access_time: log.access_time,
                    matched_permission: accessCheck.details?.matched_permission
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
                    door_name: door.name,
                    checked_permissions: accessCheck.details?.checked_permissions,
                    denial_details: accessCheck.details?.all_checks
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