const { executeQuery, getOneRow } = require('../config/database');

// tìm thẻ theo ID
async function findCardById(cardId) {
    const sql = `
        SELECT
            c.*,
            u.full_name as user_name,
            u.email as user_email,
            u.employee_id,
            u.department_id,
            u.position,
            u.role,
            u.is_active as user_is_active
        FROM cards c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.id = ?
    `;

    const card = await getOneRow(sql, [cardId]);
    return card;
}

// tìm thẻ theo card_uid (dùng khi quẹt thẻ)
async function findCardByUid(cardUid) {
    const sql = `
        SELECT
            c.*,
            u.id as user_id,
            u.full_name,
            u.email,
            u.employee_id,
            u.department_id,
            u.position,
            u.role,
            u.is_active as user_is_active,
            d.name as department_name
        FROM cards c
        LEFT JOIN users u ON c.user_id = u.id
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE c.card_uid = ?
    `;

    const card = await getOneRow(sql, [cardUid]);
    return card;
}

// tìm tất cả thẻ của một user
async function findCardsByUserId(userId) {
    const sql = `
        SELECT * FROM cards
        WHERE user_id = ?
        ORDER BY created_at DESC
    `;

    const cards = await executeQuery(sql, [userId]);
    return cards;
}

// lấy tất cả thẻ (cho admin xem danh sách)
async function getAllCards() {
    const sql = `
        SELECT
            c.id,
            c.card_uid,
            c.user_id,
            c.is_active,
            c.issued_at,
            c.expired_at,
            c.notes,
            c.created_at,
            u.full_name as user_name,
            u.email as user_email,
            u.employee_id
        FROM cards c
        LEFT JOIN users u ON c.user_id = u.id
        ORDER BY c.created_at DESC
    `;

    const cards = await executeQuery(sql, []);
    return cards;
}

// Helper: Convert ISO datetime sang MySQL datetime format
function toMySQLDatetime(date) {
    if (!date) return null;
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;

    // Format: YYYY-MM-DD HH:MM:SS
    return d.toISOString().slice(0, 19).replace('T', ' ');
}

// tạo thẻ mới
async function createCard(cardData) {
    const sql = `
        INSERT INTO cards (
            card_uid,
            user_id,
            is_active,
            issued_at,
            expired_at,
            notes
        ) VALUES (?, ?, ?, ?, ?, ?)
    `;

    const params = [
        cardData.card_uid,
        cardData.user_id,
        cardData.is_active !== undefined ? cardData.is_active : true,
        toMySQLDatetime(cardData.issued_at) || toMySQLDatetime(new Date()),
        toMySQLDatetime(cardData.expired_at),
        cardData.notes || null
    ];

    const result = await executeQuery(sql, params);

    // Trả về thẻ vừa tạo (có kèm user info)
    return await findCardById(result.insertId);
}

// cập nhật thẻ
async function updateCard(cardId, cardData) {
    const updateFields = [];
    const params = [];

    // Chỉ update các field được gửi lên
    if (cardData.user_id !== undefined) {
        updateFields.push('user_id = ?');
        params.push(cardData.user_id);
    }

    if (cardData.is_active !== undefined) {
        updateFields.push('is_active = ?');
        params.push(cardData.is_active);
    }

    if (cardData.expired_at !== undefined) {
        updateFields.push('expired_at = ?');
        params.push(toMySQLDatetime(cardData.expired_at));
    }

    if (cardData.notes !== undefined) {
        updateFields.push('notes = ?');
        params.push(cardData.notes);
    }

    // Nếu không có gì để update thì return card hiện tại
    if (updateFields.length === 0) {
        return await findCardById(cardId);
    }

    // Thêm cardId vào params
    params.push(cardId);

    const sql = `UPDATE cards SET ${updateFields.join(', ')} WHERE id = ?`;

    await executeQuery(sql, params);

    return await findCardById(cardId);
}

// kích hoạt thẻ
async function activateCard(cardId) {
    const sql = 'UPDATE cards SET is_active = TRUE WHERE id = ?';
    await executeQuery(sql, [cardId]);
    return await findCardById(cardId);
}

// vô hiệu hóa thẻ
async function deactivateCard(cardId) {
    const sql = 'UPDATE cards SET is_active = FALSE WHERE id = ?';
    await executeQuery(sql, [cardId]);
    return await findCardById(cardId);
}

// xóa thẻ
async function deleteCard(cardId) {
    const sql = 'DELETE FROM cards WHERE id = ?';
    const result = await executeQuery(sql, [cardId]);
    return result.affectedRows > 0;
}

module.exports = {
    findCardById,
    findCardByUid,
    findCardsByUserId,
    getAllCards,
    createCard,
    updateCard,
    activateCard,
    deactivateCard,
    deleteCard
};
