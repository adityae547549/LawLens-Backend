const db = require('../database/db');

class ConversationMemory {
  constructor() {
    this.maxConversations = 100;
    this.maxMemoryTokens = 2000;
  }

  getMemoryContext(userId) {
    if (!userId) return '';
    const conversations = db.findAll('conversations', { userId })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, this.maxConversations);

    if (!conversations || conversations.length === 0) return '';

    const memoryBlocks = [];
    for (const conv of conversations) {
      const block = this._summarizeConversation(conv);
      if (block) memoryBlocks.push(block);
    }

    if (memoryBlocks.length === 0) return '';

    const header = 'PAST CONVERSATIONS (for reference across sessions):\n';
    let combined = header + memoryBlocks.join('\n---\n');

    if (combined.length > this.maxMemoryTokens) {
      combined = combined.slice(0, this.maxMemoryTokens) + '\n\n[Memory truncated — showing most relevant past conversations]';
    }

    return combined;
  }

  _summarizeConversation(conversation) {
    const messages = conversation.messages || [];
    if (messages.length < 2) return '';

    const title = conversation.title || 'Untitled Conversation';
    const date = conversation.createdAt
      ? new Date(conversation.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'Unknown date';

    const keyQAs = [];
    let lastUserMsg = '';

    for (const msg of messages) {
      if (msg.role === 'user') {
        lastUserMsg = msg.content.slice(0, 150);
      } else if (msg.role === 'assistant' && lastUserMsg) {
        const summary = this._extractKeyPoints(msg.content);
        keyQAs.push(`Q: ${lastUserMsg}\nA: ${summary}`);
        lastUserMsg = '';
      }
    }

    if (keyQAs.length === 0) return '';

    const maxQA = Math.min(keyQAs.length, 5);
    const selectedQA = keyQAs.slice(0, maxQA).join('\n');

    return `[${date}] ${title}:\n${selectedQA}`;
  }

  _extractKeyPoints(text) {
    if (!text) return '';
    const cleaned = text
      .replace(/\[Source \d+\]/g, '')
      .replace(/\[Web Source \d+\]/g, '')
      .trim();

    const sentences = cleaned.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const keySentences = sentences.slice(0, 3).map(s => s.trim()).join('. ');

    if (keySentences.length > 300) return keySentences.slice(0, 300) + '...';
    return keySentences || cleaned.slice(0, 200);
  }

  clearUserMemory(userId) {
    if (!userId) return;
    const conversations = db.findAll('conversations', { userId });
    for (const conv of conversations) {
      db.deleteOne('conversations', { id: conv.id });
    }
  }
}

module.exports = new ConversationMemory();
