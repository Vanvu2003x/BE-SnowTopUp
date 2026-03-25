const express = require('express');
const router = express.Router();
const PackageController = require('./package.controller');
const upload = require('../../configs/upload.config');
const { checkRoleMDW } = require('../../middleware/auJWT.middleware');

// Public routes - NO AUTH REQUIRED
// FE will handle price display based on user level from token
router.get('/', PackageController.getAllTopupPackages);
router.get('/game/:game_code', PackageController.getTopupPackagesByGameSlug);
router.get('/getLog', PackageController.getLogTopupPackages);
router.get('/search', PackageController.searchTopupPackages);
router.get('/:id', PackageController.getPackageById);

// Admin only routes (require authentication)
router.post('/', checkRoleMDW, upload.secureUpload("thumbnail"), PackageController.createTopupPackage);
router.put('/', checkRoleMDW, upload.secureUpload("thumbnail"), PackageController.updateTopupPackage);
router.delete('/:id', checkRoleMDW, PackageController.deleteTopupPackage);
router.patch('/update-status', checkRoleMDW, PackageController.updateStatus);
router.patch('/update-sale', checkRoleMDW, PackageController.updateSale);

module.exports = router;

