const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticate, adminOnly } = require('../middleware/auth');

router.get('/', authenticate, adminOnly, analyticsController.getAnalytics);

module.exports = router;
