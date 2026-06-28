const db = require('../database/db');
const vectorStore = require('../rag/vectorStore');

exports.getAnalytics = async (req, res) => {
  try {
    const events = db.findAll('analytics');

    const chats = events.filter(e => e.event === 'chat' || e.event === 'chat_stream');
    const searches = events.filter(e => e.event === 'search');

    const queryCounts = {};
    chats.forEach(c => {
      if (c.query) {
        const q = c.query.toLowerCase().slice(0, 80);
        queryCounts[q] = (queryCounts[q] || 0) + 1;
      }
    });

    const topQueries = Object.entries(queryCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([query, count]) => ({ query, count }));

    const avgConfidence = chats.length > 0
      ? Math.round(chats.reduce((sum, c) => sum + (c.confidence || 0), 0) / chats.length)
      : 0;

    const failedSearches = events.filter(e => e.event === 'search' && e.resultCount === 0).length;

    res.json({
      analytics: {
        totalChats: chats.length,
        totalSearches: searches.length,
        topQueries,
        avgConfidence,
        failedSearches,
        totalDocuments: vectorStore.count(),
        dailyActivity: getActivityByDay(events)
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
};

function getActivityByDay(events) {
  const days = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    days[key] = { chats: 0, searches: 0 };
  }
  events.forEach(e => {
    const key = e.timestamp?.split('T')[0];
    if (days[key]) {
      if (e.event === 'chat' || e.event === 'chat_stream') days[key].chats++;
      if (e.event === 'search') days[key].searches++;
    }
  });
  return days;
}
