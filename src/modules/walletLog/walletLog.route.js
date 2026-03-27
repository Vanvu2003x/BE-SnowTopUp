const express = require('express');
const router = express.Router();
const WalletLogController = require('./walletLog.controller');
const { checkToken, checkRoleMDW } = require('../../middleware/auJWT.middleware');

router.get('/getTongtien', checkRoleMDW, WalletLogController.getTongtien);
router.get('/total-amount', checkRoleMDW, WalletLogController.getTongTienTrongKhoang);
router.get('/', checkRoleMDW, WalletLogController.getWalletLog);
router.get('/pending', checkRoleMDW, WalletLogController.getPendingLogs);
router.get('/logs', checkRoleMDW, WalletLogController.getWalletLog);
router.get('/logs-pending', checkRoleMDW, WalletLogController.getWalletLogStatusDone);
router.get('/stats', checkRoleMDW, WalletLogController.getTongSoTienDaNap);
router.post('/manual-charge', checkRoleMDW, WalletLogController.manualChargeBalance);
router.patch('/update', checkRoleMDW, WalletLogController.manualChargeBalance);
router.post('/cancel', checkToken, WalletLogController.cancelWalletLog);
router.get('/user-logs', checkToken, WalletLogController.getLogsByUser);

module.exports = router;

