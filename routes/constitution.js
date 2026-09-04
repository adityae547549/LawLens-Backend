const express = require('express');
const router = express.Router();
const constitutionController = require('../controllers/constitutionController');
const fs = require('fs');
const path = require('path');

router.get('/search', constitutionController.search);
router.get('/amendments', constitutionController.getAmendments);
router.get('/article/:num', constitutionController.getArticle);

// GET /api/constitution/timeline — verified timeline data
router.get('/timeline', (req, res) => {
  try {
    const { from, to, category } = req.query;
    const amendments = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'amendments.json'), 'utf8'));

    let filtered = amendments;
    if (from) filtered = filtered.filter(a => a.year >= parseInt(from));
    if (to) filtered = filtered.filter(a => a.year <= parseInt(to));
    if (category && category !== 'all') {
      filtered = filtered.filter(a => a.category === category);
    }

    res.json({
      events: filtered.map(a => ({
        num: a.num,
        year: a.year,
        title: a.title,
        summary: a.summary,
        category: a.category,
        articles_affected: a.articles_affected || []
      })),
      total: filtered.length,
      categories: ['amendment', 'judgment', 'act', 'emergency']
    });
  } catch (error) {
    console.error('Timeline error:', error);
    res.status(500).json({ error: 'Failed to get timeline' });
  }
});

module.exports = router;
