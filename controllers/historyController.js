const db = require('../database/db');

exports.getHistory = async (req, res) => {
  try {
    const conversations = db.findAll('conversations', { userId: req.user.id })
      .map(c => ({
        id: c.id,
        title: c.title,
        messageCount: c.messages.length,
        lastMessage: c.messages.length > 0
          ? { role: c.messages[c.messages.length - 1].role, content: c.messages[c.messages.length - 1].content.slice(0, 150) }
          : null,
        createdAt: c.createdAt
      }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const searches = db.findAll('searchHistory', { userId: req.user.id })
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 50);

    res.json({ conversations, searches });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Failed to get history' });
  }
};

exports.deleteConversation = async (req, res) => {
  try {
    const deleted = db.deleteOne('conversations', { id: req.params.id, userId: req.user.id });
    if (!deleted) return res.status(404).json({ error: 'Conversation not found' });
    res.json({ message: 'Conversation deleted' });
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
};

exports.exportData = async (req, res) => {
  try {
    const conversations = db.findAll('conversations', { userId: req.user.id });
    const bookmarks = db.findAll('bookmarks', { userId: req.user.id });
    const searches = db.findAll('searchHistory', { userId: req.user.id });

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      userId: req.user.id,
      data: {
        conversations,
        bookmarks,
        searches
      }
    };

    res.setHeader('Content-Disposition', 'attachment; filename=lawlense_export.json');
    res.json(exportPayload);
  } catch (error) {
    console.error('Export data error:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
};

exports.clearHistory = async (req, res) => {
  try {
    const convs = db.findAll('conversations', { userId: req.user.id });
    for (const c of convs) {
      db.deleteOne('conversations', { id: c.id });
    }
    res.json({ message: 'History cleared' });
  } catch (error) {
    console.error('Clear history error:', error);
    res.status(500).json({ error: 'Failed to clear history' });
  }
};
