const express = require('express');
const router = express.Router();
const OrderController = require('./order.controller');
const { checkToken, checkRoleMDW } = require('../../middleware/auJWT.middleware');
const { orderLimiter } = require('../../middleware/rateLimit.middleware');

// User routes (require login)
router.post('/', orderLimiter, checkToken, OrderController.createOrder);
router.get('/my-orders', checkToken, OrderController.getOrdersByUserId);
router.get('/user', checkToken, OrderController.getOrdersByUserId);
router.put('/:id/cancel', checkToken, OrderController.cancelOrderIfPending);
router.get('/transaction-history', checkToken, OrderController.getTransactionHistory);
router.get('/financial-summary', checkToken, OrderController.getUserFinancialSummary);
router.get('/summary', checkToken, OrderController.getUserFinancialSummary);

// Agent routes (require login)
router.get('/receive/summary', checkToken, OrderController.getOrderSummary3);
router.get('/mynap', checkToken, OrderController.getMyNapOrdersStats);
router.get('/receive/stats', checkToken, OrderController.getMyNapOrdersStats);
router.post('/:id/accept', checkToken, OrderController.acceptOrder);

// Admin only routes (require admin role)
router.get('/', checkRoleMDW, OrderController.getAllOrders);
router.get('/detail/:id', checkRoleMDW, OrderController.getOrderById);
router.post('/sync/all', checkRoleMDW, OrderController.syncAllExternalOrders);
router.post('/:id/sync', checkRoleMDW, OrderController.syncOrderWithProvider);
router.post('/:id/complete', checkRoleMDW, OrderController.completeOrder);
router.delete('/delete/:id', checkRoleMDW, OrderController.deleteOrder);
router.put('/update/:id', checkRoleMDW, OrderController.updateOrder);
router.get('/stats/cost', checkRoleMDW, OrderController.getCostStats);
router.get('/cost-summary', checkRoleMDW, OrderController.getCostSummary);
router.get('/by-status', checkRoleMDW, OrderController.getOrdersByStatus);
router.get('/search', checkRoleMDW, OrderController.searchOrders);
router.post('/change-status/:id', checkRoleMDW, OrderController.changeOrderStatus);
router.post('/cancel-refund/:id', checkRoleMDW, OrderController.cancelOrderAndRefund);

module.exports = router;
