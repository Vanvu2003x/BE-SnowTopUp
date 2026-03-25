const axios = require("axios");
const { randomUUID } = require("crypto");
const { and, eq } = require("drizzle-orm");

const { db } = require("../../configs/drizzle");
const { games, topupPackages } = require("../../db/schema");

const PARTNER_BASE_URL = (process.env.PARTNER_API_URL || process.env.NGUONA_API_URL || "https://turbo.id.vn/api/partner").replace(/\/+$/, "");
const PARTNER_API_KEY = process.env.PARTNER_API_KEY || process.env.NGUONA_API_KEY;
const PARTNER_PRICE_RATE = Number(process.env.PARTNER_PRICE_RATE || process.env.PARTNER_PRICE_MULTIPLIER || 26000);
const SOURCE_CODE = "partner";

const sanitizeApiId = (value) => String(value ?? "").trim().substring(0, 100);

const slugify = (value = "") =>
    value
        .toString()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .substring(0, 50);

const toNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const resolveNumber = (value, fallback = 0) => {
    if (value === undefined || value === null || value === "") {
        return toNumber(fallback, 0);
    }

    return toNumber(value, toNumber(fallback, 0));
};

const buildApiPrice = (remotePrice) => Math.ceil(toNumber(remotePrice, 0) * PARTNER_PRICE_RATE);

const getMarkupCoefficient = (game) => {
    const markup = toNumber(game?.origin_markup_percent, 0);
    return markup > 0 ? markup : 1;
};

const normalizeInputFields = (inputFields) => {
    if (!Array.isArray(inputFields)) {
        return [];
    }

    return inputFields
        .map((field) => {
            const name = String(field?.name || "").trim();
            if (!name) {
                return null;
            }

            return {
                name,
                label: field?.label || name,
                type: field?.type || "text",
                required: Boolean(field?.required),
            };
        })
        .filter(Boolean);
};

const inferPackageType = (inputFields = []) => {
    const names = inputFields.map((field) => String(field?.name || "").toLowerCase());
    const hasLogin = names.includes("username") || names.includes("account");
    const hasPassword = names.includes("password") || names.includes("pass");

    if (hasLogin && hasPassword) {
        return "login";
    }

    return "uid";
};

const inferRequiresIdServer = (inputFields = []) => {
    const names = inputFields.map((field) => String(field?.name || "").toLowerCase());

    return names.some((name) =>
        ["id_server", "server_id", "serverid", "zone_id", "zoneid", "role_id"].includes(name)
    );
};

const buildPackageFileApi = (game, remotePackage) => ({
    source: SOURCE_CODE,
    gameId: remotePackage?.gameId || game.api_id,
    packageId: remotePackage?.id,
    category: remotePackage?.category || null,
    diamondAmount: remotePackage?.diamondAmount ?? null,
    bonus: remotePackage?.bonus ?? 0,
});

const buildPricing = (game, existingPackage, remotePackage) => {
    const apiPrice = buildApiPrice(remotePackage?.price);
    const originPrice = Math.ceil(apiPrice * getMarkupCoefficient(game));

    const priceBasic = existingPackage?.price_basic > 0 ? existingPackage.price_basic : originPrice;
    const pricePro = existingPackage?.price_pro > 0 ? existingPackage.price_pro : originPrice;
    const pricePlus = existingPackage?.price_plus > 0 ? existingPackage.price_plus : originPrice;
    const priceUser = existingPackage?.priceUser > 0 ? existingPackage.priceUser : 0;

    return {
        api_price: apiPrice,
        origin_price: originPrice,
        price_basic: priceBasic,
        price_pro: pricePro,
        price_plus: pricePlus,
        price: priceUser > originPrice ? priceUser : priceBasic,
        profit_percent_basic: 0,
        profit_percent_pro: 0,
        profit_percent_plus: 0,
        profit_percent_user: 0,
    };
};

const findExistingGame = async (gamecode, apiId) => {
    let existing = null;

    if (gamecode) {
        [existing] = await db.select().from(games).where(eq(games.gamecode, gamecode)).limit(1);
    }

    if (!existing && apiId) {
        [existing] = await db.select().from(games).where(eq(games.api_id, apiId)).limit(1);
    }

    return existing || null;
};

const findExistingPackage = async (gameId, apiId, packageName) => {
    let existing = null;

    if (apiId) {
        [existing] = await db
            .select()
            .from(topupPackages)
            .where(and(eq(topupPackages.game_id, gameId), eq(topupPackages.api_id, apiId)))
            .limit(1);
    }

    if (!existing && packageName) {
        [existing] = await db
            .select()
            .from(topupPackages)
            .where(and(eq(topupPackages.game_id, gameId), eq(topupPackages.package_name, packageName)))
            .limit(1);
    }

    return existing || null;
};

const ProviderService = {
    _callApi: async (method, endpoint, data = null) => {
        if (!PARTNER_API_KEY) {
            throw new Error("Missing PARTNER_API_KEY in environment");
        }

        try {
            const response = await axios({
                method,
                url: `${PARTNER_BASE_URL}${endpoint}`,
                timeout: 30000,
                headers: {
                    "x-api-key": PARTNER_API_KEY,
                    ...(data ? { "Content-Type": "application/json" } : {}),
                },
                ...(data ? { data } : {}),
            });

            return response.data;
        } catch (error) {
            const details = error.response?.data || error.message;
            console.error(`[Partner API] ${method} ${endpoint} failed:`, JSON.stringify(details, null, 2));
            throw error;
        }
    },

    syncGames: async () => {
        try {
            const res = await ProviderService._callApi("GET", "/games");
            const remoteGames = Array.isArray(res?.data) ? res.data : [];

            for (const remoteGame of remoteGames) {
                const apiId = sanitizeApiId(remoteGame?.id);
                const gamecode = (remoteGame?.slug || remoteGame?.gamecode || slugify(remoteGame?.displayName || remoteGame?.name)).substring(0, 50);

                if (!gamecode) {
                    continue;
                }

                const inputFields = normalizeInputFields(remoteGame?.inputFields || remoteGame?.input_fields);
                const existing = await findExistingGame(gamecode, apiId);

                const payload = {
                    api_id: apiId,
                    api_source: SOURCE_CODE,
                    name: existing?.name || remoteGame?.displayName || remoteGame?.name || gamecode,
                    gamecode,
                    server: Array.isArray(remoteGame?.servers) ? remoteGame.servers : existing?.server || [],
                    input_fields: inputFields,
                    thumbnail: remoteGame?.thumbnail || existing?.thumbnail || null,
                    publisher: remoteGame?.publisher || existing?.publisher || null,
                };

                if (existing) {
                    await db
                        .update(games)
                        .set({
                            ...payload,
                            profit_percent_basic: existing.profit_percent_basic,
                            profit_percent_pro: existing.profit_percent_pro,
                            profit_percent_plus: existing.profit_percent_plus,
                            origin_markup_percent: existing.origin_markup_percent,
                        })
                        .where(eq(games.id, existing.id));
                } else {
                    await db.insert(games).values({
                        id: randomUUID(),
                        ...payload,
                    });
                }
            }

            return {
                success: true,
                count: remoteGames.length,
            };
        } catch (error) {
            console.error("[Partner API] Sync games failed:", error.message);
            return {
                success: false,
                error: error.message,
            };
        }
    },

    syncPackages: async () => {
        try {
            const syncedGames = await db.select().from(games).where(eq(games.api_source, SOURCE_CODE));

            for (const game of syncedGames) {
                if (!game?.api_id) {
                    continue;
                }

                try {
                    const res = await ProviderService._callApi("GET", `/packages/${encodeURIComponent(game.api_id)}`);
                    const remotePackages = Array.isArray(res?.data) ? res.data : [];
                    const packageType = inferPackageType(game?.input_fields || []);
                    const defaultRequiresIdServer = inferRequiresIdServer(game?.input_fields || []);

                    for (const remotePackage of remotePackages) {
                        const apiId = sanitizeApiId(remotePackage?.id);
                        const packageName = remotePackage?.displayName || remotePackage?.name || `Goi ${apiId}`;
                        const existingPackage = await findExistingPackage(game.id, apiId, packageName);
                        const pricing = buildPricing(game, existingPackage, remotePackage);
                        const fileAPI = buildPackageFileApi(game, remotePackage);

                        const payload = {
                            api_id: apiId,
                            game_id: game.id,
                            package_name: packageName,
                            package_type: existingPackage?.package_type || packageType,
                            thumbnail: remotePackage?.thumbnail || existingPackage?.thumbnail || game?.thumbnail || null,
                            status: existingPackage?.status || "active",
                            sale: existingPackage?.sale || false,
                            id_server:
                                existingPackage?.id_server !== undefined && existingPackage?.id_server !== null
                                    ? existingPackage.id_server
                                    : defaultRequiresIdServer,
                            fileAPI,
                            ...pricing,
                        };

                        if (existingPackage) {
                            await db
                                .update(topupPackages)
                                .set({
                                    api_id: apiId || existingPackage.api_id,
                                    fileAPI,
                                    ...pricing,
                                })
                                .where(eq(topupPackages.id, existingPackage.id));
                        } else {
                            await db.insert(topupPackages).values({
                                id: randomUUID(),
                                ...payload,
                            });
                        }
                    }
                } catch (error) {
                    console.error(`[Partner API] Sync packages failed for game ${game.gamecode}:`, error.message);
                }
            }

            return {
                success: true,
            };
        } catch (error) {
            console.error("[Partner API] Sync packages failed:", error.message);
            return {
                success: false,
                error: error.message,
            };
        }
    },

    createOrder: async ({ orderId, gameApiId, packageApiId, accountInfo, quantity = 1 }) => {
        try {
            const payload = {
                gameId: Number(gameApiId),
                items: [
                    {
                        packageId: Number(packageApiId),
                        quantity: Number(quantity) > 0 ? Number(quantity) : 1,
                    },
                ],
                gameAccountInfo: accountInfo || {},
            };

            console.log(`[Partner API] Creating external order for local order #${orderId}:`, JSON.stringify(payload));

            const res = await ProviderService._callApi("POST", "/orders", payload);

            if (res?.success && res?.data?.orderId) {
                return {
                    status: "success",
                    data: {
                        id: String(res.data.orderId),
                        price: res.data.totalPrice,
                        orderStatus: res.data.status,
                    },
                };
            }

            return {
                status: "failed",
                message: res?.message || "Partner API order creation failed",
            };
        } catch (error) {
            return {
                status: "failed",
                message: error.response?.data?.message || error.message,
            };
        }
    },

    checkOrderStatus: async (externalOrderId) => {
        try {
            return await ProviderService._callApi("GET", `/orders/${encodeURIComponent(externalOrderId)}`);
        } catch (error) {
            return null;
        }
    },
};

module.exports = ProviderService;
