const cron = require("node-cron");

const WalletLogService = require("../modules/walletLog/walletLog.service");

const initCronJobs = () => {
    cron.schedule("10,30,50 * * * *", async () => {
        await WalletLogService.autoCheckExpiredTransactions();
    });

    cron.schedule("*/30 * * * *", async () => {
        const ProviderService = require("../modules/nguona/nguona.service");
        await ProviderService.syncGames();
        await ProviderService.syncPackages();
    });

    cron.schedule("*/3 * * * *", async () => {
        const OrderService = require("../modules/order/order.service");

        try {
            const result = await OrderService.syncAllExternalOrders();
            console.log(`[Cron] Source sync completed. Scanned: ${result.scanned}, updated: ${result.updated}`);
        } catch (error) {
            console.error("[Cron] Source status sync error:", error);
        }
    });
};

module.exports = {
    initCronJobs,
};
