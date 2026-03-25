const express = require('express');
const router = express.Router();
const NguonAController = require('./nguona.controller');

router.post('/callback', NguonAController.handleCallback);

module.exports = router;
