const vectorStore = require('../rag/vectorStore');
const fs = require('fs');
const path = require('path');

let AMENDMENTS = [];
try {
  AMENDMENTS = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'amendments.json'), 'utf8'));
  console.log(`Loaded ${AMENDMENTS.length} verified amendments`);
} catch (e) {
  console.error('Failed to load amendments.json:', e.message);
}

exports.search = async (req, res) => {
  try {
    const { article, topic } = req.query;

    if (article) {
      const query = `Article ${article} of the Constitution of India`;
      const results = await vectorStore.hybridSearch(query, 10);

      const filtered = results.filter(r => {
        const text = r.text.toLowerCase();
        return text.includes(`article ${article}`) || text.includes(`article ${article}.`);
      });

      const amendment = AMENDMENTS.find(a => a.num === parseInt(article));

      return res.json({
        type: 'article',
        article: parseInt(article),
        results: filtered.map(r => ({
          id: r.id,
          text: r.text,
          fileName: r.metadata?.fileName || 'Constitution of India',
          chunkIndex: r.metadata?.chunkIndex || 0,
          score: r.rerankScore || r.score
        })),
        amendment: amendment || null,
        total: filtered.length
      });
    }

    if (topic) {
      const results = await vectorStore.hybridSearch(topic, 15);

      return res.json({
        type: 'topic',
        topic,
        results: results.map(r => ({
          id: r.id,
          text: r.text.slice(0, 500) + (r.text.length > 500 ? '...' : ''),
          fileName: r.metadata?.fileName || 'Constitution of India',
          chunkIndex: r.metadata?.chunkIndex || 0,
          score: r.rerankScore || r.score
        })),
        total: results.length
      });
    }

    return res.status(400).json({ error: 'Either article or topic query parameter is required' });
  } catch (error) {
    console.error('Constitution search error:', error);
    res.status(500).json({ error: 'Failed to search constitution' });
  }
};

exports.getAmendments = async (req, res) => {
  try {
    res.json({
      amendments: AMENDMENTS.map(a => ({
        num: a.num,
        year: a.year,
        name: a.title || a.name,
        description: a.summary || a.description,
        category: a.category || 'amendment',
        articles_affected: a.articles_affected || []
      })),
      total: AMENDMENTS.length
    });
  } catch (error) {
    console.error('Get amendments error:', error);
    res.status(500).json({ error: 'Failed to get amendments' });
  }
};

exports.getArticle = async (req, res) => {
  try {
    const { num } = req.params;
    const articleNum = parseInt(num);
    if (isNaN(articleNum)) {
      return res.status(400).json({ error: 'Invalid article number' });
    }

    const query = `Article ${articleNum} Constitution of India`;
    const results = await vectorStore.hybridSearch(query, 5);

    const filtered = results.filter(r => {
      const text = r.text.toLowerCase();
      return text.includes(`article ${articleNum}`);
    });

    if (filtered.length === 0) {
      return res.status(404).json({ error: `Article ${articleNum} not found in the database` });
    }

    const amendment = AMENDMENTS.find(a => a.num === articleNum);

    res.json({
      article: articleNum,
      content: filtered.map(r => ({
        id: r.id,
        text: r.text,
        fileName: r.metadata?.fileName || 'Constitution of India',
        chunkIndex: r.metadata?.chunkIndex || 0
      })),
      amendment: amendment || null
    });
  } catch (error) {
    console.error('Get article error:', error);
    res.status(500).json({ error: 'Failed to get article' });
  }
};
