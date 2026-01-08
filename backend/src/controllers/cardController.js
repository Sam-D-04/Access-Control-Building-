const {
    findCardById,
    findCardByUid,
    findCardsByUserId,
    getAllCards,
    createCard,
    updateCard,
    activateCard,
    deactivateCard,
    deleteCard
} = require('../models/Card');

// GET /api/cards - Lấy danh sách tất cả thẻ
async function getAllCardsHandler(req, res, next) {
    try {
        const { user_id } = req.query;

        let cards;

        // Filter theo user_id nếu có
        if (user_id) {
            cards = await findCardsByUserId(user_id);
        }
        // Lấy tất cả nếu không có filter
        else {
            cards = await getAllCards();
        }

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

// POST /api/cards - Tạo thẻ mới (admin only)
async function createCardHandler(req, res, next) {
    try {
        const { card_uid, user_id, is_active, issued_at, expired_at, notes } = req.body;

        // Validate required fields
        if (!card_uid || !user_id) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin bắt buộc: card_uid, user_id'
            });
        }

        // Kiểm tra card_uid đã tồn tại chưa
        const existingCard = await findCardByUid(card_uid);
        if (existingCard) {
            return res.status(400).json({
                success: false,
                message: 'Card UID đã được sử dụng'
            });
        }

        // Validate expired_at phải sau issued_at
        if (expired_at && issued_at) {
            const issuedDate = new Date(issued_at);
            const expiredDate = new Date(expired_at);
            if (expiredDate <= issuedDate) {
                return res.status(400).json({
                    success: false,
                    message: 'Ngày hết hạn phải sau ngày tạo'
                });
            }
        }

        const cardData = {
            card_uid,
            user_id,
            is_active: is_active !== undefined ? is_active : true,
            issued_at: issued_at || new Date(),
            expired_at: expired_at || null,
            notes: notes || null
        };

        const newCard = await createCard(cardData);

        console.log('Card created:', newCard.card_uid, 'for user', newCard.user_name);

        return res.status(201).json({
            success: true,
            message: 'Tạo thẻ thành công',
            data: newCard
        });

    } catch (error) {
        console.error('Error in createCardHandler:', error);
        next(error);
    }
}

// PUT /api/cards/:id - Cập nhật thông tin thẻ
async function updateCardHandler(req, res, next) {
    try {
        const cardId = req.params.id;
        const { user_id, is_active, expired_at, notes } = req.body;

        // Kiểm tra thẻ có tồn tại không
        const existingCard = await findCardById(cardId);
        if (!existingCard) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thẻ'
            });
        }

        // Validate expired_at nếu có
        if (expired_at) {
            const issuedDate = new Date(existingCard.issued_at);
            const expiredDate = new Date(expired_at);
            if (expiredDate <= issuedDate) {
                return res.status(400).json({
                    success: false,
                    message: 'expired_at phải sau issued_at'
                });
            }
        }

        const cardData = {};
        if (user_id !== undefined) cardData.user_id = user_id;
        if (is_active !== undefined) cardData.is_active = is_active;
        if (expired_at !== undefined) cardData.expired_at = expired_at;
        if (notes !== undefined) cardData.notes = notes;

        const updatedCard = await updateCard(cardId, cardData);

        console.log('Card updated:', updatedCard.card_uid);

        return res.json({
            success: true,
            message: 'Cập nhật thẻ thành công',
            data: updatedCard
        });

    } catch (error) {
        console.error('Error in updateCardHandler:', error);
        next(error);
    }
}

// PUT /api/cards/:id/activate - Kích hoạt thẻ
async function activateCardHandler(req, res, next) {
    try {
        const cardId = req.params.id;

        // Kiểm tra thẻ có tồn tại không
        const existingCard = await findCardById(cardId);
        if (!existingCard) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thẻ'
            });
        }

        // Kiểm tra thẻ đã active chưa
        if (existingCard.is_active) {
            return res.status(400).json({
                success: false,
                message: 'Thẻ đã ở trạng thái kích hoạt'
            });
        }

        const activatedCard = await activateCard(cardId);

        console.log('Card activated:', activatedCard.card_uid);

        return res.json({
            success: true,
            message: 'Đã kích hoạt thẻ thành công',
            data: activatedCard
        });

    } catch (error) {
        console.error('Error in activateCardHandler:', error);
        next(error);
    }
}

// PUT /api/cards/:id/deactivate - Vô hiệu hóa thẻ (
async function deactivateCardHandler(req, res, next) {
    try {
        const cardId = req.params.id;

        // Kiểm tra thẻ có tồn tại không
        const existingCard = await findCardById(cardId);
        if (!existingCard) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thẻ'
            });
        }

        // Nếu thẻ bị inactive
        if (!existingCard.is_active) {
            return res.status(400).json({
                success: false,
                message: 'Thẻ đã bị vô hiệu hóa'
            });
        }

        const deactivatedCard = await deactivateCard(cardId);

        console.log('Card deactivated:', deactivatedCard.card_uid);

        return res.json({
            success: true,
            message: 'Đã vô hiệu hóa thẻ thành công',
            data: deactivatedCard
        });

    } catch (error) {
        console.error('Error in deactivateCardHandler:', error);
        next(error);
    }
}

// DELETE /api/cards/:id - Xóa thẻ 
async function deleteCardHandler(req, res, next) {
    try {
        const cardId = req.params.id;

        // Kiểm tra thẻ có tồn tại không
        const existingCard = await findCardById(cardId);
        if (!existingCard) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thẻ'
            });
        }

        const deleted = await deleteCard(cardId);

        if (!deleted) {
            return res.status(500).json({
                success: false,
                message: 'Xóa thẻ thất bại'
            });
        }

        console.log('Card deleted:', existingCard.card_uid);

        return res.json({
            success: true,
            message: 'Đã xóa thẻ thành công'
        });

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
