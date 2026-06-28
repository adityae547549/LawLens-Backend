const vectorStore = require('./vectorStore');
const reranker = require('./reranker');
const webSearch = require('./webSearch');

const SOURCE_TRUST = {
  'constitution_of_india.pdf': { level: 1, badge: '🟢', label: 'Official Constitution', trust: 'high' },
  'default': { level: 6, badge: '📄', label: 'Legal Document', trust: 'medium' }
};

const WEB_TRUST_DOMAINS = {
  'sci.gov.in': { level: 3, badge: '⚖️', label: 'Supreme Court', trust: 'high' },
  'indiacode.nic.in': { level: 2, badge: '📚', label: 'India Code', trust: 'high' },
  'judgments.ecourts.gov.in': { level: 4, badge: '🏛️', label: 'High Court', trust: 'high' },
  'egazette.nic.in': { level: 5, badge: '📰', label: 'Gazette', trust: 'high' },
  'sansad.in': { level: 5, badge: '🏛️', label: 'Parliament', trust: 'high' }
};

function getSourceTrust(fileName) {
  return SOURCE_TRUST[fileName] || SOURCE_TRUST.default;
}

function getWebTrust(url) {
  if (!url) return { level: 7, badge: '🌐', label: 'Web Source', trust: 'low' };
  for (const [domain, trust] of Object.entries(WEB_TRUST_DOMAINS)) {
    if (url.includes(domain)) return trust;
  }
  return { level: 7, badge: '🌐', label: 'Web Source', trust: 'low' };
}

class Retriever {
  _getOptimalK(query) {
    const wordCount = query.split(/\s+/).length;
    const hasMultipleParts = /\b(and|compare|between|versus|vs\.?|difference|similar)\b/i.test(query);
    const hasBroadTopic = /\b(fundamental rights|directive principles|constitutional remedies|all|overview|explain)\b/i.test(query);
    if (hasMultipleParts || hasBroadTopic) return 8;
    if (wordCount > 15) return 7;
    if (wordCount > 8) return 6;
    return 5;
  }

  _enforceDiversity(results, maxPerDoc = 2) {
    const docCounts = {};
    return results.filter(r => {
      const doc = r.metadata?.fileName || 'unknown';
      docCounts[doc] = (docCounts[doc] || 0) + 1;
      return docCounts[doc] <= maxPerDoc;
    });
  }

  async retrieve(query, options = {}) {
    const {
      mode = 'hybrid',
      k = null,
      filter = null,
      minScore = 0.05,
      useWebSearch = false,
      fileId = null,
      documentTypes = null
    } = options;

    const searchK = k || this._getOptimalK(query);
    const searchMode = useWebSearch ? mode : 'legal';

    let localResults = [];
    let webResults = [];

    if (searchMode === 'legal' || searchMode === 'hybrid') {
      let results;
      switch (searchMode) {
        case 'keyword':
          results = await vectorStore.keywordSearch(query, searchK + 3);
          break;
        default:
          results = await vectorStore.hybridSearch(query, searchK + 3);
      }

      if (fileId) {
        results = results.filter(r => r.metadata?.fileId === fileId);
      }

      if (documentTypes && documentTypes.length > 0) {
        results = results.filter(r => {
          const fn = (r.metadata?.fileName || '').toLowerCase();
          return documentTypes.some(dt => fn.includes(dt));
        });
      }

      if (filter) {
        results = results.filter(r => {
          return Object.entries(filter).every(([key, value]) => r.metadata[key] === value);
        });
      }

      localResults = results.filter(r => r.rerankScore >= minScore || r.score >= minScore);
      localResults = this._enforceDiversity(localResults, 2).slice(0, searchK);
    }

    if (searchMode === 'web' || searchMode === 'hybrid') {
      try {
        webResults = await webSearch.search(query);
      } catch (err) {
        console.error('Web search failed:', err.message);
      }
    }

    return { localResults, webResults };
  }

  async retrieveByArticleId(articleId) {
    return vectorStore.getDocument(articleId);
  }

  async retrieveRelated(articleId, k = 5) {
    const doc = vectorStore.getDocument(articleId);
    if (!doc) return [];
    const results = await vectorStore.hybridSearch(doc.text, k + 5);
    return results.filter(d => d.id !== articleId).slice(0, k);
  }

  formatContext(localResults, webResults = []) {
    let context = '';

    if (localResults && localResults.length > 0) {
      context += 'LOCAL LEGAL DOCUMENTS:\n\n';
      context += localResults.map((r, i) => {
        const source = r.metadata?.fileName || 'Legal Document';
        const trust = getSourceTrust(source);
        const chunkIdx = r.metadata?.chunkIndex;
        const chunkInfo = chunkIdx !== undefined ? ` (Chunk ${chunkIdx + 1})` : '';
        const text = r.text.length > 1500 ? r.text.slice(0, 1500) + '...' : r.text;
        return `[Source ${i + 1}: ${trust.badge} ${source}${chunkInfo} — ${trust.label}]\n${text}\n`;
      }).join('\n');
    }

    if (webResults && webResults.length > 0) {
      if (context) context += '\n\n';
      context += 'WEB SEARCH RESULTS:\n\n';
      context += webResults.map((r, i) => {
        const trust = getWebTrust(r.url);
        return `[Web Source ${i + 1}: ${trust.badge} ${r.title} — ${trust.label}]\n${r.snippet}\nURL: ${r.url}\n`;
      }).join('\n');
    }

    return context;
  }

  getCitations(localResults, webResults = []) {
    const citations = [];

    if (localResults) {
      localResults.forEach((r, i) => {
        const source = r.metadata?.fileName || 'Unknown';
        const trust = getSourceTrust(source);
        citations.push({
          index: i + 1,
          type: 'local',
          fileName: source,
          fileType: r.metadata?.fileType || 'Unknown',
          articleId: r.id,
          chunkIndex: r.metadata?.chunkIndex || 0,
          confidence: Math.min(Math.round((r.rerankScore || r.score || 0) * 100), 100),
          text: r.text.slice(0, 200) + (r.text.length > 200 ? '...' : ''),
          citation: r.metadata?.citation || source,
          badge: trust.badge,
          trustLabel: trust.label,
          trustLevel: trust.level,
          trust: trust.trust
        });
      });
    }

    if (webResults) {
      webResults.forEach((r, i) => {
        const trust = getWebTrust(r.url);
        citations.push({
          index: (localResults?.length || 0) + i + 1,
          type: 'web',
          title: r.title,
          url: r.url,
          snippet: r.snippet.slice(0, 200),
          source: 'web',
          badge: trust.badge,
          trustLabel: trust.label,
          trustLevel: trust.level,
          trust: trust.trust
        });
      });
    }

    return citations;
  }

  async resolveCitation(citationText) {
    const cleaned = citationText.replace(/[\[\]"]/g, '');
    const results = await vectorStore.keywordSearch(cleaned, 3);
    if (results.length > 0) {
      return results.map(r => ({
        id: r.id,
        text: r.text.slice(0, 300),
        fileName: r.metadata?.fileName || 'Unknown',
        confidence: Math.round((r.score || 0) * 100)
      }));
    }
    return [];
  }

  calculateOverallConfidence(citations) {
    if (!citations || citations.length === 0) return { score: 0, level: 'low', label: 'No sources found' };

    const localCitations = citations.filter(c => c.type === 'local');
    const webCitations = citations.filter(c => c.type === 'web');

    const hasOfficial = localCitations.some(c => c.trustLevel <= 1);
    const hasHighTrust = localCitations.some(c => c.trustLevel <= 3) || webCitations.some(c => c.trustLevel <= 3);
    const avgScore = localCitations.reduce((sum, c) => sum + c.confidence, 0) / Math.max(localCitations.length, 1);

    let score, level, label;

    if (hasOfficial && avgScore >= 60) {
      score = Math.min(Math.round(avgScore + 15), 95);
      level = 'high';
      label = '🟢 Official sources';
    } else if (hasHighTrust && avgScore >= 40) {
      score = Math.min(Math.round(avgScore + 10), 85);
      level = 'medium';
      label = '⚖️ Trusted sources';
    } else if (citations.length > 0) {
      score = Math.min(Math.round(avgScore), 70);
      level = 'medium';
      label = '📚 Available sources';
    } else {
      score = 0;
      level = 'low';
      label = '⚠️ Limited sources';
    }

    return { score, level, label };
  }
}

module.exports = new Retriever();
