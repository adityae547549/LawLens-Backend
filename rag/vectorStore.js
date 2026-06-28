const fs = require('fs');
const path = require('path');
const embeddings = require('./embeddings');
const reranker = require('./reranker');

const VECTOR_DB_PATH = path.resolve(__dirname, '..', process.env.VECTOR_DB_PATH || './vector/index.json');

class VectorStore {
  constructor() {
    this.documents = [];
    this.indexPath = VECTOR_DB_PATH;
    this._ensureDir();
    this.load();
  }

  _ensureDir() {
    const dir = path.dirname(this.indexPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  async addDocuments(docs) {
    if (!docs || docs.length === 0) return [];
    embeddings._buildIDF(docs);
    const entries = docs.map(doc => ({
      id: doc.id,
      text: doc.text,
      metadata: doc.metadata || {}
    }));
    this.documents.push(...entries);
    await this.save();
    return entries;
  }

  async similaritySearch(query, k = 10) {
    if (this.documents.length === 0) return [];
    if (this.documents.length <= 100) {
      embeddings._buildIDF(this.documents);
    }
    const scored = this.documents.map(doc => ({
      ...doc,
      score: embeddings.hybridScore(query, doc)
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, k);
  }

  async keywordSearch(query, k = 10) {
    if (this.documents.length === 0) return [];
    if (this.documents.length <= 100) {
      embeddings._buildIDF(this.documents);
    }
    const scored = this.documents.map(doc => ({
      ...doc,
      score: embeddings.bm25Score(query, doc)
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored.filter(d => d.score > 0).slice(0, k);
  }

  async hybridSearch(query, k = 10) {
    const results = await this.similaritySearch(query, k * 2);
    return reranker.rerank(query, results).slice(0, k);
  }

  async save() {
    fs.writeFileSync(this.indexPath, JSON.stringify({ documents: this.documents }));
  }

  async load() {
    if (!fs.existsSync(this.indexPath)) {
      this.documents = [];
      return;
    }
    try {
      const data = JSON.parse(fs.readFileSync(this.indexPath, 'utf-8'));
      this.documents = data.documents || [];
      if (this.documents.length > 0) {
        embeddings._buildIDF(this.documents);
      }
    } catch {
      this.documents = [];
    }
  }

  async clear() {
    this.documents = [];
    await this.save();
  }

  count() {
    return this.documents.length;
  }

  getDocument(id) {
    return this.documents.find(d => d.id === id) || null;
  }

  getAllDocuments() {
    return [...this.documents];
  }

  getStats() {
    const fileStats = {};
    this.documents.forEach(doc => {
      const fn = doc.metadata?.fileName || 'unknown';
      if (!fileStats[fn]) {
        fileStats[fn] = { fileName: fn, chunks: 0, fileType: doc.metadata?.fileType || 'unknown', processedAt: doc.metadata?.processedAt };
      }
      fileStats[fn].chunks++;
    });
    return {
      totalChunks: this.documents.length,
      totalFiles: Object.keys(fileStats).length,
      files: Object.values(fileStats)
    };
  }

  async searchByMetadata(query, k = 10) {
    if (this.documents.length === 0) return [];
    const results = this.documents.filter(doc => {
      const meta = doc.metadata || {};
      return Object.entries(query).every(([key, value]) => {
        const metaVal = meta[key];
        if (typeof value === 'string' && typeof metaVal === 'string') {
          return metaVal.toLowerCase().includes(value.toLowerCase());
        }
        return metaVal === value;
      });
    });
    return results.slice(0, k);
  }

  async deleteByFileId(fileId) {
    const initialCount = this.documents.length;
    this.documents = this.documents.filter(d => d.metadata?.fileId !== fileId);
    const removed = initialCount - this.documents.length;
    if (removed > 0) await this.save();
    return removed;
  }
}

const vectorStore = new VectorStore();
module.exports = vectorStore;
