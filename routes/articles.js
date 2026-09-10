const express = require('express');
const router = express.Router();
const articlesController = require('../controllers/articlesController');
const { optionalAuth } = require('../middleware/auth');

router.get('/:id', optionalAuth, articlesController.getArticle);
router.get('/:id/related', optionalAuth, articlesController.getRelated);
router.get('/:id/explain', optionalAuth, articlesController.getArticleExplanation);

module.exports = router;
