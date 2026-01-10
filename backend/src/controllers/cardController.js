const {
    findCardById,
    getAllCards,
    getCardsByUser, // Lưu ý: Model giữ tên này hay findCardsByUserId thì sửa cho khớp nhé (như file trước chúng ta chốt là getCardsByUser)
    createCard,
    updateCard,
    activateCard,
    deactivateCard,
    deleteCard
} = require('../models/Card');

// GET /api/cards - Lấy danh sách tất cả thẻ
async function getAllCardsHandler(req, res, next) {
    try {
        const cards = await getAllCards();
        return res.json({
            success: true,
            data: cards,
            count: cards.length
        });
    } catch (error) {
        console.error('Error in getAllCardsHandler:', error);
        next(error);
    }
}

// GET /api/cards/:id - Lấy thông tin thẻ theo ID
async function getCardByIdHandler(req, res, next) {
    try {
        const cardId = req.params.id;
        const card = await findCardById(cardId);

        if (!card) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thẻ'
            });
        }

        return res.json({
            success: true,
            data: card
        });
    } catch (error) {
        console.error('Error in getCardByIdHandler:', error);
        next(error);
    }
}

// POST /api/cards - Tạo thẻ mới
async function createCardHandler(req, res, next) {
    try {
        // --- SỬA TÊN BIẾN TẠI ĐÂY ---
        const { card_uid, user_id, issued_at, expired_at, is_active } = req.body;

        // Validate required fields
        if (!card_uid || !user_id) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin bắt buộc: card_uid, user_id'
            });
        }

        const cardData = {
            card_uid,
            user_id: parseInt(user_id),
            // --- DÙNG TÊN MỚI ---
            issued_at: issued_at || new Date().toISOString().split('T')[0],
            expired_at: expired_at || null,
            // --------------------
            is_active: is_active !== undefined ? is_active : true
        };

        const newCard = await createCard(cardData);

        console.log('Card created:', newCard.id, newCard.card_uid, 'for user:', user_id);

        return res.status(201).json({
            success: true,
            message: 'Tạo thẻ thành công',
            data: newCard
        });

    } catch (error) {
        console.error('Error in createCardHandler:', error);
        
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'Mã thẻ UID đã tồn tại'
            });
        }
        
        next(error);
    }
}

// PUT /api/cards/:id - Cập nhật thông tin thẻ
async function updateCardHandler(req, res, next) {
    try {
        const cardId = req.params.id;
        // --- SỬA TÊN BIẾN TẠI ĐÂY ---
        const { card_uid, user_id, issued_at, expired_at, is_active } = req.body;

        const existingCard = await findCardById(cardId);
        if (!existingCard) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thẻ'
            });
        }

        const cardData = {};
        if (card_uid !== undefined) cardData.card_uid = card_uid;
        if (user_id !== undefined) cardData.user_id = parseInt(user_id);
        
        // --- CẬP NHẬT KEY MỚI ---
        if (issued_at !== undefined) cardData.issued_at = issued_at;
        if (expired_at !== undefined) cardData.expired_at = expired_at;
        // ------------------------

        if (is_active !== undefined) cardData.is_active = is_active;

        const updatedCard = await updateCard(cardId, cardData);

        console.log('Card updated:', updatedCard.id, updatedCard.card_uid);

        return res.json({
            success: true,
            message: 'Cập nhật thẻ thành công',
            data: updatedCard
        });

    } catch (error) {
        console.error('Error in updateCardHandler:', error);
        
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'Mã thẻ UID đã tồn tại'
            });
        }
        
        next(error);
    }
}

// ... (Các hàm activateCardHandler, deactivateCardHandler, deleteCardHandler GIỮ NGUYÊN KHÔNG ĐỔI)
async function activateCardHandler(req, res, next) {
    try {
        const cardId = req.params.id;
        const existingCard = await findCardById(cardId);
        if (!existingCard) return res.status(404).json({ success: false, message: 'Không tìm thấy thẻ' });
        if (existingCard.is_active) return res.status(400).json({ success: false, message: 'Thẻ đã được kích hoạt' });

        const activatedCard = await activateCard(cardId);
        console.log('Card activated:', activatedCard.card_uid, 'by', req.user.full_name);

        return res.json({ success: true, message: 'Đã kích hoạt thẻ thành công', data: activatedCard });
    } catch (error) {
        console.error('Error in activateCardHandler:', error);
        next(error);
    }
}

async function deactivateCardHandler(req, res, next) {
    try {
        const cardId = req.params.id;
        const existingCard = await findCardById(cardId);
        if (!existingCard) return res.status(404).json({ success: false, message: 'Không tìm thấy thẻ' });
        if (!existingCard.is_active) return res.status(400).json({ success: false, message: 'Thẻ đã bị vô hiệu hóa' });

        const deactivatedCard = await deactivateCard(cardId);
        console.log('Card deactivated:', deactivatedCard.card_uid, 'by', req.user.full_name);

        return res.json({ success: true, message: 'Đã vô hiệu hóa thẻ thành công', data: deactivatedCard });
    } catch (error) {
        console.error('Error in deactivateCardHandler:', error);
        next(error);
    }
}

async function deleteCardHandler(req, res, next) {
    try {
        const cardId = req.params.id;
        const existingCard = await findCardById(cardId);
        if (!existingCard) return res.status(404).json({ success: false, message: 'Không tìm thấy thẻ' });

        const deleted = await deleteCard(cardId);
        if (!deleted) return res.status(500).json({ success: false, message: 'Xóa thẻ thất bại' });

        console.log('Card deleted:', existingCard.card_uid, 'by', req.user.full_name);
        return res.json({ success: true, message: 'Đã xóa thẻ thành công' });
    } catch (error) {
        console.error('Error in deleteCardHandler:', error);
        next(error);
    }
}

module.exports = {
    getAllCardsHandler,
    getCardByIdHandler,
    createCardHandler,
    updateCardHandler,
    activateCardHandler,
    deactivateCardHandler,
    deleteCardHandler
};