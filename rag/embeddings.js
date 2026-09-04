class Embeddings {
  constructor() {
    this.idfCache = new Map();
    this.docCount = 0;
    this.avgDocLength = 0;
    this.isDirty = true;
  }

  _tokenize(text) {
    if (!text) return [];
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 1);
  }

  _charNgrams(text, n = 3) {
    if (!text) return [];
    const ngrams = [];
    const cleaned = text.toLowerCase().replace(/[^\w]/g, '');
    for (let i = 0; i <= cleaned.length - n; i++) {
      ngrams.push(cleaned.slice(i, i + n));
    }
    return ngrams;
  }

  _buildIDF(documents) {
    if (!this.isDirty && this.docCount === documents.length) return;
    this.idfCache.clear();
    this.docCount = documents.length;
    if (this.docCount === 0) {
      this.avgDocLength = 0;
      this.isDirty = false;
      return;
    }

    const docFreq = {};
    let totalLength = 0;

    for (const doc of documents) {
      const tokens = this._tokenize(doc.text);
      totalLength += tokens.length;
      const uniqueTokens = new Set(tokens);
      for (const token of uniqueTokens) {
        docFreq[token] = (docFreq[token] || 0) + 1;
      }
    }

    this.avgDocLength = totalLength / this.docCount;

    for (const [term, freq] of Object.entries(docFreq)) {
      this.idfCache.set(term, Math.log((this.docCount - freq + 0.5) / (freq + 0.5) + 1));
    }

    this.isDirty = false;
  }

  tfidfVector(text, vocabulary) {
    const tokens = this._tokenize(text);
    const tf = {};
    for (const token of tokens) {
      tf[token] = (tf[token] || 0) + 1;
    }
    return vocabulary.map(term => {
      const termFreq = tf[term] || 0;
      const idf = this.idfCache.get(term) || 0;
      return termFreq * idf;
    });
  }

  bm25Score(query, doc, k1 = 1.5, b = 0.75) {
    const queryTokens = this._tokenize(query);
    const docTokens = this._tokenize(doc.text);
    const docLength = docTokens.length;
    const tf = {};
    for (const token of docTokens) {
      tf[token] = (tf[token] || 0) + 1;
    }

    let score = 0;
    for (const term of queryTokens) {
      const termFreq = tf[term] || 0;
      const idf = this.idfCache.get(term) || 0;
      const numerator = termFreq * (k1 + 1);
      const denominator = termFreq + k1 * (1 - b + b * (docLength / (this.avgDocLength || 1)));
      score += idf * (numerator / denominator);
    }
    return score;
  }

  ngramSimilarity(query, docText, n = 3) {
    const queryNgrams = new Set(this._charNgrams(query, n));
    if (queryNgrams.size === 0) return 0;
    const docNgrams = new Set(this._charNgrams(docText, n));

    let intersection = 0;
    for (const gram of queryNgrams) {
      if (docNgrams.has(gram)) intersection++;
    }

    return intersection / queryNgrams.size;
  }

  cosineSimilarity(vecA, vecB) {
    let dotProduct = 0, normA = 0, normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dotProduct / denom;
  }

  hybridScore(query, doc, bm25Weight = 0.5, tfidfWeight = 0.3, ngramWeight = 0.2) {
    const bm25 = this.bm25Score(query, doc);
    const queryTokens = this._tokenize(query);
    const docTokens = this._tokenize(doc.text);
    const allTerms = [...new Set([...queryTokens, ...docTokens])];

    const qVec = this.tfidfVector(query, allTerms);
    const dVec = this.tfidfVector(doc.text, allTerms);
    const minLen = Math.min(qVec.length, dVec.length);
    const tfidfSim = this.cosineSimilarity(qVec.slice(0, minLen), dVec.slice(0, minLen));
    const ngramSim = this.ngramSimilarity(query, doc.text, 3);

    return (bm25 * bm25Weight) + (tfidfSim * tfidfWeight) + (ngramSim * ngramWeight);
  }
}

module.exports = new Embeddings();
