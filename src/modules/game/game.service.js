const { db } = require("../../configs/drizzle");
const { games, topupPackages, acc } = require("../../db/schema");
const { eq } = require("drizzle-orm");
const crypto = require("crypto");

const normalizeString = (value, maxLength = 255) => {
    if (value === undefined || value === null) {
        return undefined;
    }

    const normalized = String(value).trim();
    return normalized ? normalized.substring(0, maxLength) : null;
};

const normalizeServerList = (value) => {
    if (!Array.isArray(value)) {
        return value;
    }

    return value
        .map((item) => String(item || "").trim())
        .filter(Boolean);
};

const toBoolean = (value) => {
    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        return ["true", "1", "yes", "on"].includes(normalized);
    }

    return Boolean(value);
};

const resolveDisplayName = (game) => game?.custom_name || game?.api_name || game?.name || null;
const resolveDisplayThumbnail = (game) => game?.custom_thumbnail || game?.api_thumbnail || game?.thumbnail || null;

const hydrateGame = (game) => {
    if (!game) {
        return null;
    }

    const name = resolveDisplayName(game);
    const thumbnail = resolveDisplayThumbnail(game);

    return {
        ...game,
        name,
        thumbnail,
    };
};

const getStoredGameById = async (id) => {
    const [game] = await db.select().from(games).where(eq(games.id, id));
    return game || null;
};

const buildResolvedGamePayload = (data = {}, currentGame = null) => {
    const nextApiName = normalizeString(data.api_name, 100);
    const nextCustomName = normalizeString(data.custom_name, 100);
    const fallbackName = normalizeString(data.name, 100);

    const apiName =
        nextApiName !== undefined
            ? nextApiName
            : currentGame?.api_name || currentGame?.name || fallbackName || null;

    const customName =
        nextCustomName !== undefined
            ? nextCustomName
            : currentGame
                ? currentGame.custom_name
                : fallbackName || null;

    const nextApiThumbnail = normalizeString(data.api_thumbnail, 500);
    const nextCustomThumbnail = normalizeString(data.custom_thumbnail, 500);
    const fallbackThumbnail = normalizeString(data.thumbnail, 500);

    const apiThumbnail =
        nextApiThumbnail !== undefined
            ? nextApiThumbnail
            : currentGame?.api_thumbnail || null;

    const customThumbnail =
        nextCustomThumbnail !== undefined
            ? nextCustomThumbnail
            : currentGame
                ? currentGame.custom_thumbnail
                : fallbackThumbnail || null;

    const resolvedName = customName || apiName || fallbackName;
    const resolvedThumbnail = customThumbnail || apiThumbnail || fallbackThumbnail || null;

    return {
        api_name: apiName,
        custom_name: customName,
        name: resolvedName,
        api_thumbnail: apiThumbnail,
        custom_thumbnail: customThumbnail,
        thumbnail: resolvedThumbnail,
    };
};

const GameService = {
    getAllGames: async () => {
        const result = await db.select().from(games);
        return result.map(hydrateGame);
    },

    getGameById: async (id) => {
        const game = await getStoredGameById(id);
        return hydrateGame(game);
    },

    getStoredGameById,

    getGameByGameCode: async (gamecode) => {
        const [game] = await db.select().from(games).where(eq(games.gamecode, gamecode));
        return hydrateGame(game);
    },

    createGame: async (data) => {
        const resolvedFields = buildResolvedGamePayload(data);
        const newGame = {
            id: crypto.randomUUID(),
            api_id: normalizeString(data.api_id, 100) || null,
            api_source: normalizeString(data.api_source, 50) || null,
            ...resolvedFields,
            poster: normalizeString(data.poster, 500) || null,
            server: Array.isArray(data.server) ? normalizeServerList(data.server) : [],
            input_fields: Array.isArray(data.input_fields) ? data.input_fields : [],
            gamecode: normalizeString(data.gamecode, 50),
            publisher: normalizeString(data.publisher, 50) || null,
            profit_percent_basic: data.profit_percent_basic || 0,
            profit_percent_pro: data.profit_percent_pro || 0,
            profit_percent_plus: data.profit_percent_plus || 0,
            origin_markup_percent: data.origin_markup_percent !== undefined ? Number(data.origin_markup_percent) : 0,
            is_hot: toBoolean(data.is_hot),
        };

        await db.insert(games).values(newGame);
        return await GameService.getGameById(newGame.id);
    },

    updateGame: async (id, data) => {
        const currentGame = await getStoredGameById(id);

        if (!currentGame) {
            throw new Error("Game not found");
        }

        const updateData = {};
        const resolvedFields = buildResolvedGamePayload(data, currentGame);

        if (data.name !== undefined || data.api_name !== undefined || data.custom_name !== undefined) {
            updateData.api_name = resolvedFields.api_name;
            updateData.custom_name = resolvedFields.custom_name;
            updateData.name = resolvedFields.name;
        }

        if (data.thumbnail !== undefined || data.api_thumbnail !== undefined || data.custom_thumbnail !== undefined) {
            updateData.api_thumbnail = resolvedFields.api_thumbnail;
            updateData.custom_thumbnail = resolvedFields.custom_thumbnail;
            updateData.thumbnail = resolvedFields.thumbnail;
        }

        if (data.poster !== undefined) updateData.poster = normalizeString(data.poster, 500) || null;
        if (data.api_id !== undefined) updateData.api_id = normalizeString(data.api_id, 100) || null;
        if (data.api_source !== undefined) updateData.api_source = normalizeString(data.api_source, 50) || null;
        if (data.server !== undefined) updateData.server = Array.isArray(data.server) ? normalizeServerList(data.server) : data.server;
        if (data.input_fields !== undefined) updateData.input_fields = Array.isArray(data.input_fields) ? data.input_fields : [];
        if (data.gamecode !== undefined) updateData.gamecode = normalizeString(data.gamecode, 50);
        if (data.publisher !== undefined) updateData.publisher = normalizeString(data.publisher, 50) || null;
        if (data.is_hot !== undefined) updateData.is_hot = toBoolean(data.is_hot);

        let profitChanged = false;
        if (data.profit_percent_basic !== undefined) { updateData.profit_percent_basic = Number(data.profit_percent_basic); profitChanged = true; }
        if (data.profit_percent_pro !== undefined) { updateData.profit_percent_pro = Number(data.profit_percent_pro); profitChanged = true; }
        if (data.profit_percent_plus !== undefined) { updateData.profit_percent_plus = Number(data.profit_percent_plus); profitChanged = true; }
        if (data.origin_markup_percent !== undefined) { updateData.origin_markup_percent = Number(data.origin_markup_percent); profitChanged = true; }

        if (Object.keys(updateData).length === 0) {
            throw new Error("Khong co truong nao de cap nhat.");
        }

        await db.transaction(async (tx) => {
            await tx.update(games)
                .set(updateData)
                .where(eq(games.id, id));

            if (profitChanged) {
                // Global profit/markup cascading is disabled due to exact manual pricing per package
            }
        });

        return await GameService.getGameById(id);
    },

    deleteGame: async (id) => {
        const deletedGame = await getStoredGameById(id);
        await db.delete(games).where(eq(games.id, id));
        return hydrateGame(deletedGame);
    },

    getGamesByType: async (type) => {
        let result;

        if (type === "ACC") {
            result = await db.selectDistinct().from(games)
                .innerJoin(acc, eq(acc.game_id, games.id));
        } else {
            result = await db.selectDistinct().from(games)
                .innerJoin(topupPackages, eq(topupPackages.game_id, games.id))
                .where(eq(topupPackages.package_type, type));
        }

        return result.map((row) => hydrateGame(row.games || row));
    },

    getTopUpGames: async () => {
        const result = await db.selectDistinct().from(games)
            .innerJoin(topupPackages, eq(topupPackages.game_id, games.id))
            .where(eq(topupPackages.status, "active"));

        return result.map((row) => hydrateGame(row.games || row));
    },
};

module.exports = GameService;
