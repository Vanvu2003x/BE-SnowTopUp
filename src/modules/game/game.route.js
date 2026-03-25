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
router.post('/sync-source', checkRoleMDW, GameController.syncSource);
router.post('/sync-nguona', checkRoleMDW, GameController.syncNguonA);
router.post('/upload', checkRoleMDW, upload.secureUpload("thumbnail"), GameController.createGame);
router.delete('/delete', checkRoleMDW, GameController.deleteGame);
router.patch('/update', checkRoleMDW, upload.secureUpload("thumbnail"), GameController.updateGame);

module.exports = router;
