const GameService = require("./game.service");
const asyncHandler = require("../../utils/asyncHandler");
const { deleteFile } = require("../../utils/file.util");

const syncExternalSource = async () => {
    const ProviderService = require("../nguona/nguona.service");
    await ProviderService.syncGames();
    await ProviderService.syncPackages();
};

const GameController = {
    getAllGames: asyncHandler(async (req, res) => {
        const result = await GameService.getAllGames();
        res.status(200).json(result);
    }),

    createGame: asyncHandler(async (req, res) => {
        const infoRaw = req.body.info;
        if (!infoRaw) {
            throw { status: 400, message: "Thiếu thông tin game" };
        }

        let gameInfo;
        try {
            gameInfo = JSON.parse(infoRaw);
        } catch {
            throw { status: 400, message: "Thông tin game không hợp lệ" };
        }

        if (req.file) {
            gameInfo.thumbnail = req.file.path;
        }

        const result = await GameService.createGame(gameInfo);
        return res.status(201).json(result);
    }),

    updateGame: asyncHandler(async (req, res) => {
        const infoRaw = req.body.info;
        if (!infoRaw) throw { status: 400, message: "Thiếu thông tin game" };

        let gameInfo;
        try {
            gameInfo = JSON.parse(infoRaw);
        } catch {
            throw { status: 400, message: "Thông tin game không hợp lệ" };
        }

        let oldThumbnailToDelete = null;
        if (req.file) {
            gameInfo.thumbnail = req.file.path;
            const oldGame = await GameService.getGameById(req.query.id);
            if (oldGame?.thumbnail) {
                oldThumbnailToDelete = oldGame.thumbnail;
            }
        }

        const result = await GameService.updateGame(req.query.id, gameInfo);
        if (oldThumbnailToDelete && oldThumbnailToDelete !== result?.thumbnail) {
            deleteFile(oldThumbnailToDelete);
        }

        return res.status(200).json(result);
    }),

    deleteGame: asyncHandler(async (req, res) => {
        const result = await GameService.deleteGame(req.query.id);

        if (result?.thumbnail) {
            deleteFile(result.thumbnail);
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

    syncSource: asyncHandler(async (req, res) => {
        await syncExternalSource();
        return res.status(200).json({ status: true, message: "Đang tiến hành đồng bộ dữ liệu từ nguồn đối tác..." });
    }),

    syncNguonA: asyncHandler(async (req, res) => {
        await syncExternalSource();
        return res.status(200).json({ status: true, message: "Đang tiến hành đồng bộ dữ liệu từ nguồn đối tác..." });
    }),

    getTopUpGames: asyncHandler(async (req, res) => {
        const result = await GameService.getTopUpGames();
        res.status(200).json(result);
    }),
};

module.exports = GameController;
