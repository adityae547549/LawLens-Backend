const retriever = require('../rag/retriever');
const generator = require('../rag/generator');
const memory = require('../rag/memory');
const db = require('../database/db');

function trackAnalytics(event, data) {
  db.insertOne('analytics', { event, ...data, timestamp: new Date().toISOString() });
}

// Private Helper Functions
function _getChatContext(user, conversationId, mode, useMemory) {
  const useWebSearch = mode === 'web' || mode === 'hybrid';
  const useOwnKnowledge = mode === 'general';
  const conversation = conversationId
    ? db.findOne('conversations', { id: conversationId })
    : null;
  const history = conversation ? conversation.messages || [] : [];
  const memoryContext = useMemory && user ? memory.getMemoryContext(user.id) : '';

  return { useWebSearch, useOwnKnowledge, conversation, history, memoryContext };
}

function _calculateConfidence(useOwnKnowledge, citations, fallbackScore = 40) {
  return useOwnKnowledge
    ? { score: fallbackScore, level: 'medium', label: 'General Knowledge' }
    : retriever.calculateOverallConfidence(citations);
}

const MAX_CONVERSATION_MESSAGES = 50;

function _saveConversationAndTrack(user, message, answer, citations, confidenceScore, conversationId, conversation, level, useWebSearch, resultCount, analyticsEvent) {
  let convId = conversationId;
  if (user) {
    const existingMessages = conversation ? conversation.messages || [] : [];
    let newMessages = [
      ...existingMessages,
      { role: 'user', content: message, timestamp: new Date().toISOString() },
      { role: 'assistant', content: answer, sources: citations, confidence: confidenceScore, timestamp: new Date().toISOString() }
    ];

    const totalMessages = (conversation?.messageCount || existingMessages.length) + 2;
    let archivedCount = conversation?.archivedCount || 0;

    if (newMessages.length > MAX_CONVERSATION_MESSAGES) {
      const overflow = newMessages.length - MAX_CONVERSATION_MESSAGES;
      archivedCount += overflow;
      newMessages = newMessages.slice(overflow);
    }

    if (!convId) {
      const newConv = db.insertOne('conversations', {
        userId: user.id,
        title: message.slice(0, 60) + (message.length > 60 ? '...' : ''),
        messages: newMessages,
        messageCount: totalMessages,
        archivedCount,
        level,
        useWebSearch
      });
      convId = newConv.id;
    } else {
      db.updateOne('conversations', { id: convId }, {
        messages: newMessages,
        messageCount: totalMessages,
        archivedCount,
        updatedAt: new Date().toISOString()
      });
    }
    trackAnalytics(analyticsEvent, { userId: user.id, query: message, resultCount, confidence: confidenceScore, useWebSearch });
  }
  return convId;
}

function _formatSources(useOwnKnowledge, localResults, webResults, isStream = false) {
  if (useOwnKnowledge) {
    return [{ name: 'AI Knowledge', type: 'general', text: 'AI answered from its own knowledge' }];
  }
  return [
    ...localResults.map(r => ({
      id: r.id,
      text: isStream
        ? r.text.slice(0, 300)
        : r.text.slice(0, 300) + (r.text.length > 300 ? '...' : ''),
      fileName: r.metadata?.fileName || 'Unknown',
      score: r.rerankScore || r.score,
      type: 'local'
    })),
    ...webResults.map(r => ({
      id: r.url, text: r.snippet, fileName: r.title, score: 0.5, type: 'web', url: r.url
    }))
  ];
}

exports.chat = async (req, res) => {
  try {
    const { message, conversationId, mode = 'legal', level = 'general', language = 'auto', fileId, useMemory = false } = req.body;
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const { useWebSearch, useOwnKnowledge, conversation, history, memoryContext } =
      _getChatContext(req.user, conversationId, mode, useMemory);

    let localResults = [], webResults = [], graphResults = [], context = '', citations = [];
    if (mode !== 'general') {
      const results = await retriever.retrieve(message, { mode, k: 5, useWebSearch, fileId });
      localResults = results.localResults;
      webResults = results.webResults;
      graphResults = results.graphResults || [];
      context = retriever.formatContext(localResults, webResults, graphResults);
      citations = retriever.getCitations(localResults, webResults);
    }
    const { answer, sources, confidence, citationCheck } = await generator.generate(message, context, history, { level, useWebSearch, language, memoryContext, useOwnKnowledge });

    const confidenceResult = _calculateConfidence(useOwnKnowledge, citations, sources?.[0]?.type === 'general' ? 40 : 0);
    const convId = _saveConversationAndTrack(req.user, message, answer, citations, confidenceResult.score, conversationId, conversation, level, useWebSearch, localResults.length + webResults.length, 'chat');

    res.json({
      answer,
      citations,
      confidence: confidenceResult.score,
      confidenceLevel: confidenceResult.level,
      confidenceLabel: confidenceResult.label,
      citationCheck: citationCheck || { verified: [], unverified: [], total: 0 },
      webResultsCount: webResults.length,
      memoryUsed: !!memoryContext,
      sourceType: useOwnKnowledge ? 'general' : 'documents',
      sources: _formatSources(useOwnKnowledge, localResults, webResults, false),
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

    const { useWebSearch, useOwnKnowledge, conversation, history, memoryContext } =
      _getChatContext(req.user, conversationId, mode, useMemory);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    if (useMemory) {
      res.write(`data: ${JSON.stringify({ type: 'status', message: '🧠 Recalling past conversations...' })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ type: 'status', message: useOwnKnowledge ? '🧠 Preparing AI knowledge...' : '🔍 Understanding your question...' })}\n\n`);

    let localResults = [], webResults = [], graphResults = [], context = '', citations = [];
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
      graphResults = results.graphResults || [];

      if (mode === 'hybrid' && webResults.length > 0) {
        res.write(`data: ${JSON.stringify({ type: 'status', message: `📚 Found ${localResults.length} articles + 🌐 ${webResults.length} web sources. Generating response...` })}\n\n`);
      } else if (mode === 'web') {
        res.write(`data: ${JSON.stringify({ type: 'status', message: `🌐 Found ${webResults.length} web sources. Generating response...` })}\n\n`);
      } else {
        res.write(`data: ${JSON.stringify({ type: 'status', message: `📚 Found ${localResults.length} relevant articles. Explaining...` })}\n\n`);
      }

      context = retriever.formatContext(localResults, webResults, graphResults);
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
        const confidenceResult = _calculateConfidence(useOwnKnowledge, citations, chunk.confidence || 40);
        const convId = _saveConversationAndTrack(req.user, message, fullAnswer, citations, confidenceResult.score, conversationId, conversation, level, useWebSearch, localResults.length + webResults.length, 'chat_stream');

        res.write(`data: ${JSON.stringify({
          type: 'done', citations,
          confidence: confidenceResult.score,
          confidenceLevel: confidenceResult.level,
          confidenceLabel: confidenceResult.label,
          citationCheck: chunk.citationCheck || { verified: [], unverified: [], total: 0 },
          webResultsCount: webResults.length,
          memoryUsed: !!memoryContext,
          sourceType: useOwnKnowledge ? 'general' : 'documents',
          sources: _formatSources(useOwnKnowledge, localResults, webResults, true),
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
