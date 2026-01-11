const cron = require('node-cron');
const { deactivateExpiredCards } = require('../models/Card');

function initCronJobs() {
    console.log('Initializing Cron Jobs để check xem thẻ còn hạn dùng không ');

    // Cấu hình: Chạy mỗi giờ một lần (hoặc mỗi ngày lúc 00:00)
    // '0 * * * *' : Chạy ở phút thứ 0 của mỗi giờ
    // '0 0 * * *' : Chạy vào 00:00 mỗi ngày
    cron.schedule('0 0 * * *', async () => {
        try {
            console.log('Running automatic card expiration check...');
            const count = await deactivateExpiredCards();
            if (count > 0) {
                console.log(`[CronJob] Đã tự động vô hiệu hóa ${count} thẻ hết hạn.`);
            } else {
                console.log('[CronJob] Không có thẻ nào hết hạn trong đợt quét này.');
            }
        } catch (error) {
            console.error('[CronJob Error] Lỗi khi quét thẻ hết hạn:', error);
        }
    });
}

module.exports = { initCronJobs };