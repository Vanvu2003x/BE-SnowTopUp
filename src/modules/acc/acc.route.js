const express = require('express');
const router = express.Router();
const AccController = require('./acc.controller');
const upload = require('../../configs/upload.config');
const { checkRoleMDW } = require('../../middleware/auJWT.middleware');

// Public routes
router.get('/game', AccController.getAccByGame);
router.get('/stats', AccController.getAccStats);
router.get('/search', AccController.filterAccByGame);
router.get('/:id', AccController.getAccById);

// Admin only routes (require authentication)
router.post('/', checkRoleMDW, upload.secureUpload('image'), AccController.createAcc);
router.put('/:id', checkRoleMDW, upload.secureUpload('image'), AccController.updateAcc);
router.delete('/:id', checkRoleMDW, AccController.deleteAcc);

module.exports = router;
