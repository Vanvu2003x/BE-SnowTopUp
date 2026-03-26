const GameService = require("./game.service");
const asyncHandler = require("../../utils/asyncHandler");
const { deleteFile } = require("../../utils/file.util");
const {
    getPartnerSyncConfig,
    updatePartnerSyncInterval,
    runPartnerSyncNow,
} = require("../../services/cron.service");

const parseGameInfo = (req) => {
    const infoRaw = req.body.info;

    if (!infoRaw) {
        throw { status: 400, message: "Thieu thong tin game" };
    }

    try {
        return JSON.parse(infoRaw);
    } catch {
        throw { status: 400, message: "Thong tin game khong hop le" };
    }
};

const getUploadedFilePath = (req, fieldName) => req.files?.[fieldName]?.[0]?.path || null;

const syncSource = asyncHandler(async (req, res) => {
    const result = await runPartnerSyncNow();

    return res.status(200).json({
        status: true,
        message: "Da dong bo du lieu tu nguon doi tac.",
        result,
    });
});

const GameController = {
    getAllGames: asyncHandler(async (req, res) => {
        const result = await GameService.getAllGames();
        res.status(200).json(result);
    }),

    createGame: asyncHandler(async (req, res) => {
        const gameInfo = parseGameInfo(req);
        const thumbnailPath = getUploadedFilePath(req, "thumbnail");
        const posterPath = getUploadedFilePath(req, "poster");

        if (thumbnailPath) {
            gameInfo.custom_thumbnail = thumbnailPath;
            gameInfo.thumbnail = thumbnailPath;
        }

        if (posterPath) {
            gameInfo.poster = posterPath;
        }

        const result = await GameService.createGame(gameInfo);
        return res.status(201).json(result);
    }),

    updateGame: asyncHandler(async (req, res) => {
        const gameInfo = parseGameInfo(req);
        const currentGame = await GameService.getStoredGameById(req.query.id);

        if (!currentGame) {
            throw { status: 404, message: "Game khong ton tai" };
        }

        const thumbnailPath = getUploadedFilePath(req, "thumbnail");
        const posterPath = getUploadedFilePath(req, "poster");
        let oldThumbnailToDelete = null;
        let oldPosterToDelete = null;

        if (thumbnailPath) {
            gameInfo.custom_thumbnail = thumbnailPath;
            gameInfo.thumbnail = thumbnailPath;
            oldThumbnailToDelete = currentGame.custom_thumbnail || null;
        }

        if (posterPath) {
            gameInfo.poster = posterPath;
            oldPosterToDelete = currentGame.poster || null;
        }

        const result = await GameService.updateGame(req.query.id, gameInfo);

        if (oldThumbnailToDelete && oldThumbnailToDelete !== result?.custom_thumbnail) {
            deleteFile(oldThumbnailToDelete);
        }

        if (oldPosterToDelete && oldPosterToDelete !== result?.poster) {
            deleteFile(oldPosterToDelete);
        }

        return res.status(200).json(result);
    }),

    deleteGame: asyncHandler(async (req, res) => {
        const storedGame = await GameService.getStoredGameById(req.query.id);
        const result = await GameService.deleteGame(req.query.id);

        if (storedGame?.custom_thumbnail) {
            deleteFile(storedGame.custom_thumbnail);
        }

        if (storedGame?.poster) {
            deleteFile(storedGame.poster);
        }

        return res.status(200).json(result);
    }),

    getGamesByType: asyncHandler(async (req, res) => {
        const result = await GameService.getGamesByType(req.query.type);
        res.status(200).json(result);
    }),

    getGameByGameCode: asyncHandler(async (req, res) => {
        const result = await GameService.getGameByGameCode(req.params.gamecode);
        return res.status(200).json(result);
    }),

    syncSource,

    syncNguonA: syncSource,

    getTopUpGames: asyncHandler(async (req, res) => {
        const result = await GameService.getTopUpGames();
        res.status(200).json(result);
    }),

    getSyncConfig: asyncHandler(async (req, res) => {
        const config = await getPartnerSyncConfig();
        res.status(200).json(config);
    }),

    updateSyncConfig: asyncHandler(async (req, res) => {
        const config = await updatePartnerSyncInterval(req.body?.intervalMinutes);
        res.status(200).json({
            status: true,
            ...config,
        });
    }),
};

module.exports = GameController;
