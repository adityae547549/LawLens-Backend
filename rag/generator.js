const promptEditor = require('./promptEditor');
const ProviderFactory = require('./aiProvider/ProviderFactory');

class Generator {
  constructor() {
    this.provider = ProviderFactory.createProvider();
  }

  _getExplainLevelPrompt(level) {
    const levels = {
      'child': 'Explain like I am 12 years old. Use simple everyday words. No legal jargon. Use relatable analogies from daily life. Keep sentences short.',
      'student': 'Explain for a university student. Use clear language with brief explanations of legal terms. Connect concepts to real-world examples.',
      'upsc': 'Explain for a UPSC aspirant. Be precise and analytical. Connect to related constitutional provisions. Use standard legal terminology with brief explanations.',
      'lawyer': 'Explain for a practicing lawyer. Use proper legal terminology. Reference relevant case law and statutory provisions. Be concise and professional.',
      'judge': 'Explain at a judicial level. Use precise legal language. Reference binding precedents and constitutional principles. Analyze from multiple legal perspectives.',
      'general': 'Explain in clear, plain language that anyone can understand. Avoid unnecessary jargon. Be thorough but accessible.'
    };
    return levels[level] || levels['general'];
  }

  _buildSystemPrompt(level = 'general', useWebSearch = false, language = 'auto', memoryContext = '', useOwnKnowledge = false) {
    const basePrompt = promptEditor.getPrompt();
    const levelInstruction = this._getExplainLevelPrompt(level);

    const languageNames = {
      'auto': 'Detect and match the user\'s language',
      'en': 'English', 'hi': 'Hindi (हिन्दी)', 'bn': 'Bengali (বাংলা)',
      'ta': 'Tamil (தமிழ்)', 'te': 'Telugu (తెలుగు)', 'mr': 'Marathi (मराठी)',
      'kn': 'Kannada (<ctrl42>ಕನ್ನಡ)', 'gu': 'Gujarati (ગુજરાતી)', 'pa': 'Punjabi (ਪੰਜਾਬੀ)',
      'od': 'Odia (ଓଡ଼ိଆ)', 'as': 'Assamese (অসমীয়া)', 'ml': 'Malayalam (മലയാളം)',
      'ur': 'Urdu (اردو)'
    };
    const languageInstruction = language && language !== 'auto'
      ? `\nRESPONSE LANGUAGE: The user has selected ${languageNames[language] || language}. You MUST respond in ${languageNames[language] || language}.`
      : '\nRESPONSE LANGUAGE: Detect the language the user writes in and reply in that same language.';

    const webSearchInstruction = useWebSearch ? `
IMPORTANT: You have access to both LOCAL LEGAL DOCUMENTS and WEB SEARCH RESULTS.
- LOCAL LEGAL DOCUMENTS are from the uploaded legal database and are authoritative.
- WEB SEARCH RESULTS are from the internet and provide supplementary context.
- ALWAYS prioritize local documents over web results when they conflict.
- When citing web sources, use [Web Source N] notation.
- Clearly indicate whether a fact comes from a local document or from the web.` : '';

    const memoryInstruction = memoryContext ? `
CONVERSATION MEMORY (past discussions with this user):
${memoryContext}

Use the above memory to:
- Reference prior discussions when relevant to the current question
- Build upon concepts previously explained
- Avoid repeating information already covered
- Note if the user has asked similar questions before and what was discussed
- If the current question relates to a past conversation, connect the dots
- Do NOT reference memory if it's not relevant to the current question` : '';

    const ownKnowledgeInstruction = useOwnKnowledge ? `
IMPORTANT: You are answering from your own general knowledge. You do NOT have specific retrieved documents for this query.
- Draw upon your training data to provide helpful, accurate responses
- Be honest about your confidence level - if unsure, say so
- Do NOT fabricate legal citations, section numbers, or case citations unless you are certain
- If you don't know something, clearly state that you don't know
- You can provide general background, explanations, and analysis from your knowledge
- This is NOT a legal database lookup - it's a general knowledge conversation` : '';

    return `${basePrompt}

EXPLANATION LEVEL:
${levelInstruction}
${languageInstruction}
${webSearchInstruction}
${memoryInstruction}
${ownKnowledgeInstruction}`;
  }

  async generate(query, context, conversationHistory = [], options = {}) {
    const { level = 'general', useWebSearch = false, language = 'auto', memoryContext = '', useOwnKnowledge = false } = options;

    if (!context || context.trim().length === 0) {
      if (useOwnKnowledge) {
        const messages = [
          { role: 'system', content: this._buildSystemPrompt(level, false, language, memoryContext, true) }
        ];
        if (conversationHistory.length > 0) {
          const recentHistory = conversationHistory.slice(-6);
          for (const msg of recentHistory) {
            messages.push({ role: msg.role, content: msg.content });
          }
        }
        messages.push({ role: 'user', content: query });
        try {
          const res = await this.provider.generate(messages);
          const answer = res.content || 'No response generated.';
          return { answer, sources: [{ name: 'AI Knowledge', index: 0, type: 'general' }], confidence: 40, sourceType: 'general' };
        } catch (error) {
          console.error('Groq API error (own knowledge):', error.message);
          return { answer: 'AI service unavailable. Please try again later.', sources: [], confidence: 0 };
        }
      }
      return {
        answer: "I couldn't find relevant information in the current legal database. Please try rephrasing your question or check if the relevant documents have been uploaded.",
        sources: [],
        confidence: 0
      };
    }

    const messages = [
      { role: 'system', content: this._buildSystemPrompt(level, useWebSearch, language, memoryContext) }
    ];

    if (conversationHistory.length > 0) {
      const recentHistory = conversationHistory.slice(-8);
      for (const msg of recentHistory) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    const truncatedContext = context.length > 8000 ? context.slice(0, 8000) + '\n\n[Context truncated for length]' : context;
    const sourcesDesc = useWebSearch ? 'the retrieved documents and web search results' : 'the retrieved documents';
    const userMessage = `RETRIEVED CONTEXT:\n\n${truncatedContext}\n\n---\n\nUSER QUESTION: ${query}\n\nProvide a comprehensive answer based on ${sourcesDesc} above. Cite sources for every legal fact. Use [Source N] for local documents and [Web Source N] for web results.`;
    messages.push({ role: 'user', content: userMessage });

    try {
      const res = await this.provider.generate(messages);
      const answer = res.content || 'No response generated.';
      const sources = this._extractSources(context);
      const confidence = this._calculateConfidence(answer, context);
      const citationCheck = this._verifyCitations(answer, sources);
      return { answer, sources, confidence, citationCheck };
    } catch (error) {
      console.error('Groq API error:', error.message);
      const degraded = this._buildDegradedAnswer(query, context);
      if (degraded) return degraded;
      return { answer: 'AI service unavailable. Please try again later.', sources: [] };
    }
  }

  async *generateStream(query, context, conversationHistory = [], options = {}) {
    const { level = 'general', useWebSearch = false, language = 'auto', memoryContext = '', useOwnKnowledge = false } = options;

    if (!context || context.trim().length === 0) {
      if (useOwnKnowledge) {
        yield { type: 'status', message: 'Answering from AI general knowledge' };
        const messages = [
          { role: 'system', content: this._buildSystemPrompt(level, false, language, memoryContext, true) }
        ];
        if (conversationHistory.length > 0) {
          const recentHistory = conversationHistory.slice(-8);
          for (const msg of recentHistory) {
            messages.push({ role: msg.role, content: msg.content });
          }
        }
        messages.push({ role: 'user', content: query });
        let fullContent = '';
        try {
          const stream = this.provider.generateStream(messages);
          for await (const chunk of stream) {
            if (chunk.type === 'content') {
              fullContent += chunk.content;
              yield chunk;
            }
          }
          yield { type: 'done', sources: [{ name: 'AI Knowledge', index: 0, type: 'general' }], confidence: 40, sourceType: 'general' };
        } catch (error) {
          console.error('Groq streaming error (own knowledge):', error.message);
          if (fullContent) {
            yield { type: 'done', sources: [{ name: 'AI Knowledge', index: 0, type: 'general' }], confidence: 40, sourceType: 'general' };
          } else {
            yield { type: 'error', message: 'AI service unavailable. Please try again later.' };
          }
        }
        return;
      }
      yield { type: 'status', message: 'No relevant documents found' };
      yield { type: 'content', content: "I couldn't find relevant information in the current legal database. Please try rephrasing your question or check if the relevant documents have been uploaded." };
      yield { type: 'done', sources: [], confidence: 0 };
      return;
    }

    const truncatedContext = context.length > 8000 ? context.slice(0, 8000) + '\n\n[Context truncated for length]' : context;

    const messages = [
      { role: 'system', content: this._buildSystemPrompt(level, useWebSearch, language, memoryContext) }
    ];

    if (conversationHistory.length > 0) {
      const recentHistory = conversationHistory.slice(-8);
      for (const msg of recentHistory) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    const sourcesDesc = useWebSearch ? 'the retrieved documents and web search results' : 'the retrieved documents';
    const userMessage = `RETRIEVED CONTEXT:\n\n${truncatedContext}\n\n---\n\nUSER QUESTION: ${query}\n\nProvide a comprehensive answer based on ${sourcesDesc} above. Cite sources for every legal fact. Use [Source N] for local documents and [Web Source N] for web results.`;
    messages.push({ role: 'user', content: userMessage });

    const sources = this._extractSources(context);
    let fullContent = '';

    try {
      const stream = this.provider.generateStream(messages);
      for await (const chunk of stream) {
        if (chunk.type === 'content') {
          fullContent += chunk.content;
          yield chunk;
        }
      }
      const citationCheck = this._verifyCitations(fullContent, sources);
      yield { type: 'done', sources, confidence: this._calculateConfidence(fullContent, context), citationCheck };
    } catch (error) {
      console.error('Groq streaming error:', error.message);
      if (fullContent) {
        yield { type: 'done', sources, confidence: this._calculateConfidence(fullContent, context) };
      } else {
        const degraded = this._buildDegradedAnswer(query, context);
        if (degraded) {
          yield { type: 'content', content: degraded.answer };
          yield { type: 'done', sources: degraded.sources, confidence: 30 };
        } else {
          yield { type: 'error', message: 'AI service unavailable. Please try again later.' };
        }
      }
    }
  }

  async rewriteQuery(currentQuery, conversationHistory) {
    if (!conversationHistory || conversationHistory.length < 2) return currentQuery;

    const context = conversationHistory.slice(-4).map(m =>
      `${m.role === 'user' ? 'User' : 'Assistant'}: ${(m.content || '').slice(0, 200)}`
    ).join('\n');

    const prompt = `Based on this conversation context, rewrite the user's latest message as a standalone legal search query for document retrieval.
The query should capture the full intent including any referenced topics from earlier in the conversation.
Return ONLY the rewritten query, nothing else.

Conversation context:
${context}

User's new message: "${currentQuery}"

Standalone search query:`;

    try {
      const res = await this.provider.generate([
        { role: 'user', content: prompt }
      ]);
      const rewritten = res.content?.trim();
      if (rewritten && rewritten.length > 5 && rewritten.length < 200) {
        return rewritten;
      }
    } catch (e) {
      // Fallback to original query on error
    }
    return currentQuery;
  }

  generateFollowUpSuggestions(answer, citations) {
    const suggestions = [];
    const articleMentions = (answer.match(/Article\s+\d+/gi) || []);
    const sectionMentions = (answer.match(/Section\s+\d+/gi) || []);
    const caseMentions = (answer.match(/(?:v\.|vs\.?|versus)\s+\w+/gi) || []);

    if (articleMentions.length > 0) {
      const art = articleMentions[0].replace(/\s+/g, ' ');
      suggestions.push(`What are the exceptions to ${art}?`);
      if (articleMentions.length > 1) {
        suggestions.push(`Compare ${articleMentions[0]} and ${articleMentions[1]}`);
      }
    }
    if (sectionMentions.length > 0) {
      suggestions.push(`Explain ${sectionMentions[0]} with examples`);
    }
    if (caseMentions.length > 0) {
      suggestions.push(`Summarize the ${caseMentions[0]} judgment`);
    }

    suggestions.push('What are the recent amendments related to this?');
    if (suggestions.length < 3) {
      suggestions.push('Explain this in simpler language');
    }

    return suggestions.slice(0, 3);
  }

  _extractLegalReferences(answer) {
    if (!answer) return { articles: [], sections: [], acts: [] };
    const articles = Array.from(new Set(answer.match(/\bArticle\s+\d+[A-Z]?\b/gi) || [])).map(a => a.trim());
    const sections = Array.from(new Set(answer.match(/\bSection\s+\d+[A-Z]?\b/gi) || [])).map(s => s.trim());
    const acts = Array.from(new Set(answer.match(/\b(?:Act,\s*\d{4}|Act\s+\d{4}|Constitution|BNS|BNSS|BSA|IPC|CrPC)\b/gi) || [])).map(a => a.trim());

    return { articles, sections, acts };
  }

  _calculateConfidence(answer, context) {
    const sourceMatches = (answer.match(/\[Source \d+\]/g) || []).length;
    const contextLength = context.length;
    const answerLength = answer.length;

    if (contextLength === 0) return 0;

    let confidence = Math.min(20 + sourceMatches * 15, 60);

    if (answerLength > 300) confidence = Math.min(confidence + 10, 75);
    if (answerLength > 800) confidence = Math.min(confidence + 10, 85);

    const highTrustIndicators = (answer.match(/Supreme Court|Constitution|India Code|Gazette|BNS|BNSS|BSA/gi) || []).length;
    confidence = Math.min(confidence + highTrustIndicators * 3, 90);

    if (answer.toLowerCase().includes("couldn't find")) confidence = 10;
    if (answer.toLowerCase().includes("not sufficient")) confidence = 15;
    if (answer.toLowerCase().includes("not verified")) confidence = 12;

    if (answer.includes("I think") || answer.includes("I believe") || answer.includes("possibly")) {
      confidence = Math.max(confidence - 10, 5);
    }

    return Math.min(confidence, 100);
  }

  _extractSources(context) {
    const sources = [];
    const sourceRegex = /\[Source (\d+): ([^\]]+)\]/g;
    let match;
    while ((match = sourceRegex.exec(context)) !== null) {
      const sourceNum = parseInt(match[1]);
      if (!sources.find(s => s.name === match[2])) {
        sources.push({ index: sourceNum, name: match[2] });
      }
    }
    return sources;
  }

  _verifyCitations(answer, sources) {
    const citedNumbers = new Set();
    const citationRegex = /\[Source (\d+)\]/g;
    let match;
    while ((match = citationRegex.exec(answer)) !== null) {
      citedNumbers.add(parseInt(match[1]));
    }

    const verified = [];
    const unverified = [];
    for (const num of citedNumbers) {
      const source = sources.find(s => s.index === num);
      if (source) {
        verified.push({ index: num, name: source.name, verified: true });
      } else {
        unverified.push({ index: num, verified: false, reason: 'Source not found in retrieved context' });
      }
    }

    return { verified, unverified, total: citedNumbers.size };
  }

  /**
   * When the LLM provider is unreachable but retrieval succeeded, build an honest
   * degraded answer from the verbatim retrieved source excerpts so the user still
   * gets value (authoritative text) instead of a dead-end error.
   * Returns null when there is no usable context to fall back on.
   */
  _buildDegradedAnswer(query, context) {
    if (!context || context.trim().length === 0) return null;

    const sourceRegex = /\[Source (\d+): ([^\]]+)\]\n([\s\S]*?)(?=\n\[Source \d+:|$)/g;
    const excerpts = [];
    let match;
    while ((match = sourceRegex.exec(context)) !== null) {
      const title = match[2].trim();
      const text = match[3].trim();
      if (title && text) excerpts.push({ title, text });
    }
    if (excerpts.length === 0) return null;

    const top = excerpts.slice(0, 3);
    const body = top
      .map((e, i) => `**[Source ${i + 1}] ${e.title}**\n\n${e.text.length > 500 ? e.text.slice(0, 500) + '…' : e.text}`)
      .join('\n\n');

    return {
      answer: `⚠️ The AI generation service is temporarily unavailable, so I couldn't write a full answer. The most relevant passages from your legal database are shown below — they directly address **"${query}"**.\n\n${body}\n\n_Retrieved verbatim from your indexed legal documents. Try again shortly for a full AI-written answer._`,
      sources: excerpts.slice(0, 5).map(e => ({ name: e.title }))
    };
  }
}

module.exports = new Generator();
