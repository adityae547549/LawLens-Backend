const retriever = require('../rag/retriever');
const generator = require('../rag/generator');
const memory = require('../rag/memory');
const db = require('../database/db');

function trackAnalytics(event, data) {
  db.insertOne('analytics', { event, ...data, timestamp: new Date().toISOString() });
}

exports.chat = async (req, res) => {
  try {
    const { message, conversationId, mode = 'legal', level = 'general', language = 'auto', fileId, useMemory = false } = req.body;
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const useWebSearch = mode === 'web' || mode === 'hybrid';
    const useOwnKnowledge = mode === 'general';
    const conversation = conversationId
      ? db.findOne('conversations', { id: conversationId })
      : null;
    const history = conversation ? conversation.messages || [] : [];
    const memoryContext = useMemory && req.user ? memory.getMemoryContext(req.user.id) : '';

    let localResults = [], webResults = [], context = '', citations = [];
    if (mode !== 'general') {
      const results = await retriever.retrieve(message, { mode, k: 5, useWebSearch, fileId });
      localResults = results.localResults;
      webResults = results.webResults;
      context = retriever.formatContext(localResults, webResults);
      citations = retriever.getCitations(localResults, webResults);
    }
    const { answer, sources } = await generator.generate(message, context, history, { level, useWebSearch, language, memoryContext, useOwnKnowledge });

    const confidenceResult = useOwnKnowledge
      ? { score: sources?.[0]?.type === 'general' ? 40 : 0, level: 'medium', label: 'General Knowledge' }
      : retriever.calculateOverallConfidence(citations);

    let convId = conversationId;
    if (req.user) {
      if (!convId) {
        const newConv = db.insertOne('conversations', {
          userId: req.user.id,
          title: message.slice(0, 60) + (message.length > 60 ? '...' : ''),
          messages: [], level, useWebSearch
        });
        convId = newConv.id;
      }
      db.updateOne('conversations', { id: convId }, {
        messages: [
          ...(conversation ? conversation.messages : []),
          { role: 'user', content: message, timestamp: new Date().toISOString() },
          { role: 'assistant', content: answer, sources: citations, confidence: confidenceResult.score, timestamp: new Date().toISOString() }
        ]
      });
      trackAnalytics('chat', { userId: req.user.id, query: message, resultCount: localResults.length + webResults.length, confidence: confidenceResult.score, useWebSearch });
    }

    res.json({
      answer,
      citations,
      confidence: confidenceResult.score,
      confidenceLevel: confidenceResult.level,
      confidenceLabel: confidenceResult.label,
      webResultsCount: webResults.length,
      memoryUsed: !!memoryContext,
      sourceType: useOwnKnowledge ? 'general' : 'documents',
      sources: useOwnKnowledge
        ? [{ name: 'AI Knowledge', type: 'general', text: 'AI answered from its own knowledge' }]
        : [...localResults.map(r => ({
          id: r.id, text: r.text.slice(0, 300) + (r.text.length > 300 ? '...' : ''),
          fileName: r.metadata?.fileName || 'Unknown', score: r.rerankScore || r.score, type: 'local'
        })), ...webResults.map(r => ({
          id: r.url, text: r.snippet, fileName: r.title, score: 0.5, type: 'web', url: r.url
        }))],
      conversationId: convId
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
};

exports.chatStream = async (req, res) => {
  try {
    const { message, conversationId, mode = 'legal', level = 'general', language = 'auto', fileId, useMemory = false } = req.body;
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const useWebSearch = mode === 'web' || mode === 'hybrid';
    const useOwnKnowledge = mode === 'general';

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const conversation = conversationId
      ? db.findOne('conversations', { id: conversationId })
      : null;
    const history = conversation ? conversation.messages || [] : [];
    const memoryContext = useMemory && req.user ? memory.getMemoryContext(req.user.id) : '';

    if (useMemory) {
      res.write(`data: ${JSON.stringify({ type: 'status', message: '🧠 Recalling past conversations...' })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ type: 'status', message: useOwnKnowledge ? '🧠 Preparing AI knowledge...' : '🔍 Understanding your question...' })}\n\n`);

    let localResults = [], webResults = [], context = '', citations = [];
    if (mode !== 'general') {
      let searchQuery = message;
      if (history.length >= 2) {
        try {
          searchQuery = await generator.rewriteQuery(message, history);
          if (searchQuery !== message) {
            res.write(`data: ${JSON.stringify({ type: 'status', message: `🔍 Searching for: "${searchQuery.slice(0, 80)}..."` })}\n\n`);
          }
        } catch (e) {
          // Fallback to original message
        }
      }

      const results = await retriever.retrieve(searchQuery, { mode, k: useWebSearch ? 6 : 5, useWebSearch, fileId });
      localResults = results.localResults;
      webResults = results.webResults;

      if (mode === 'hybrid' && webResults.length > 0) {
        res.write(`data: ${JSON.stringify({ type: 'status', message: `📚 Found ${localResults.length} articles + 🌐 ${webResults.length} web sources. Generating response...` })}\n\n`);
      } else if (mode === 'web') {
        res.write(`data: ${JSON.stringify({ type: 'status', message: `🌐 Found ${webResults.length} web sources. Generating response...` })}\n\n`);
      } else {
        res.write(`data: ${JSON.stringify({ type: 'status', message: `📚 Found ${localResults.length} relevant articles. Explaining...` })}\n\n`);
      }

      context = retriever.formatContext(localResults, webResults);
      citations = retriever.getCitations(localResults, webResults);
    } else {
      res.write(`data: ${JSON.stringify({ type: 'status', message: '🧠 Answering from AI general knowledge...' })}\n\n`);
    }

    let fullAnswer = '';
    const stream = generator.generateStream(message, context, history, { level, useWebSearch, language, memoryContext, useOwnKnowledge });

    for await (const chunk of stream) {
      if (chunk.type === 'content') {
        fullAnswer += chunk.content;
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      } else if (chunk.type === 'done') {
        const confidenceResult = useOwnKnowledge
          ? { score: chunk.confidence || 40, level: 'medium', label: 'General Knowledge' }
          : retriever.calculateOverallConfidence(citations);

        let convId = conversationId;
        if (req.user) {
          if (!convId) {
            const newConv = db.insertOne('conversations', {
              userId: req.user.id,
              title: message.slice(0, 60) + (message.length > 60 ? '...' : ''),
              messages: [], level, useWebSearch
            });
            convId = newConv.id;
          }
          db.updateOne('conversations', { id: convId }, {
            messages: [
              ...(conversation ? conversation.messages : []),
              { role: 'user', content: message, timestamp: new Date().toISOString() },
              { role: 'assistant', content: fullAnswer, sources: citations, confidence: confidenceResult.score, timestamp: new Date().toISOString() }
            ]
          });
          trackAnalytics('chat_stream', { userId: req.user.id, query: message, resultCount: localResults.length + webResults.length, confidence: confidenceResult.score, useWebSearch });
        }

        res.write(`data: ${JSON.stringify({
          type: 'done', citations,
          confidence: confidenceResult.score,
          confidenceLevel: confidenceResult.level,
          confidenceLabel: confidenceResult.label,
          webResultsCount: webResults.length,
          memoryUsed: !!memoryContext,
          sourceType: useOwnKnowledge ? 'general' : 'documents',
          sources: useOwnKnowledge
            ? [{ name: 'AI Knowledge', type: 'general', text: 'AI answered from its own knowledge' }]
            : [...localResults.map(r => ({
              id: r.id, text: r.text.slice(0, 300), fileName: r.metadata?.fileName || 'Unknown',
              score: r.rerankScore || r.score, type: 'local'
            })), ...webResults.map(r => ({
              id: r.url, text: r.snippet, fileName: r.title, score: 0.5, type: 'web', url: r.url
            }))],
          conversationId: convId
        })}\n\n`);
      } else if (chunk.type === 'error') {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('Chat stream error:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', message: 'Failed to process chat message' })}\n\n`);
    res.end();
  }
};

exports.getConversations = async (req, res) => {
  try {
    const conversations = db.findAll('conversations', { userId: req.user.id })
      .map(c => ({
        id: c.id, title: c.title, messageCount: c.messages.length,
        lastMessage: c.messages.length > 0 ? c.messages[c.messages.length - 1].content.slice(0, 100) : '',
        level: c.level || 'general', createdAt: c.createdAt
      }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to get conversations' });
  }
};

exports.getConversation = async (req, res) => {
  try {
    const conversation = db.findOne('conversations', { id: req.params.id, userId: req.user.id });
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
    res.json({ conversation });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'Failed to get conversation' });
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
