const db = require('../database/db');
const vectorStore = require('../rag/vectorStore');

exports.addBookmark = async (req, res) => {
  try {
    const { articleId, title } = req.body;
    if (!articleId) {
      return res.status(400).json({ error: 'Article ID is required' });
    }
    const existing = db.findOne('bookmarks', { userId: req.user.id, articleId });
    if (existing) {
      return res.status(409).json({ error: 'Already bookmarked' });
    }
    const bookmark = db.insertOne('bookmarks', {
      userId: req.user.id,
      articleId,
      title: title || `Article ${articleId}`,
      notes: ''
    });
    res.status(201).json({ bookmark });
  } catch (error) {
    console.error('Add bookmark error:', error);
    res.status(500).json({ error: 'Failed to add bookmark' });
  }
};

exports.getBookmarks = async (req, res) => {
  try {
    const bookmarks = db.findAll('bookmarks', { userId: req.user.id })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const enriched = bookmarks.map(b => {
      const doc = vectorStore.getDocument(b.articleId);
      return {
        ...b,
        preview: doc ? doc.text.slice(0, 200) : 'Document not found',
        fileName: doc?.metadata?.fileName || 'Unknown'
      };
    });
    res.json({ bookmarks: enriched });
  } catch (error) {
    console.error('Get bookmarks error:', error);
    res.status(500).json({ error: 'Failed to get bookmarks' });
  }
};

exports.deleteBookmark = async (req, res) => {
  try {
    const deleted = db.deleteOne('bookmarks', { id: req.params.id, userId: req.user.id });
    if (!deleted) {
      return res.status(404).json({ error: 'Bookmark not found' });
    }
    res.json({ message: 'Bookmark removed' });
  } catch (error) {
    console.error('Delete bookmark error:', error);
    res.status(500).json({ error: 'Failed to delete bookmark' });
  }
};

exports.updateBookmark = async (req, res) => {
  try {
    const { notes, title } = req.body;
    const updates = {};
    if (notes !== undefined) updates.notes = notes;
    if (title !== undefined) updates.title = title;
    const bookmark = db.updateOne('bookmarks', { id: req.params.id, userId: req.user.id }, updates);
    if (!bookmark) {
      return res.status(404).json({ error: 'Bookmark not found' });
    }
    res.json({ bookmark });
  } catch (error) {
    console.error('Update bookmark error:', error);
    res.status(500).json({ error: 'Failed to update bookmark' });
  }
};
