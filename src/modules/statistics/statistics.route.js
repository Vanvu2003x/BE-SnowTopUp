const StatisticsController = require('./statistics.controller');
const RevenueController = require('./revenue.controller');
const express = require('express');
const router = express.Router();
const { checkRoleMDW } = require('../../middleware/auJWT.middleware');

// Leaderboard and best sellers
router.get('/leaderboard', checkRoleMDW, StatisticsController.getLeaderboard);
router.get('/best-sellers', checkRoleMDW, StatisticsController.getBestSellers);
router.get('/quick-stats', checkRoleMDW, StatisticsController.getQuickStats);

// Revenue analytics endpoints
router.get('/revenue/overview', checkRoleMDW, RevenueController.getRevenueOverview);
router.get('/revenue/profit-margin', checkRoleMDW, RevenueController.getProfitMargin);
router.get('/revenue/growth', checkRoleMDW, RevenueController.getGrowthRates);
router.get('/revenue/top-sources', checkRoleMDW, RevenueController.getTopSources);
router.get('/revenue/by-period', checkRoleMDW, RevenueController.getByPeriod);
router.get('/revenue/dashboard', checkRoleMDW, RevenueController.getDashboard);

module.exports = router;
