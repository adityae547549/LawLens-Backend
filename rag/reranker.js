class Reranker {
  constructor() {
    this.maxQueryTerms = 10;
  }

  _tokenize(text) {
    return text.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(t => t.length > 1);
  }

  _termOverlapScore(queryTokens, docTokens) {
    const docSet = new Set(docTokens);
    let matches = 0;
    for (const q of queryTokens) {
      if (docSet.has(q)) matches++;
    }
    return matches / Math.max(queryTokens.length, 1);
  }

  _buildPosMap(docTokens) {
    const map = new Map();
    for (let i = 0; i < docTokens.length; i++) {
      const t = docTokens[i];
      if (!map.has(t)) map.set(t, i);
    }
    return map;
  }

  _proximityScore(queryTokens, posMap) {
    if (queryTokens.length < 2) return 0.5;
    let totalDist = 0;
    let pairs = 0;
    for (let i = 0; i < queryTokens.length - 1; i++) {
      const posA = posMap.get(queryTokens[i]);
      const posB = posMap.get(queryTokens[i + 1]);
      if (posA !== undefined && posB !== undefined) {
        totalDist += 1 / (Math.abs(posA - posB) + 1);
        pairs++;
      }
    }
    return pairs > 0 ? totalDist / pairs : 0;
  }

  _positionScore(queryTokens, posMap) {
    let score = 0;
    for (let i = 0; i < Math.min(queryTokens.length, 5); i++) {
      const pos = posMap.get(queryTokens[i]);
      if (pos !== undefined) {
        score += 1 / (pos + 1);
      }
    }
    return Math.min(score, 1);
  }

  _exactPhraseScore(query, docText) {
    const lowerQuery = query.toLowerCase();
    const lowerDoc = docText.toLowerCase();
    if (lowerDoc.includes(lowerQuery)) return 1.0;
    const words = lowerQuery.split(/\s+/);
    if (words.length >= 2 && lowerDoc.includes(words.join(' '))) return 0.8;
    return 0;
  }

  _legalBoost(doc) {
    const text = doc.text.toLowerCase();
    let boost = 0;

    if (/\b(held by|ruled by|supreme court|high court|constitutional bench|overruled|distinguished|followed|approved)\b/.test(text)) boost += 0.08;
    if (/\b(article \d+|section \d+|clause \d+|proviso)\b/.test(text)) boost += 0.04;
    if (/\b(act \d{4}|amendment act|constitution)\b/.test(text)) boost += 0.03;
    if (/\b(judgment|decree|order|verdict|holding)\b/.test(text)) boost += 0.03;
    if (/\b(2023|2024|2025|2026|recent|landmark)\b/.test(text)) boost += 0.02;

    return Math.min(boost, 0.15);
  }

  rerank(query, results, weights = { overlap: 0.20, proximity: 0.15, position: 0.10, exact: 0.20, semantic: 0.20, legal: 0.15 }) {
    const queryTokens = this._tokenize(query);
    const maxSemantic = results.reduce((max, r) => Math.max(max, Math.abs(r.score || 0)), 1);

    return results.map(doc => {
      const docTokens = this._tokenize(doc.text);
      const posMap = this._buildPosMap(docTokens);

      const overlap = this._termOverlapScore(queryTokens, docTokens);
      const proximity = this._proximityScore(queryTokens, posMap);
      const position = this._positionScore(queryTokens, posMap);
      const exact = this._exactPhraseScore(query, doc.text);
      const semantic = maxSemantic > 0 ? Math.min((doc.score || 0) / maxSemantic, 1) : 0;
      const legal = this._legalBoost(doc);

      const rerankScore = Math.min(
        overlap * weights.overlap +
        proximity * weights.proximity +
        position * weights.position +
        exact * weights.exact +
        semantic * weights.semantic +
        legal * weights.legal,
        1
      );

      return {
        ...doc,
        rerankScore,
        scoreBreakdown: { overlap, proximity, position, exact, semantic, legal }
      };
    }).sort((a, b) => b.rerankScore - a.rerankScore);
  }
}

module.exports = new Reranker();
