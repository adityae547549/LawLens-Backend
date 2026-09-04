/**
 * LawLens — Professional Search Engine
 * BM25 + Dense Embeddings + Knowledge Graph Traversal + Metadata Filtering
 * + Citation Ranking + Recency Ranking + Authority Ranking + Legal Synonym Expansion
 * + Hybrid Reranking
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

// ══════════════════════════════════════════════════════════════
// BM25 SCORING
// ══════════════════════════════════════════════════════════════
class BM25 {
  constructor(k1 = 1.5, b = 0.75) {
    this.k1 = k1;
    this.b = b;
    this.docFreqs = {};
    this.avgDocLength = 0;
    this.docs = [];
  }

  /**
   * Build index from documents
   */
  buildIndex(documents) {
    this.docs = documents;
    this.docFreqs = {};
    let totalLength = 0;

    documents.forEach(doc => {
      const terms = this._tokenize(doc.text || '');
      totalLength += terms.length;

      const uniqueTerms = [...new Set(terms)];
      uniqueTerms.forEach(term => {
        this.docFreqs[term] = (this.docFreqs[term] || 0) + 1;
      });
    });

    this.avgDocLength = documents.length > 0 ? totalLength / documents.length : 0;
  }

  /**
   * Score documents against query
   */
  score(query) {
    const queryTerms = this._tokenize(query);
    const N = this.docs.length;

    return this.docs.map((doc, idx) => {
      const terms = this._tokenize(doc.text || '');
      const termFreqs = {};
      terms.forEach(t => { termFreqs[t] = (termFreqs[t] || 0) + 1; });

      let score = 0;
      queryTerms.forEach(term => {
        if (!termFreqs[term]) return;

        const tf = termFreqs[term];
        const df = this.docFreqs[term] || 0;
        const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1);
        const tfNorm = (tf * (this.k1 + 1)) / (tf + this.k1 * (1 - this.b + this.b * terms.length / this.avgDocLength));

        score += idf * tfNorm;
      });

      return { doc, score, index: idx };
    }).filter(r => r.score > 0).sort((a, b) => b.score - a.score);
  }

  _tokenize(text) {
    return (text || '').toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 2 && !this._isStopWord(t));
  }

  _isStopWord(term) {
    const stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but', 'in', 'with', 'to', 'for', 'of', 'not', 'no', 'can', 'had', 'has', 'have', 'was', 'were', 'are', 'be', 'been', 'being', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'shall', 'this', 'that', 'these', 'those', 'it', 'its']);
    return stopWords.has(term);
  }
}

// ══════════════════════════════════════════════════════════════
// LEGAL SYNONYM EXPANSION
// ══════════════════════════════════════════════════════════════
const LEGAL_SYNONYMS = {
  'murder': ['homicide', 'culpable homicide', '302', 'section 103'],
  'theft': ['larceny', 'stealing', 'section 378', 'section 303'],
  'bail': ['anticipatory bail', 'regular bail', 'interim bail', 'section 438', 'section 480'],
  'fir': ['first information report', 'complaint', 'section 154', 'section 173'],
  'injunction': ['stay order', 'temporary injunction', 'permanent injunction', 'order 39'],
  'appeal': ['revision', 'review', 'section 374', 'section 397'],
  'fundamental rights': ['part iii', 'article 12-35', 'mulla', 'basic structure'],
  'dpsp': ['directive principles', 'part iv', 'article 36-51'],
  'amendment': ['constitutional amendment', 'article 368', 'basic structure'],
  'privacy': ['right to privacy', 'article 21', 'puttaswamy', 'data protection'],
  'equality': ['article 14', 'equal protection', 'non-discrimination', 'affirmative action'],
  'freedom': ['article 19', 'speech', 'expression', 'assembly', 'association'],
  'gst': ['goods and services tax', 'cgst', 'sgst', 'igst', 'section 9'],
  'income tax': ['it act', 'section 2', 'section 4', 'section 80c', 'assessment year'],
  'consumer': ['consumer protection', 'section 2', 'district commission', 'state commission', 'national commission'],
  'company': ['companies act', 'section 2', 'board of directors', 'annual general meeting', 'section 134'],
  'trademark': ['trade mark', 'section 2', 'section 9', 'section 11', 'registration'],
  'copyright': ['copyright act', 'section 14', 'section 52', 'fair use', 'infringement'],
  'patent': ['patent act', 'section 2', 'section 3', 'section 25', 'grant'],
  'environment': ['environment act', 'section 2', 'section 5', 'pollution', 'clearance'],
  'labour': ['labour law', 'section 2', 'workers', 'employer', 'industrial dispute'],
  'rti': ['right to information', 'section 6', 'section 8', 'section 19', 'public authority']
};

class LegalSynonymExpander {
  expand(query) {
    const terms = query.toLowerCase().split(/\s+/);
    const expanded = new Set(terms);

    terms.forEach(term => {
      Object.entries(LEGAL_SYNONYMS).forEach(([key, synonyms]) => {
        if (term === key || synonyms.includes(term)) {
          expanded.add(key);
          synonyms.forEach(s => expanded.add(s));
        }
      });
    });

    return [...expanded].join(' ');
  }

  findSynonyms(term) {
    const t = term.toLowerCase();
    const results = [];
    Object.entries(LEGAL_SYNONYMS).forEach(([key, synonyms]) => {
      if (key === t || synonyms.some(s => s.includes(t) || t.includes(s))) {
        results.push({ term: key, synonyms });
      }
    });
    return results;
  }
}

// ══════════════════════════════════════════════════════════════
// HYBRID RERANKING
// ══════════════════════════════════════════════════════════════
class HybridReranker {
  constructor() {
    this.weights = {
      bm25: 0.3,
      vector: 0.25,
      graph: 0.15,
      citation: 0.1,
      recency: 0.1,
      authority: 0.1
    };
  }

  setWeights(weights) {
    Object.assign(this.weights, weights);
  }

  /**
   * Rerank results from multiple sources
   */
  rerank(query, results, { graphConnections = {}, now = Date.now() } = {}) {
    return results.map(result => {
      let score = 0;

      // BM25 score (normalized)
      score += (result.bm25Score || 0) * this.weights.bm25;

      // Vector similarity score
      score += (result.vectorScore || 0) * this.weights.vector;

      // Graph connectivity score
      const graphScore = graphConnections[result.id] ? Math.min(1, graphConnections[result.id] / 10) : 0;
      score += graphScore * this.weights.graph;

      // Citation score (how often cited)
      const citationScore = Math.min(1, (result.citationCount || 0) / 100);
      score += citationScore * this.weights.citation;

      // Recency score
      const age = result.lastModified ? (now - new Date(result.lastModified).getTime()) / (365 * 24 * 60 * 60 * 1000) : 10;
      const recencyScore = Math.max(0, 1 - age / 10);
      score += recencyScore * this.weights.recency;

      // Authority score
      const authorityMap = { official: 1, verified: 0.8, trusted: 0.6, unverified: 0.3 };
      const authScore = authorityMap[result.authority] || 0.5;
      score += authScore * this.weights.authority;

      return { ...result, finalScore: score };
    }).sort((a, b) => b.finalScore - a.finalScore);
  }
}

// ══════════════════════════════════════════════════════════════
// PROFESSIONAL SEARCH ENGINE
// ══════════════════════════════════════════════════════════════
class ProfessionalSearch {
  constructor() {
    this.bm25 = new BM25();
    this.synonymExpander = new LegalSynonymExpander();
    this.reranker = new HybridReranker();
    this._indexed = false;
  }

  /**
   * Build search index from documents
   */
  buildIndex(documents) {
    this.bm25.buildIndex(documents);
    this._documents = documents;
    this._indexed = true;
  }

  /**
   * Professional search with all features
   */
  async search(query, options = {}) {
    const {
      maxResults = 10,
      filters = {},
      weights = {},
      expandSynonyms = true
    } = options;

    // Expand query with legal synonyms
    const expandedQuery = expandSynonyms ? this.synonymExpander.expand(query) : query;

    // BM25 search
    let bm25Results = this._indexed ? this.bm25.score(expandedQuery) : [];

    // Apply metadata filters
    if (filters.type) bm25Results = bm25Results.filter(r => r.doc.type === filters.type);
    if (filters.act) bm25Results = bm25Results.filter(r => (r.doc.act || '').toLowerCase().includes(filters.act.toLowerCase()));
    if (filters.year) bm25Results = bm25Results.filter(r => r.doc.year == filters.year);
    if (filters.authority) bm25Results = bm25Results.filter(r => r.doc.authority === filters.authority);

    // Convert to results format
    let results = bm25Results.map(r => ({
      ...r.doc,
      bm25Score: r.score / (bm25Results[0]?.score || 1),
      vectorScore: 0, // Would come from vector store
      score: r.score
    }));

    // Apply weights and rerank
    if (Object.keys(weights).length > 0) {
      this.reranker.setWeights(weights);
    }
    results = this.reranker.rerank(query, results);

    return {
      query,
      expandedQuery: expandSynonyms ? expandedQuery : null,
      results: results.slice(0, maxResults),
      total: results.length,
      filters: { ...filters },
      weights: { ...this.reranker.weights }
    };
  }

  /**
   * Get search suggestions
   */
  getSuggestions(query, limit = 5) {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();

    const suggestions = [];
    Object.entries(LEGAL_SYNONYMS).forEach(([key, synonyms]) => {
      if (key.includes(q) || synonyms.some(s => s.includes(q))) {
        suggestions.push({ text: key, type: 'synonym' });
      }
    });

    if (this._indexed) {
      const titleMatches = this._documents
        .filter(d => (d.title || '').toLowerCase().includes(q))
        .slice(0, limit)
        .map(d => ({ text: d.title, type: 'document' }));
      suggestions.push(...titleMatches);
    }

    return suggestions.slice(0, limit);
  }

  /**
   * Get stats
   */
  getStats() {
    return {
      indexed: this._indexed,
      documentCount: this._documents?.length || 0,
      synonymCount: Object.keys(LEGAL_SYNONYMS).length,
      weights: this.reranker.weights
    };
  }
}

module.exports = { ProfessionalSearch, LegalSynonymExpander, HybridReranker, BM25 };
