const cron = require("node-cron");
const { eq } = require("drizzle-orm");

const { db } = require("../configs/drizzle");
const { appSettings } = require("../db/schema");
const WalletLogService = require("../modules/walletLog/walletLog.service");

const PARTNER_SYNC_SETTING_KEY = "partner_sync_interval_minutes";
const DEFAULT_PARTNER_SYNC_INTERVAL = 30;
const MIN_PARTNER_SYNC_INTERVAL = 1;
const MAX_PARTNER_SYNC_INTERVAL = 59;

let partnerSyncTask = null;
let partnerSyncInFlight = false;
let cronInitialized = false;

const clampPartnerSyncInterval = (value) => {
    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
        return DEFAULT_PARTNER_SYNC_INTERVAL;
    }

    return Math.min(MAX_PARTNER_SYNC_INTERVAL, Math.max(MIN_PARTNER_SYNC_INTERVAL, Math.round(parsed)));
};

const getPartnerSyncCronExpression = (intervalMinutes) => `*/${clampPartnerSyncInterval(intervalMinutes)} * * * *`;

const getPartnerSyncConfig = async () => {
    const [setting] = await db
        .select()
        .from(appSettings)
        .where(eq(appSettings.setting_key, PARTNER_SYNC_SETTING_KEY))
        .limit(1);

    return {
        intervalMinutes: clampPartnerSyncInterval(setting?.setting_value),
    };
};

const savePartnerSyncConfig = async (intervalMinutes) => {
    const normalizedInterval = clampPartnerSyncInterval(intervalMinutes);

    await db
        .insert(appSettings)
        .values({
            setting_key: PARTNER_SYNC_SETTING_KEY,
            setting_value: String(normalizedInterval),
        })
        .onDuplicateKeyUpdate({
            set: {
                setting_value: String(normalizedInterval),
            },
        });

    return {
        intervalMinutes: normalizedInterval,
    };
};

const syncPartnerData = async () => {
    if (partnerSyncInFlight) {
        return {
            status: "skipped",
            message: "Partner sync is already running.",
        };
    }

    partnerSyncInFlight = true;

    try {
        const ProviderService = require("../modules/nguona/nguona.service");
        const gamesResult = await ProviderService.syncGames();
        const packagesResult = gamesResult?.success
            ? await ProviderService.syncPackages()
            : {
                  success: false,
                  skipped: true,
                  message: "Skipped package sync because game sync failed.",
              };

        return {
            status: "success",
            games: gamesResult,
            packages: packagesResult,
        };
    } catch (error) {
        console.error("[Cron] Partner sync error:", error);
        throw error;
    } finally {
        partnerSyncInFlight = false;
    }
};

const schedulePartnerSyncTask = async (intervalMinutes) => {
    const normalizedInterval = clampPartnerSyncInterval(intervalMinutes);

    if (partnerSyncTask) {
        partnerSyncTask.stop();
        partnerSyncTask.destroy();
    }

    partnerSyncTask = cron.schedule(getPartnerSyncCronExpression(normalizedInterval), async () => {
        try {
            const result = await syncPartnerData();
            console.log(`[Cron] Partner sync completed: ${JSON.stringify(result)}`);
        } catch (error) {
            console.error("[Cron] Partner sync failed:", error.message);
        }
    });

    return {
        intervalMinutes: normalizedInterval,
    };
};

const updatePartnerSyncInterval = async (intervalMinutes) => {
    const config = await savePartnerSyncConfig(intervalMinutes);
    await schedulePartnerSyncTask(config.intervalMinutes);
    return config;
};

const runPartnerSyncNow = async () => {
    return await syncPartnerData();
};

const initCronJobs = async () => {
    if (cronInitialized) {
        return;
    }

    cronInitialized = true;

    cron.schedule("10,30,50 * * * *", async () => {
        await WalletLogService.autoCheckExpiredTransactions();
    });

    const partnerConfig = await getPartnerSyncConfig();
    await schedulePartnerSyncTask(partnerConfig.intervalMinutes);

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
    getPartnerSyncConfig,
    updatePartnerSyncInterval,
    runPartnerSyncNow,
};
