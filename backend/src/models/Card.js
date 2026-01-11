// backend/src/models/Card.js
const { executeQuery, getOneRow } = require('../config/database');

// 1. Tìm thẻ theo ID
async function findCardById(cardId) {
    const sql = `
        SELECT 
            c.*,
            u.full_name as user_name,
            u.email as user_email,
            d.name as department_name
        FROM cards c
        LEFT JOIN users u ON c.user_id = u.id
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE c.id = ?
    `;
    return await getOneRow(sql, [cardId]);
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
            c.*,
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
            c.*,
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

// 5. Tạo thẻ mới
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
        cardData.issued_at || new Date(), 
        cardData.expired_at || null,      
        cardData.is_active !== undefined ? cardData.is_active : true
    ];

    const result = await executeQuery(sql, params);
    return await findCardById(result.insertId);
}

// 6. Cập nhật thẻ
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

// Các hàm tiện ích
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

// Tự động vô hiệu hóa các thẻ hết hạn với thư viện node-cron
async function deactivateExpiredCards() {
    const sql = `
        UPDATE cards 
        SET is_active = FALSE 
        WHERE is_active = TRUE 
        AND expired_at IS NOT NULL 
        AND expired_at < NOW()
    `;
    const result = await executeQuery(sql);
    return result.affectedRows; // Trả về số lượng thẻ vừa bị khóa
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
    deleteCard,
    deactivateExpiredCards
};