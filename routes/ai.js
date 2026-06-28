const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { optionalAuth } = require('../middleware/auth');
const directAI = require('../rag/directAI');

// POST /api/ai/generate — direct AI (no RAG)
router.post('/generate', optionalAuth, async (req, res) => {
  try {
    const { prompt, mode, useWebSearch = false, searchMode = 'general', language = 'auto' } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt required' });

    const result = await directAI.generate(prompt, { mode, useWebSearch, searchMode, language });
    res.json({
      answer: result.answer,
      citations: result.citations || [],
      searchStrategy: result.searchStrategy || null,
      id: uuidv4()
    });
  } catch (error) {
    console.error('AI generate error:', error.message);
    res.status(500).json({ error: 'AI service unavailable' });
  }
});

// POST /api/ai/stream — streaming direct AI
router.post('/stream', optionalAuth, async (req, res) => {
  try {
    const { prompt, mode, useWebSearch = false, searchMode = 'general', language = 'auto' } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt required' });

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    const stream = directAI.generateStream(prompt, { mode, useWebSearch, searchMode, language });

    for await (const chunk of stream) {
      if (chunk.type === 'content') {
        res.write(`data: ${JSON.stringify({ content: chunk.content })}\n\n`);
      } else if (chunk.type === 'citations') {
        res.write(`data: ${JSON.stringify({ citations: chunk.citations })}\n\n`);
      } else if (chunk.type === 'searchStrategy') {
        res.write(`data: ${JSON.stringify({ searchStrategy: chunk.searchStrategy })}\n\n`);
      } else if (chunk.type === 'done') {
        res.write(`data: [DONE]\n\n`);
      } else if (chunk.type === 'error') {
        res.write(`data: ${JSON.stringify({ error: chunk.message })}\n\n`);
      }
    }

    res.end();
  } catch (error) {
    console.error('AI stream error:', error.message);
    if (!res.headersSent) res.status(500).json({ error: 'AI service unavailable' });
    else res.end();
  }
});

module.exports = router;
