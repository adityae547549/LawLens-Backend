const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { searchLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');
const { searchSchema, suggestionsQuerySchema } = require('../validators');

router.post('/', searchLimiter, optionalAuth, validate(searchSchema), searchController.search);
router.get('/suggestions', validate(suggestionsQuerySchema, 'query'), searchController.suggestions);
router.get('/recent', authenticate, searchController.recentSearches);
router.delete('/clear', authenticate, searchController.clearHistory);

module.exports = router;
