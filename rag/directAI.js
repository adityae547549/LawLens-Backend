const https = require('https');
const webSearch = require('./webSearch');
const SEARCH_MODES = require('../config/searchModes');

class DirectAI {
  constructor() {
    this.model = process.env.GROQ_MODEL || 'llama3-70b-8192';
    this.temperature = 0.3;
    this.maxTokens = 3000;
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
        timeout: 90000
      }, (res) => {
        if (stream) {
          resolve(res);
        } else {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              if (parsed.error) reject(new Error(parsed.error.message || 'API error'));
              else resolve(parsed);
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

  async generate(prompt, options = {}) {
    const { searchMode = 'general', useWebSearch = false, language = 'auto', systemOverride = null } = options;

    let webContext = '';
    let webResults = [];
    let searchStrategy = null;

    if (useWebSearch) {
      try {
        const mode = SEARCH_MODES[searchMode] ? searchMode : 'general';
        webResults = await webSearch.search(prompt, mode);
        searchStrategy = webSearch.getSearchStrategy(mode, webResults.length);

        if (webResults.length > 0) {
          webContext = '\n\nWEB SEARCH RESULTS (use for latest/real-time information):\n' +
            webResults.map((r, i) => `[Web ${i+1}] ${r.title}\n${r.snippet}\nURL: ${r.url}\nTrust: ${r.trust?.label || 'Web Source'}`).join('\n\n');
        }
      } catch (e) {
        // Continue without web search
      }
    }

    const systemPrompt = systemOverride || `You are LawLens AI — a powerful legal research assistant. You have access to the internet for real-time information.

RULES:
1. Provide accurate, well-structured answers
2. When citing legal provisions, verify they are current
3. Use the web search results when provided for up-to-date information
4. Always add a disclaimer: "This is AI-generated information. Not legal advice."
5. Detect the user's language and respond in the same language
6. For document generation, produce professional, properly formatted output
7. For analysis, be thorough and systematic

SUPPORTED LANGUAGES: English, Hindi, Bengali, Tamil, Telugu, Marathi, Kannada, Gujarati, Punjabi, Odia, Assamese, Malayalam, Urdu.`;

    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    if (webContext) {
      messages.push({ role: 'system', content: webContext });
    }
    messages.push({ role: 'user', content: prompt });

    try {
      const completion = await this._callGroqAPI(messages, false);
      const answer = completion.choices?.[0]?.message?.content || 'No response generated.';
      const citations = webSearch.getWebCitations(webResults);

      return {
        answer,
        citations,
        searchStrategy
      };
    } catch (error) {
      console.error('Direct AI error:', error.message);
      throw error;
    }
  }

  async *generateStream(prompt, options = {}) {
    const { searchMode = 'general', useWebSearch = false, language = 'auto', systemOverride = null } = options;

    let webContext = '';
    let webResults = [];
    let searchStrategy = null;

    if (useWebSearch) {
      try {
        const mode = SEARCH_MODES[searchMode] ? searchMode : 'general';
        webResults = await webSearch.search(prompt, mode);
        searchStrategy = webSearch.getSearchStrategy(mode, webResults.length);

        if (webResults.length > 0) {
          webContext = '\n\nWEB SEARCH RESULTS (use for latest/real-time information):\n' +
            webResults.map((r, i) => `[Web ${i+1}] ${r.title}\n${r.snippet}\nURL: ${r.url}\nTrust: ${r.trust?.label || 'Web Source'}`).join('\n\n');
        }
      } catch (e) {
        // Continue without web search
      }
    }

    const systemPrompt = systemOverride || `You are LawLens AI — a powerful legal research assistant. You have access to the internet for real-time information.

RULES:
1. Provide accurate, well-structured answers
2. When citing legal provisions, verify they are current
3. Use the web search results when provided for up-to-date information
4. Always add a disclaimer: "This is AI-generated information. Not legal advice."
5. Detect the user's language and respond in the same language
6. For document generation, produce professional, properly formatted output
7. For analysis, be thorough and systematic

SUPPORTED LANGUAGES: English, Hindi, Bengali, Tamil, Telugu, Marathi, Kannada, Gujarati, Punjabi, Odia, Assamese, Malayalam, Urdu.`;

    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    if (webContext) {
      messages.push({ role: 'system', content: webContext });
    }
    messages.push({ role: 'user', content: prompt });

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
            } catch (e) {}
          }
        });
        res.on('end', resolve);
        res.on('error', reject);
      });

      const citations = webSearch.getWebCitations(webResults);

      if (fullContent) {
        yield { type: 'content', content: fullContent };
      }
      yield { type: 'citations', citations };
      yield { type: 'searchStrategy', searchStrategy };
      yield { type: 'done' };
    } catch (error) {
      console.error('Direct AI stream error:', error.message);
      if (fullContent) {
        const citations = webSearch.getWebCitations(webResults);
        yield { type: 'content', content: fullContent };
        yield { type: 'citations', citations };
        yield { type: 'searchStrategy', searchStrategy };
        yield { type: 'done' };
      } else {
        yield { type: 'error', message: 'AI service unavailable. Please try again later.' };
      }
    }
  }
}

module.exports = new DirectAI();
