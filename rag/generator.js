const https = require('https');
const promptEditor = require('./promptEditor');

class Generator {
  constructor() {
    this.model = process.env.GROQ_MODEL || 'llama3-70b-8192';
    this.temperature = 0.1;
    this.maxTokens = 2048;
    this.apiKey = process.env.GROQ_API_KEY;
  }

  _callGroqAPI(messages, stream = false) {
    return new Promise((resolve, reject) => {
      const body = JSON.stringify({
        messages,
        model: this.model,
        temperature: this.temperature,
        max_tokens: this.maxTokens,
        stream
      });

      const req = https.request({
        hostname: 'api.groq.com',
        path: '/openai/v1/chat/completions',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        },
        timeout: 60000
      }, (res) => {
        if (stream) {
          resolve(res);
        } else {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              if (parsed.error) {
                reject(new Error(parsed.error.message || 'API error'));
              } else {
                resolve(parsed);
              }
            } catch (e) {
              reject(new Error('Failed to parse API response'));
            }
          });
        }
      });

      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
      req.write(body);
      req.end();
    });
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
      'kn': 'Kannada (ಕನ್ನಡ)', 'gu': 'Gujarati (ગુજરાતી)', 'pa': 'Punjabi (ਪੰਜਾਬੀ)',
      'od': 'Odia (ଓଡ଼ିଆ)', 'as': 'Assamese (অসমীয়া)', 'ml': 'Malayalam (മലയാളം)',
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
          const completion = await this._callGroqAPI(messages, false);
          const answer = completion.choices?.[0]?.message?.content || 'No response generated.';
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
      const recentHistory = conversationHistory.slice(-6);
      for (const msg of recentHistory) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    const sourcesDesc = useWebSearch ? 'the retrieved documents and web search results' : 'the retrieved documents';
    const userMessage = `RETRIEVED CONTEXT:\n\n${context}\n\n---\n\nUSER QUESTION: ${query}\n\nProvide a comprehensive answer based on ${sourcesDesc} above. Cite sources for every legal fact. Use [Source N] for local documents and [Web Source N] for web results.`;
    messages.push({ role: 'user', content: userMessage });

    try {
      const completion = await this._callGroqAPI(messages, false);
      const answer = completion.choices?.[0]?.message?.content || 'No response generated.';
      const sources = this._extractSources(context);
      return { answer, sources };
    } catch (error) {
      console.error('Groq API error:', error.message);
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
          const res = await this._callGroqAPI(messages, true);
          let buffer = '';
          await new Promise((resolve, reject) => {
            res.on('data', (chunk) => {
              buffer += chunk.toString();
              const lines = buffer.split('\n');
              buffer = lines.pop();
              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith('data: ')) continue;
                const data = trimmed.slice(6);
                if (data === '[DONE]') continue;
                try {
                  const parsed = JSON.parse(data);
                  const delta = parsed.choices?.[0]?.delta?.content;
                  if (delta) fullContent += delta;
                } catch (e) { /* skip unparseable chunks */ }
              }
            });
            res.on('end', resolve);
            res.on('error', reject);
          });
          if (fullContent) {
            yield { type: 'content', content: fullContent };
          }
          yield { type: 'done', sources: [{ name: 'AI Knowledge', index: 0, type: 'general' }], confidence: 40, sourceType: 'general' };
        } catch (error) {
          console.error('Groq streaming error (own knowledge):', error.message);
          if (fullContent) {
            yield { type: 'content', content: fullContent };
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
      const res = await this._callGroqAPI(messages, true);
      let buffer = '';

      await new Promise((resolve, reject) => {
        res.on('data', (chunk) => {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop();
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;
            const data = trimmed.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                fullContent += delta;
              }
            } catch (e) { /* skip unparseable chunks */ }
          }
        });
        res.on('end', resolve);
        res.on('error', reject);
      });

      if (fullContent) {
        yield { type: 'content', content: fullContent };
      }
      yield { type: 'done', sources, confidence: this._calculateConfidence(fullContent, context) };
    } catch (error) {
      console.error('Groq streaming error:', error.message);
      if (fullContent) {
        yield { type: 'content', content: fullContent };
        yield { type: 'done', sources, confidence: this._calculateConfidence(fullContent, context) };
      } else {
        yield { type: 'error', message: 'AI service unavailable. Please try again later.' };
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
      const result = await this._callGroqAPI([
        { role: 'user', content: prompt }
      ], false);
      const rewritten = result.choices?.[0]?.message?.content?.trim();
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

  _calculateConfidence(answer, context) {
    const sourceMatches = (answer.match(/\[Source \d+\]/g) || []).length;
    const contextLength = context.length;
    const answerLength = answer.length;

    if (contextLength === 0) return 0;

    let confidence = Math.min(15 + sourceMatches * 12, 50);

    if (answerLength > 300) confidence = Math.min(confidence + 10, 70);
    if (answerLength > 800) confidence = Math.min(confidence + 10, 80);

    const highTrustIndicators = (answer.match(/Supreme Court|Constitution|India Code|Gazette/gi) || []).length;
    confidence = Math.min(confidence + highTrustIndicators * 3, 85);

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
}

module.exports = new Generator();
