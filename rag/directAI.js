const webSearch = require('./webSearch');
const SEARCH_MODES = require('../config/searchModes');
const ProviderFactory = require('./aiProvider/ProviderFactory');

class DirectAI {
  constructor() {
    this.provider = ProviderFactory.createProvider();
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
      const res = await this.provider.generate(messages);
      const answer = res.content || 'No response generated.';
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
      const stream = this.provider.generateStream(messages);

      for await (const chunk of stream) {
        if (chunk.type === 'content') {
          fullContent += chunk.content;
          yield chunk;
        }
      }

      const citations = webSearch.getWebCitations(webResults);

      yield { type: 'citations', citations };
      yield { type: 'searchStrategy', searchStrategy };
      yield { type: 'done' };
    } catch (error) {
      console.error('Direct AI stream error:', error.message);
      if (fullContent) {
        const citations = webSearch.getWebCitations(webResults);
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
