// backend/src/models/Card.js
const { executeQuery, getOneRow } = require('../config/database');

// 1. Tìm thẻ theo ID
async function findCardById(cardId) {
    const sql = `
        SELECT 
            c.id, c.card_uid, c.user_id, c.is_active, c.notes,
            c.issued_at as issued_at,   
            c.expired_at as expired_at, 
            u.full_name as user_name,
            u.email as user_email,
            d.name as department_name
        FROM cards c
        LEFT JOIN users u ON c.user_id = u.id
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE c.id = ?
    `;
    const card = await getOneRow(sql, [cardId]);
    return card;
}

// 2. Tìm thẻ theo UID (Dùng cho Scan)
async function findCardByUid(cardUid) {
    const sql = `
        SELECT 
            c.*,
            u.full_name,
            u.email,
            u.employee_id,
            u.role,
            u.is_active as user_is_active,
            d.name as department_name
        FROM cards c
        LEFT JOIN users u ON c.user_id = u.id
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE c.card_uid = ?
    `;
    return await getOneRow(sql, [cardUid]);
}

// 3. Lấy thẻ theo User
async function getCardsByUser(userId) {
    const sql = `
        SELECT 
            c.id, c.card_uid, c.user_id, c.is_active,
            c.issued_at as issued_at,
            c.expired_at as expired_at,
            u.full_name as user_name,
            u.email as user_email,
            d.name as department_name
        FROM cards c
        LEFT JOIN users u ON c.user_id = u.id
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE c.user_id = ? 
        ORDER BY c.created_at DESC
    `;
    return await executeQuery(sql, [userId]);
}

// 4. Lấy tất cả thẻ
async function getAllCards() {
    const sql = `
        SELECT 
            c.id, c.card_uid, c.user_id, c.is_active,
            c.issued_at as issued_at,
            c.expired_at as expired_at,
            u.full_name as user_name,
            u.email as user_email,
            d.name as department_name
        FROM cards c
        LEFT JOIN users u ON c.user_id = u.id
        LEFT JOIN departments d ON u.department_id = d.id
        ORDER BY c.created_at DESC
    `;
    return await executeQuery(sql, []);
}

// 5. Tạo thẻ mới (Mapping field chính xác)
async function createCard(cardData) {
    const sql = `
        INSERT INTO cards (
            card_uid,
            user_id,
            issued_at,  
            expired_at, 
            is_active
        ) VALUES (?, ?, ?, ?, ?)
    `;

    const params = [
        cardData.card_uid,
        cardData.user_id,
        // Map từ issued_at (Frontend) sang issued_at (DB)
        cardData.issued_at || new Date(), 
        // Map từ expired_at (Frontend) sang expired_at (DB)
        cardData.expired_at || null,      
        cardData.is_active !== undefined ? cardData.is_active : true
    ];

    const result = await executeQuery(sql, params);
    return await findCardById(result.insertId);
}

async function updateCard(cardId, cardData) {
    const updateFields = [];
    const params = [];

    if (cardData.card_uid !== undefined) {
        updateFields.push('card_uid = ?');
        params.push(cardData.card_uid);
    }

    if (cardData.user_id !== undefined) {
        updateFields.push('user_id = ?');
        params.push(cardData.user_id);
    }

    if (cardData.issued_at !== undefined) {
        updateFields.push('issued_at = ?');
        params.push(cardData.issued_at);
    }

    if (cardData.expired_at !== undefined) {
        updateFields.push('expired_at = ?');
        params.push(cardData.expired_at);
    }
    // -----------------------

    if (cardData.is_active !== undefined) {
        updateFields.push('is_active = ?');
        params.push(cardData.is_active);
    }

    if (updateFields.length === 0) {
        return await findCardById(cardId);
    }

    params.push(cardId);

    const sql = `UPDATE cards SET ${updateFields.join(', ')} WHERE id = ?`;

    await executeQuery(sql, params);
    return await findCardById(cardId);
}

// Các hàm tiện ích giữ nguyên
async function activateCard(cardId) {
    await executeQuery('UPDATE cards SET is_active = TRUE WHERE id = ?', [cardId]);
    return await findCardById(cardId);
}

async function deactivateCard(cardId) {
    await executeQuery('UPDATE cards SET is_active = FALSE WHERE id = ?', [cardId]);
    return await findCardById(cardId);
}

async function deleteCard(cardId) {
    const result = await executeQuery('DELETE FROM cards WHERE id = ?', [cardId]);
    return result.affectedRows > 0;
}

module.exports = {
    findCardById,
    findCardByUid,
    getAllCards,
    getCardsByUser,
    createCard,
    updateCard,
    activateCard,
    deactivateCard,
    deleteCard
};