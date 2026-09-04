const retriever = require('../rag/retriever');
const vectorStore = require('../rag/vectorStore');
const db = require('../database/db');

exports.getArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = vectorStore.getDocument(id);

    if (!doc) {
      return res.status(404).json({ error: 'Article not found' });
    }

    res.json({
      article: {
        id: doc.id,
        text: doc.text,
        fileName: doc.metadata?.fileName || 'Unknown',
        fileType: doc.metadata?.fileType || 'Unknown',
        chunkIndex: doc.metadata?.chunkIndex || 0
      }
    });
  } catch (error) {
    console.error('Get article error:', error);
    res.status(500).json({ error: 'Failed to get article' });
  }
};

exports.getRelated = async (req, res) => {
  try {
    const { id } = req.params;
    const related = await retriever.retrieveRelated(id);

    res.json({
      articles: related.map(r => ({
        id: r.id,
        text: r.text.slice(0, 200) + (r.text.length > 200 ? '...' : ''),
        fileName: r.metadata?.fileName || 'Unknown',
        score: r.score
      }))
    });
  } catch (error) {
    console.error('Get related error:', error);
    res.status(500).json({ error: 'Failed to get related articles' });
  }
};

exports.getArticleExplanation = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = vectorStore.getDocument(id);

    if (!doc) {
      return res.status(404).json({ error: 'Article not found' });
    }

    const generator = require('../rag/generator');
    const related = await retriever.retrieveRelated(id, 3);
    const context = retriever.formatContext([doc, ...related]);
    const { answer } = await generator.generate(
      `Explain this legal text in simple language: ${doc.text.slice(0, 500)}`,
      context
    );

    res.json({ explanation: answer });
  } catch (error) {
    console.error('Get explanation error:', error);
    res.status(500).json({ error: 'Failed to get explanation' });
  }
};
