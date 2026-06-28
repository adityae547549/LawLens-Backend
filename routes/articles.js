const express = require('express');
const router = express.Router();
const articlesController = require('../controllers/articlesController');

router.get('/:id', articlesController.getArticle);
router.get('/:id/related', articlesController.getRelated);
router.get('/:id/explain', articlesController.getArticleExplanation);

module.exports = router;
