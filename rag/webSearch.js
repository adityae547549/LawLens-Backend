const https = require('https');
const http = require('http');
const { URL } = require('url');
const SEARCH_MODES = require('../config/searchModes');

const SOURCE_TRUST = {
  'indiacode.nic.in': { badge: '📚', level: 'official', label: 'India Code' },
  'sci.gov.in': { badge: '⚖️', level: 'official', label: 'Supreme Court of India' },
  'hcourt.gov.in': { badge: '🏛️', level: 'official', label: 'High Court' },
  'ecourts.gov.in': { badge: '🏛️', level: 'official', label: 'eCourts' },
  'egazette.nic.in': { badge: '📰', level: 'official', label: 'e-Gazette of India' },
  'sansad.in': { badge: '🏛️', level: 'official', label: 'Parliament of India' },
  'parliamentofindia.nic.in': { badge: '🏛️', level: 'official', label: 'Parliament' },
  'indiankanoon.org': { badge: '⚖️', level: 'trusted', label: 'Indian Kanoon' },
  'scconline.com': { badge: '📚', level: 'trusted', label: 'SCC Online' },
  'livelaw.in': { badge: '📰', level: 'trusted', label: 'LiveLaw' },
  'barandbench.com': { badge: '📰', level: 'trusted', label: 'Bar & Bench' },
  'manupatra.com': { badge: '📚', level: 'trusted', label: 'ManuPatra' },
  'legalserviceindia.com': { badge: '📚', level: 'trusted', label: 'Legal Service India' },
  'lawctopus.com': { badge: '📚', level: 'trusted', label: 'Lawctopus' },
  'constitutionofindia.net': { badge: '📚', level: 'trusted', label: 'Constitution of India' },
  'india.gov.in': { badge: '🇮🇳', level: 'official', label: 'India.gov.in' },
  'presidentofindia.nic.in': { badge: '🇮🇳', level: 'official', label: 'President of India' },
  'rajyasabha.nic.in': { badge: '🏛️', level: 'official', label: 'Rajya Sabha' },
  'loksabha.nic.in': { badge: '🏛️', level: 'official', label: 'Lok Sabha' },
  'lawcommissionofindia.nic.in': { badge: '⚖️', level: 'official', label: 'Law Commission' },
  'legislative.gov.in': { badge: '🏛️', level: 'official', label: 'Legislative Department' },
  'mlj.gov.in': { badge: '🏛️', level: 'official', label: 'Ministry of Law & Justice' },
};

function getSourceTrust(url) {
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    for (const [domain, trust] of Object.entries(SOURCE_TRUST)) {
      if (hostname === domain || hostname.endsWith('.' + domain)) {
        return trust;
      }
    }
    return { badge: '🔵', level: 'web', label: 'Web Source' };
  } catch {
    return { badge: '🔵', level: 'web', label: 'Web Source' };
  }
}

function isDomainAllowed(url, mode) {
  const config = SEARCH_MODES[mode];
  if (!config || !config.allowedDomains) return true;
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    return config.allowedDomains.some(d => hostname === d || hostname.endsWith('.' + d));
  } catch {
    return false;
  }
}

class WebSearch {
  constructor() {
    this.maxResults = 5;
    this.timeout = 5000;
  }

  _fetch(url, redirectCount = 0) {
    return new Promise((resolve, reject) => {
      if (redirectCount > 5) return reject(new Error('Too many redirects'));
      const protocol = url.startsWith('https') ? https : http;
      const req = protocol.get(url, {
        timeout: this.timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        }
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return this._fetch(res.headers.location, redirectCount + 1).then(resolve).catch(reject);
        }
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    });
  }

  _parseDDGHtml(html) {
    const results = [];
    const resultRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;

    const links = [];
    let match;
    while ((match = resultRegex.exec(html)) !== null) {
      links.push({ url: match[1], title: match[2].replace(/<[^>]+>/g, '').trim() });
    }

    const snippets = [];
    while ((match = snippetRegex.exec(html)) !== null) {
      snippets.push(match[1].replace(/<[^>]+>/g, '').trim());
    }

    for (let i = 0; i < Math.min(links.length, this.maxResults + 5); i++) {
      let url = links[i].url;
      if (url.includes('uddg=')) {
        try {
          const params = new URLSearchParams(url.split('?')[1]);
          url = decodeURIComponent(params.get('uddg') || url);
        } catch {}
      }
      const trust = getSourceTrust(url);
      results.push({
        title: links[i].title,
        url: url,
        snippet: snippets[i] || '',
        source: 'web',
        trust
      });
    }

    return results;
  }

  _parseDDGJson(html) {
    const results = [];
    try {
      const data = JSON.parse(html);
      if (data.AbstractText) {
        const url = data.AbstractURL || '';
        const trust = getSourceTrust(url);
        results.push({
          title: data.Heading || 'Wikipedia',
          url: url,
          snippet: data.AbstractText,
          source: 'web',
          trust
        });
      }
      if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
        for (const topic of data.RelatedTopics.slice(0, this.maxResults - results.length)) {
          if (topic.Text) {
            const url = topic.FirstURL || '';
            const trust = getSourceTrust(url);
            results.push({
              title: topic.Text.split(' - ')[0] || 'Related',
              url: url,
              snippet: topic.Text,
              source: 'web',
              trust
            });
          }
        }
      }
    } catch {}
    return results;
  }

  async search(query, mode = 'general') {
    const config = SEARCH_MODES[mode] || SEARCH_MODES.general;
    const results = [];

    try {
      const encodedQuery = encodeURIComponent(query + (config.searchSuffix || ''));
      const html = await this._fetch(`https://html.duckduckgo.com/html/?q=${encodedQuery}`);
      let parsed = this._parseDDGHtml(html);

      // Filter by allowed domains for strict/extended modes
      if (config.allowedDomains) {
        parsed = parsed.filter(r => isDomainAllowed(r.url, mode));
      }

      results.push(...parsed);
    } catch (err) {
      console.error('DDG HTML search failed:', err.message);
    }

    if (results.length === 0) {
      try {
        const encodedQuery = encodeURIComponent(query + (config.searchSuffix || ''));
        const html = await this._fetch(`https://api.duckduckgo.com/?q=${encodedQuery}&format=json&no_html=1&skip_disambig=1`);
        let parsed = this._parseDDGJson(html);

        if (config.allowedDomains) {
          parsed = parsed.filter(r => isDomainAllowed(r.url, mode));
        }

        results.push(...parsed);
      } catch (err) {
        console.error('DDG JSON search failed:', err.message);
      }
    }

    return results.slice(0, config.maxResults);
  }

  formatWebResults(results) {
    if (!results || results.length === 0) return '';
    return results.map((r, i) => {
      return `[Web Source ${i + 1}: ${r.title}]\n${r.snippet}\nURL: ${r.url}\n`;
    }).join('\n');
  }

  getWebCitations(results) {
    if (!results || results.length === 0) return [];
    return results.map((r, i) => ({
      index: i + 1,
      title: r.title,
      url: r.url,
      snippet: r.snippet.slice(0, 200),
      source: 'web',
      trust: r.trust || getSourceTrust(r.url)
    }));
  }

  getSearchStrategy(mode, resultsCount) {
    const config = SEARCH_MODES[mode] || SEARCH_MODES.general;
    const excluded = [];
    if (config.excludedTerms) excluded.push(...config.excludedTerms);
    if (config.allowedDomains === null) {
      excluded.push('blogs', 'AI-generated sites');
    }

    return {
      mode: config.badge,
      modeName: config.name,
      description: config.description,
      sourcesUsed: resultsCount,
      allowedDomains: config.allowedDomains,
      excluded: excluded,
      filtered: config.allowedDomains !== null
    };
  }
}

module.exports = new WebSearch();
