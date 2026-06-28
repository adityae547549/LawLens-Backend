const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { searchLimiter } = require('../middleware/rateLimiter');

router.post('/', searchLimiter, optionalAuth, searchController.search);
router.get('/suggestions', searchController.suggestions);
router.get('/recent', authenticate, searchController.recentSearches);
router.delete('/clear', authenticate, searchController.clearHistory);

module.exports = router;
