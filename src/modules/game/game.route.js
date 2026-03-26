const express = require('express');
const router = express.Router();
const GameController = require('./game.controller');
const upload = require('../../configs/upload.config');
const { checkRoleMDW } = require('../../middleware/auJWT.middleware');

// Public routes
router.get('/', GameController.getAllGames);
router.get('/by-type', GameController.getGamesByType);
router.get('/top-up', GameController.getTopUpGames);
router.get('/game/:gamecode', GameController.getGameByGameCode);

// Admin only routes (require authentication)
router.get('/sync-config', checkRoleMDW, GameController.getSyncConfig);
router.patch('/sync-config', checkRoleMDW, GameController.updateSyncConfig);
router.post('/sync-source', checkRoleMDW, GameController.syncSource);
router.post('/sync-now', checkRoleMDW, GameController.syncSource);
router.post('/sync-nguona', checkRoleMDW, GameController.syncNguonA);
router.post(
    '/upload',
    checkRoleMDW,
    upload.secureUploadFields([
        { name: "thumbnail", maxCount: 1 },
        { name: "poster", maxCount: 1 },
    ]),
    GameController.createGame
);
router.delete('/delete', checkRoleMDW, GameController.deleteGame);
router.patch(
    '/update',
    checkRoleMDW,
    upload.secureUploadFields([
        { name: "thumbnail", maxCount: 1 },
        { name: "poster", maxCount: 1 },
    ]),
    GameController.updateGame
);

module.exports = router;
