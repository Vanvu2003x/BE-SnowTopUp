const axios = require("axios");
const { randomUUID } = require("crypto");
const { and, eq } = require("drizzle-orm");

const { db } = require("../../configs/drizzle");
const { games, topupPackages } = require("../../db/schema");

const PARTNER_BASE_URL = (process.env.PARTNER_API_URL || process.env.NGUONA_API_URL || "https://turbo.id.vn/api/partner").replace(/\/+$/, "");
const PARTNER_CATALOG_BASE_URL = (
    process.env.PARTNER_CATALOG_API_URL ||
    process.env.PARTNER_PUBLIC_API_URL ||
    PARTNER_BASE_URL.replace(/\/partner$/, "")
).replace(/\/+$/, "");
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

const buildConvertedApiPrice = (remotePrice) => Math.ceil(toNumber(remotePrice, 0) * PARTNER_PRICE_RATE);

const resolveRoleBasedPrice = (priceByRole = {}) =>
    priceByRole?.AGENT ??
    priceByRole?.USER ??
    priceByRole?.USER1 ??
    priceByRole?.ADMIN ??
    null;

const resolveRemotePackagePrice = (remotePackage = {}) => {
    const directVndPrice = toNumber(
        remotePackage?.price ?? resolveRoleBasedPrice(remotePackage?.priceByRole),
        NaN
    );

    if (Number.isFinite(directVndPrice) && directVndPrice > 0) {
        return Math.ceil(directVndPrice);
    }

    const legacyForeignPrice =
        remotePackage?.originalPrice ??
        remotePackage?.sellPriceUsdAdmin ??
        remotePackage?.sellPriceUsdAgent ??
        remotePackage?.sellPriceUsd ??
        0;

    return buildConvertedApiPrice(legacyForeignPrice);
};

const getMarkupCoefficient = (game) => {
    const markup = toNumber(game?.origin_markup_percent, 0);
    return markup > 0 ? 1 + markup / 100 : 1;
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
    externalId: remotePackage?.externalId || null,
    ownerGameId: remotePackage?.ownerGameId || null,
    ownerGameSlug: remotePackage?.ownerGameSlug || null,
    ownerGameName: remotePackage?.ownerGameName || null,
    ownerGameDisplayName: remotePackage?.ownerGameDisplayName || null,
    ownerGameSourceType: remotePackage?.ownerGameSourceType || null,
    sortOrder: remotePackage?.sortOrder ?? null,
});

const computePriceFromPercent = (originPrice, percent) =>
    Math.max(0, Math.ceil(toNumber(originPrice, 0) * (1 + toNumber(percent, 0) / 100)));

const buildPricing = (game, existingPackage, remotePackage) => {
    const apiPrice = resolveRemotePackagePrice(remotePackage);
    const originPrice = Math.ceil(apiPrice * getMarkupCoefficient(game));
    const percentBasic = resolveNumber(existingPackage?.profit_percent_basic, 0);
    const percentPro = resolveNumber(existingPackage?.profit_percent_pro, 0);
    const percentPlus = resolveNumber(existingPackage?.profit_percent_plus, 0);

    const priceBasic = computePriceFromPercent(originPrice, percentBasic);
    const pricePro = computePriceFromPercent(originPrice, percentPro);
    const pricePlus = computePriceFromPercent(originPrice, percentPlus);

    return {
        api_price: apiPrice,
        origin_price: originPrice,
        price_basic: priceBasic,
        price_pro: pricePro,
        price_plus: pricePlus,
        price: priceBasic,
        profit_percent_basic: percentBasic,
        profit_percent_pro: percentPro,
        profit_percent_plus: percentPlus,
        profit_percent_user: existingPackage?.profit_percent_user || 0,
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

        if (existing) {
            return existing;
        }
    }

    if (!apiId && packageName) {
        [existing] = await db
            .select()
            .from(topupPackages)
            .where(and(eq(topupPackages.game_id, gameId), eq(topupPackages.api_package_name, packageName)))
            .limit(1);
    }

    if (!apiId && !existing && packageName) {
        [existing] = await db
            .select()
            .from(topupPackages)
            .where(and(eq(topupPackages.game_id, gameId), eq(topupPackages.package_name, packageName)))
            .limit(1);
    }

    return existing || null;
};

const upsertRemoteGame = async (remoteGame) => {
    const apiId = sanitizeApiId(remoteGame?.id);
    const gamecode = (remoteGame?.slug || remoteGame?.gamecode || slugify(remoteGame?.displayName || remoteGame?.name)).substring(0, 50);

    if (!gamecode) {
        return null;
    }

    const inputFields = normalizeInputFields(remoteGame?.inputFields || remoteGame?.input_fields);
    const existing = await findExistingGame(gamecode, apiId);
    const apiName = remoteGame?.displayName || remoteGame?.name || gamecode;
    const apiThumbnail = remoteGame?.imageUrl || remoteGame?.thumbnail || null;
    const resolvedName = existing?.custom_name || apiName;
    const resolvedThumbnail = existing?.custom_thumbnail || apiThumbnail || existing?.thumbnail || null;

    const payload = {
        api_id: apiId,
        api_source: SOURCE_CODE,
        api_name: apiName,
        custom_name: existing?.custom_name || null,
        name: resolvedName,
        gamecode,
        server: Array.isArray(remoteGame?.servers) ? remoteGame.servers : existing?.server || [],
        input_fields: inputFields,
        api_thumbnail: apiThumbnail,
        custom_thumbnail: existing?.custom_thumbnail || null,
        thumbnail: resolvedThumbnail,
        publisher: remoteGame?.publisher || existing?.publisher || null,
        poster: existing?.poster || null,
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
                is_hot: existing.is_hot,
            })
            .where(eq(games.id, existing.id));

        return {
            ...existing,
            ...payload,
            id: existing.id,
        };
    }

    const newGame = {
        id: randomUUID(),
        ...payload,
    };

    await db.insert(games).values(newGame);
    return newGame;
};

const ProviderService = {
    _callJsonApi: async ({
        method,
        baseUrl,
        endpoint,
        data = null,
        includeApiKey = false,
        label = "Partner API",
    }) => {
        try {
            const response = await axios({
                method,
                url: `${baseUrl}${endpoint}`,
                timeout: 30000,
                headers: {
                    ...(includeApiKey && PARTNER_API_KEY ? { "x-api-key": PARTNER_API_KEY } : {}),
                    ...(data ? { "Content-Type": "application/json" } : {}),
                },
                ...(data ? { data } : {}),
            });

            return response.data;
        } catch (error) {
            const details = error.response?.data || error.message;
            console.error(`[${label}] ${method} ${endpoint} failed:`, JSON.stringify(details, null, 2));
            throw error;
        }
    },

    _callApi: async (method, endpoint, data = null) => {
        if (!PARTNER_API_KEY) {
            throw new Error("Missing PARTNER_API_KEY in environment");
        }

        return ProviderService._callJsonApi({
            method,
            baseUrl: PARTNER_BASE_URL,
            endpoint,
            data,
            includeApiKey: true,
            label: "Partner API",
        });
    },

    _callCatalogApi: async (method, endpoint, data = null) =>
        ProviderService._callJsonApi({
            method,
            baseUrl: PARTNER_CATALOG_BASE_URL,
            endpoint,
            data,
            includeApiKey: Boolean(PARTNER_API_KEY),
            label: "Partner Catalog",
        }),

    fetchRemoteGames: async () => {
        try {
            const res = await ProviderService._callCatalogApi("GET", "/games");
            return {
                mode: "catalog",
                endpoint: "/games",
                data: Array.isArray(res?.data) ? res.data : [],
            };
        } catch (catalogError) {
            const res = await ProviderService._callApi("GET", "/games");
            return {
                mode: "partner",
                endpoint: "/games",
                data: Array.isArray(res?.data) ? res.data : [],
            };
        }
    },

    fetchPackagesForGame: async (game) => {
        const slug = String(game?.gamecode || "").trim();
        const apiId = sanitizeApiId(game?.api_id);
        const attempts = [];

        if (slug) {
            attempts.push({
                mode: "catalog-slug",
                endpoint: `/packages?slug=${encodeURIComponent(slug)}`,
                request: () => ProviderService._callCatalogApi("GET", `/packages?slug=${encodeURIComponent(slug)}`),
            });
        }

        if (apiId) {
            attempts.push({
                mode: "catalog-game-id",
                endpoint: `/packages?gameId=${encodeURIComponent(apiId)}`,
                request: () => ProviderService._callCatalogApi("GET", `/packages?gameId=${encodeURIComponent(apiId)}`),
            });
            attempts.push({
                mode: "partner-id",
                endpoint: `/packages/${encodeURIComponent(apiId)}`,
                request: () => ProviderService._callApi("GET", `/packages/${encodeURIComponent(apiId)}`),
            });
        }

        let lastError = null;

        for (const attempt of attempts) {
            try {
                const res = await attempt.request();
                return {
                    mode: attempt.mode,
                    endpoint: attempt.endpoint,
                    data: Array.isArray(res?.data) ? res.data : [],
                };
            } catch (error) {
                lastError = error;
            }
        }

        throw lastError || new Error(`No package endpoint available for game ${game?.gamecode || "unknown"}`);
    },

    syncGames: async () => {
        try {
            const source = await ProviderService.fetchRemoteGames();
            const remoteGames = Array.isArray(source?.data) ? source.data : [];
            const syncedGames = [];

            console.log(
                `[Partner API] Games fetched from ${source.mode}:${source.endpoint} | total=${remoteGames.length}`
            );

            for (const remoteGame of remoteGames) {
                const syncedGame = await upsertRemoteGame(remoteGame);
                if (syncedGame) syncedGames.push(syncedGame);
            }

            return {
                success: true,
                count: remoteGames.length,
                games: syncedGames,
            };
        } catch (error) {
            console.error("[Partner API] Sync games failed:", error.message);
            return {
                success: false,
                error: error.message,
                games: [],
            };
        }
    },

    syncPackages: async (gamesToSync = null) => {
        try {
            const syncedGames =
                Array.isArray(gamesToSync) && gamesToSync.length > 0
                    ? gamesToSync
                    : await db.select().from(games).where(eq(games.api_source, SOURCE_CODE));
            let totalPackages = 0;
            let deactivatedCount = 0;
            let reactivatedCount = 0;
            const perGame = [];

            for (const game of syncedGames) {
                if (!game?.api_id) {
                    continue;
                }

                try {
                    console.log(
                        `[Partner API] Fetching packages for game ${game.gamecode} (api_id=${game.api_id})`
                    );
                    const source = await ProviderService.fetchPackagesForGame(game);
                    const remotePackages = Array.isArray(source?.data) ? source.data : [];
                    const packagePreview = remotePackages
                        .slice(0, 5)
                        .map((item) => `${sanitizeApiId(item?.id) || "no-id"}:${item?.displayName || item?.name || "Unnamed"}`)
                        .join(", ");

                    console.log(
                        `[Partner API] Packages fetched for ${game.gamecode}: source=${source.mode}:${source.endpoint} total=${remotePackages.length}${packagePreview ? ` | preview=${packagePreview}` : ""}`
                    );
                    totalPackages += remotePackages.length;
                    const packageType = inferPackageType(game?.input_fields || []);
                    const defaultRequiresIdServer = inferRequiresIdServer(game?.input_fields || []);
                    let gameDeactivatedCount = 0;
                    let gameReactivatedCount = 0;

                    for (const remotePackage of remotePackages) {
                        const apiId = sanitizeApiId(remotePackage?.id);
                        const packageName = remotePackage?.displayName || remotePackage?.name || `Goi ${apiId}`;
                        const existingPackage = await findExistingPackage(game.id, apiId, packageName);
                        const pricing = buildPricing(game, existingPackage, remotePackage);
                        const fileAPI = buildPackageFileApi(game, remotePackage);
                        const resolvedPackageName =
                            existingPackage?.custom_package_name || packageName;
                        const nextStatus = remotePackage?.isActive === false ? "inactive" : "active";
                        const shouldReactivate =
                            existingPackage?.status === "inactive" && nextStatus === "active";

                        const payload = {
                            api_id: apiId,
                            game_id: game.id,
                            api_package_name: packageName,
                            custom_package_name: existingPackage?.custom_package_name || null,
                            package_name: resolvedPackageName,
                            package_type: existingPackage?.package_type || packageType,
                            thumbnail:
                                remotePackage?.thumbnailUrl ||
                                remotePackage?.thumbnail ||
                                existingPackage?.thumbnail ||
                                game?.thumbnail ||
                                null,
                            status: nextStatus,
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
                                    api_package_name: packageName,
                                    custom_package_name: existingPackage.custom_package_name || null,
                                    package_name: resolvedPackageName,
                                    package_type: existingPackage.package_type || packageType,
                                    thumbnail:
                                        remotePackage?.thumbnailUrl ||
                                        remotePackage?.thumbnail ||
                                        existingPackage.thumbnail ||
                                        game?.thumbnail ||
                                        null,
                                    status: nextStatus,
                                    sale: existingPackage.sale || false,
                                    id_server:
                                        existingPackage.id_server !== undefined && existingPackage.id_server !== null
                                            ? existingPackage.id_server
                                            : defaultRequiresIdServer,
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

                        if (shouldReactivate) {
                            reactivatedCount += 1;
                            gameReactivatedCount += 1;
                        }
                    }
                    perGame.push({
                        gamecode: game.gamecode,
                        api_id: game.api_id,
                        packageCount: remotePackages.length,
                        deactivatedCount: gameDeactivatedCount,
                        reactivatedCount: gameReactivatedCount,
                        success: true,
                    });

                    console.log(
                        `[Partner API] Package sync result for ${game.gamecode}: activeFromSource=${remotePackages.length}, reactivated=${gameReactivatedCount}, deactivated=${gameDeactivatedCount}`
                    );
                } catch (error) {
                    console.error(`[Partner API] Sync packages failed for game ${game.gamecode}:`, error.message);
                    perGame.push({
                        gamecode: game.gamecode,
                        api_id: game.api_id,
                        packageCount: 0,
                        deactivatedCount: 0,
                        reactivatedCount: 0,
                        success: false,
                        error: error.message,
                    });
                }
            }

            console.log(
                `[Partner API] Package sync summary: games=${perGame.length}, totalPackages=${totalPackages}, reactivated=${reactivatedCount}, deactivated=${deactivatedCount}`
            );

            return {
                success: true,
                count: totalPackages,
                deactivatedCount,
                reactivatedCount,
                games: perGame,
            };
        } catch (error) {
            console.error("[Partner API] Sync packages failed:", error.message);
            return {
                success: false,
                error: error.message,
                count: 0,
                deactivatedCount: 0,
                reactivatedCount: 0,
                games: [],
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
