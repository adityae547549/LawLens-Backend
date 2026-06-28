const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { optionalAuth, authenticate } = require('../middleware/auth');

router.post('/', optionalAuth, async (req, res) => {
  try {
    const { overallRating, overallComment, categories, email } = req.body;

    if (!overallRating || !categories || !Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({ error: 'Overall rating and at least one category rating are required' });
    }

    const cleaned = categories.map(c => ({
      id: c.id || 'unknown',
      rating: Math.min(5, Math.max(1, parseInt(c.rating) || 0)),
      comment: (c.comment || '').trim().slice(0, 5000)
    }));

    const feedback = db.insertOne('feedback', {
      userId: req.user?.id || null,
      type: 'comprehensive',
      overallRating: Math.min(5, Math.max(1, parseInt(overallRating))),
      overallComment: (overallComment || '').trim().slice(0, 10000),
      categories: cleaned,
      email: email || null,
      status: 'new',
      userAgent: req.headers['user-agent'] || null
    });

    res.json({ success: true, message: 'Feedback received. Thank you for helping shape LawLens!' });
  } catch (err) {
    console.error('Feedback error:', err);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

router.get('/', authenticate, async (req, res) => {
  try {
    const all = db.findAll('feedback');
    const items = req.user.role === 'admin' ? all : all.filter(f => f.userId === req.user.id);
    res.json({ feedback: items.reverse() });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load feedback' });
  }
});

module.exports = router;
