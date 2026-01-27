const { executeQuery, getOneRow } = require('../config/database');

async function createAccessLog(logData) {
    const sql = `
        INSERT INTO access_logs (
            card_id,
            user_id,
            door_id,
            access_time,
            status,
            denial_reason
        ) VALUES (?, ?, ?, ?, ?, ?)
    `;

    const params = [
        logData.card_id || null,
        logData.user_id || null,
        logData.door_id,
        logData.access_time || new Date(),
        logData.status,
        logData.denial_reason || null
    ];

    const result = await executeQuery(sql, params);
    return await findAccessLogById(result.insertId);
}

// tìm log theo ID
async function findAccessLogById(logId) {
    const sql = `
        SELECT
            al.*,
            u.full_name as user_name,
            u.employee_id,
            c.card_uid,
            d.name as door_name,
            d.location as door_location
        FROM access_logs al
        LEFT JOIN users u ON al.user_id = u.id
        LEFT JOIN cards c ON al.card_id = c.id
        LEFT JOIN doors d ON al.door_id = d.id
        WHERE al.id = ?
    `;

    const log = await getOneRow(sql, [logId]);
    return log;
}

// lấy tất cả logs với filter và pagination
async function getAllLogs(filters = {}) {
    let sql = `
        SELECT
            al.id,
            al.access_time,
            al.status,
            al.denial_reason,
            u.full_name as user_name,
            u.employee_id,
            c.card_uid,
            d.name as door_name,
            d.location as door_location
        FROM access_logs al
        LEFT JOIN users u ON al.user_id = u.id
        LEFT JOIN cards c ON al.card_id = c.id
        LEFT JOIN doors d ON al.door_id = d.id
        WHERE 1=1
    `;

    const params = [];

    // Filter theo user_id
    if (filters.user_id) {
        sql += ' AND al.user_id = ?';
        params.push(filters.user_id);
    }

    // Filter theo door_id
    if (filters.door_id) {
        sql += ' AND al.door_id = ?';
        params.push(filters.door_id);
    }

    // Filter theo status
    if (filters.status) {
        sql += ' AND al.status = ?';
        params.push(filters.status);
    }

    // Filter theo ngày (start_date)
    if (filters.start_date) {
        sql += ' AND al.access_time >= ?';
        params.push(filters.start_date);
    }

    // Filter theo ngày (end_date)
    if (filters.end_date) {
        sql += ' AND al.access_time <= ?';
        params.push(filters.end_date);
    }

    // Order by mới nhất
    sql += ' ORDER BY al.access_time DESC';

    // Pagination
    const safeLimit = parseInt(filters.limit) || 20;
    const safeOffset = parseInt(filters.offset) || 0;

    sql += ` LIMIT ${safeLimit} OFFSET ${safeOffset}`;

    const logs = await executeQuery(sql, params);
    return logs;
}

// lấy logs của một user
async function getLogsByUserId(userId, limit = 20, offset = 0) {
    // Parse to safe integers
    const safeLimit = parseInt(limit) || 20;
    const safeOffset = parseInt(offset) || 0;

    const sql = `
        SELECT
            al.id,
            al.access_time,
            al.status,
            al.denial_reason,
            c.card_uid,
            d.name as door_name,
            d.location as door_location
        FROM access_logs al
        LEFT JOIN cards c ON al.card_id = c.id
        LEFT JOIN doors d ON al.door_id = d.id
        WHERE al.user_id = ?
        ORDER BY al.access_time DESC
        LIMIT ${safeLimit} OFFSET ${safeOffset}
    `;

    const logs = await executeQuery(sql, [userId]);
    return logs;
}

// lấy logs gần nhất
async function getRecentLogs(limit = 10) {
    
    const safeLimit = parseInt(limit) || 10;

    const sql = `
        SELECT
            al.id,
            al.access_time,
            al.status,
            al.denial_reason,
            u.full_name as user_name,
            u.employee_id,
            c.card_uid,
            d.name as door_name,
            d.location as door_location
        FROM access_logs al
        LEFT JOIN users u ON al.user_id = u.id
        LEFT JOIN cards c ON al.card_id = c.id
        LEFT JOIN doors d ON al.door_id = d.id
        ORDER BY al.access_time DESC
        LIMIT ${safeLimit}
    `;

    const logs = await executeQuery(sql);
    return logs;
}

// thống kê tất cả logs
async function getTodayStats() {
    const sql = `
        SELECT
            COUNT(*) as total,
            SUM(CASE WHEN status = 'granted' THEN 1 ELSE 0 END) as granted,
            SUM(CASE WHEN status = 'denied' THEN 1 ELSE 0 END) as denied
        FROM access_logs
    `;

    const stats = await getOneRow(sql, []);
    return stats;
}

// thống kê theo cửa hôm nay
async function getTodayStatsByDoor() {
    const sql = `
        SELECT
            d.id as door_id,
            d.name as door_name,
            COUNT(*) as total,
            SUM(CASE WHEN al.status = 'granted' THEN 1 ELSE 0 END) as granted,
            SUM(CASE WHEN al.status = 'denied' THEN 1 ELSE 0 END) as denied
        FROM doors d
        LEFT JOIN access_logs al ON d.id = al.door_id AND DATE(al.access_time) = CURDATE()
        GROUP BY d.id
        ORDER BY total DESC
    `;

    const stats = await executeQuery(sql, []);
    return stats;
}

// đếm tổng số logs 
async function countLogs(filters = {}) {
    let sql = 'SELECT COUNT(*) as total FROM access_logs WHERE 1=1';
    const params = [];

    if (filters.user_id) {
        sql += ' AND user_id = ?';
        params.push(filters.user_id);
    }

    if (filters.door_id) {
        sql += ' AND door_id = ?';
        params.push(filters.door_id);
    }

    if (filters.status) {
        sql += ' AND status = ?';
        params.push(filters.status);
    }

    if (filters.start_date) {
        sql += ' AND access_time >= ?';
        params.push(filters.start_date);
    }

    if (filters.end_date) {
        sql += ' AND access_time <= ?';
        params.push(filters.end_date);
    }

    const result = await getOneRow(sql, params);
    return result.total;
}

module.exports = {
    createAccessLog,
    findAccessLogById,
    getAllLogs,
    getLogsByUserId,
    getRecentLogs,
    getTodayStats,
    getTodayStatsByDoor,
    countLogs
};
