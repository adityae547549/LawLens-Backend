class Embeddings {
  constructor() {
    this.idfCache = new Map();
    this.docCount = 0;
    this.avgDocLength = 0;
  }

  _tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 1);
  }

  _buildIDF(documents) {
    this.idfCache.clear();
    this.docCount = documents.length;
    const docFreq = {};
    const totalLength = { value: 0 };

    for (const doc of documents) {
      const tokens = new Set(this._tokenize(doc.text));
      totalLength.value += this._tokenize(doc.text).length;
      for (const token of tokens) {
        docFreq[token] = (docFreq[token] || 0) + 1;
      }
    }

    this.avgDocLength = totalLength.value / this.docCount;

    for (const [term, freq] of Object.entries(docFreq)) {
      this.idfCache.set(term, Math.log((this.docCount - freq + 0.5) / (freq + 0.5) + 1));
    }
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
      const denominator = termFreq + k1 * (1 - b + b * (docLength / this.avgDocLength));
      score += idf * (numerator / denominator);
    }
    return score;
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

  hybridScore(query, doc, bm25Weight = 0.6, tfidfWeight = 0.4) {
    const bm25 = this.bm25Score(query, doc);

    const queryTokens = this._tokenize(query);
    const docTokens = this._tokenize(doc.text);
    const allTerms = [...new Set([...queryTokens, ...docTokens])];

    const qVec = this.tfidfVector(query, allTerms);
    const dVec = this.tfidfVector(doc.text, allTerms);
    const minLen = Math.min(qVec.length, dVec.length);
    const tfidfSim = this.cosineSimilarity(qVec.slice(0, minLen), dVec.slice(0, minLen));

    return bm25 * bm25Weight + tfidfSim * tfidfWeight;
  }
}

module.exports = new Embeddings();
