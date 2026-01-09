const { executeQuery, getOneRow } = require('../config/database');

// Tìm thẻ theo ID (với thông tin user và department)
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
    const card = await getOneRow(sql, [cardId]);
    return card;
}

// Lấy tất cả thẻ
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
        WHERE c.is_active = TRUE
        ORDER BY c.created_at DESC
    `;
    const cards = await executeQuery(sql, []);
    return cards;
}

// Tạo thẻ mới
async function createCard(cardData) {
    const sql = `
        INSERT INTO cards (
            card_uid,
            user_id,
            issue_date,
            expiry_date,
            is_active
        ) VALUES (?, ?, ?, ?, ?)
    `;

    const params = [
        cardData.card_uid,
        cardData.user_id,
        cardData.issue_date || new Date().toISOString().split('T')[0],
        cardData.expiry_date || null,
        cardData.is_active !== undefined ? cardData.is_active : true
    ];

    const result = await executeQuery(sql, params);
    return await findCardById(result.insertId);
}

// Cập nhật thẻ
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

    if (cardData.issue_date !== undefined) {
        updateFields.push('issue_date = ?');
        params.push(cardData.issue_date);
    }

    if (cardData.expiry_date !== undefined) {
        updateFields.push('expiry_date = ?');
        params.push(cardData.expiry_date);
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

// Kích hoạt thẻ
async function activateCard(cardId) {
    const sql = 'UPDATE cards SET is_active = TRUE WHERE id = ?';
    await executeQuery(sql, [cardId]);
    return await findCardById(cardId);
}

// Vô hiệu hóa thẻ
async function deactivateCard(cardId) {
    const sql = 'UPDATE cards SET is_active = FALSE WHERE id = ?';
    await executeQuery(sql, [cardId]);
    return await findCardById(cardId);
}

// Xóa thẻ (soft delete)
async function deleteCard(cardId) {
    const sql = 'UPDATE cards SET is_active = FALSE WHERE id = ?';
    const result = await executeQuery(sql, [cardId]);
    return result.affectedRows > 0;
}

// Lấy thẻ theo user
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
        WHERE c.user_id = ? AND c.is_active = TRUE
        ORDER BY c.created_at DESC
    `;
    const cards = await executeQuery(sql, [userId]);
    return cards;
}

module.exports = {
    findCardById,
    getAllCards,
    getCardsByUser,
    createCard,
    updateCard,
    activateCard,
    deactivateCard,
    deleteCard
};
