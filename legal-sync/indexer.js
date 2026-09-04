const documentProcessor = require('../rag/documentProcessor');
const vectorStore = require('../rag/vectorStore');
const { DATA_DIR, OFFICIAL_SOURCES } = require('./config');

class IndexerService {
  async rebuildFullIndex() {
    const t0 = Date.now();
    await vectorStore.clear();
    const registeredFiles = OFFICIAL_SOURCES.map(s => s.localFile);
    const { chunks, errors } = await documentProcessor.processDirectory(DATA_DIR, registeredFiles);
    if (chunks.length > 0) {
      await vectorStore.addDocuments(chunks);
    }
    const durationMs = Date.now() - t0;
    return {
      totalChunks: vectorStore.count(),
      durationMs,
      errorsCount: errors.length
    };
  }
}

module.exports = new IndexerService();
