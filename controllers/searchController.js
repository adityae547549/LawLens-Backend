const retriever = require('../rag/retriever');
const vectorStore = require('../rag/vectorStore');
const db = require('../database/db');

exports.search = async (req, res) => {
  try {
    const { query, mode = 'hybrid', filters = {}, useWebSearch = false } = req.body;
    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const { localResults, webResults } = await retriever.retrieve(query, { mode, k: 20, useWebSearch, ...filters });

    if (req.user) {
      db.insertOne('searchHistory', {
        userId: req.user.id,
        query,
        mode,
        useWebSearch,
        resultCount: localResults.length + webResults.length,
        timestamp: new Date().toISOString()
      });
    }

    const localMapped = localResults.map(r => ({
      id: r.id,
      text: r.text,
      fileName: r.metadata?.fileName || 'Unknown',
      fileType: r.metadata?.fileType || 'Unknown',
      score: r.rerankScore || r.score,
      chunkIndex: r.metadata?.chunkIndex || 0,
      citation: r.metadata?.citation || r.metadata?.fileName || 'Legal Document',
      type: 'local'
    }));

    const webMapped = webResults.map(r => ({
      id: r.url,
      text: r.snippet,
      fileName: r.title,
      fileType: 'Web',
      score: 0.5,
      chunkIndex: 0,
      url: r.url,
      type: 'web'
    }));

    res.json({
      results: [...localMapped, ...webMapped],
      localCount: localResults.length,
      webCount: webResults.length,
      total: localResults.length + webResults.length,
      query
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
};

exports.suggestions = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.json({ suggestions: [] });

    const results = await vectorStore.keywordSearch(query, 5);
    const suggestions = results.map(r => ({
      text: r.text.slice(0, 150) + (r.text.length > 150 ? '...' : ''),
      fileName: r.metadata?.fileName || 'Unknown',
      id: r.id
    }));

    res.json({ suggestions });
  } catch (error) {
    console.error('Suggestions error:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
};

exports.recentSearches = async (req, res) => {
  try {
    const searches = db.findAll('searchHistory', { userId: req.user.id })
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 20);
    res.json({ searches });
  } catch (error) {
    console.error('Recent searches error:', error);
    res.status(500).json({ error: 'Failed to get recent searches' });
  }
};

exports.clearHistory = async (req, res) => {
  try {
    const searches = db.findAll('searchHistory', { userId: req.user.id });
    for (const s of searches) {
      db.deleteOne('searchHistory', { id: s.id });
    }
    res.json({ message: 'Search history cleared' });
  } catch (error) {
    console.error('Clear history error:', error);
    res.status(500).json({ error: 'Failed to clear history' });
  }
};
