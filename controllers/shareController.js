const crypto = require('crypto');
const db = require('../database/db');

function generateToken() {
  return crypto.randomBytes(8).toString('hex');
}

exports.generateShare = async (req, res) => {
  try {
    const { content, citations, confidence, title } = req.body;
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const token = generateToken();
    const share = db.insertOne('shares', {
      token,
      content,
      citations: citations || [],
      confidence: confidence || 0,
      title: title || null,
      userId: req.user ? req.user.id : null,
      views: 0
    });

    const url = `${req.protocol}://${req.get('host')}/shared/${token}`;

    res.json({
      token,
      url,
      shareId: share.id,
      createdAt: share.createdAt
    });
  } catch (error) {
    console.error('Generate share error:', error);
    res.status(500).json({ error: 'Failed to generate share link' });
  }
};

exports.getShared = async (req, res) => {
  try {
    const { token } = req.params;
    const share = db.findOne('shares', { token });

    if (!share) {
      return res.status(404).json({ error: 'Shared content not found or expired' });
    }

    db.updateOne('shares', { token }, { views: share.views + 1 });

    res.json({
      content: share.content,
      citations: share.citations,
      confidence: share.confidence,
      title: share.title,
      createdAt: share.createdAt,
      views: share.views + 1
    });
  } catch (error) {
    console.error('Get shared error:', error);
    res.status(500).json({ error: 'Failed to retrieve shared content' });
  }
};
