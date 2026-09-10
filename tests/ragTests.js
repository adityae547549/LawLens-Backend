const assert = require('assert');
const test = require('node:test');
const path = require('path');
const os = require('os');

process.env.VECTOR_DB_PATH = path.join(os.tmpdir(), 'lawlens-test-' + Date.now().toString(36), 'index.json');

const embeddings = require('../rag/embeddings');
const reranker = require('../rag/reranker');
const retriever = require('../rag/retriever');
const vectorStore = require('../rag/vectorStore');

test('Embeddings cosine similarity', async (t) => {
  await t.test('identical vectors score 1', () => {
    const a = [0.5, 0.5, 0.5, 0.5];
    assert.strictEqual(embeddings.cosineSimilarity(a, a), 1);
  });

  await t.test('orthogonal vectors score 0', () => {
    const a = [1, 0];
    const b = [0, 1];
    assert.strictEqual(embeddings.cosineSimilarity(a, b), 0);
  });

  await t.test('zero vector does not throw', () => {
    const a = [0, 0];
    const b = [1, 1];
    const score = embeddings.cosineSimilarity(a, b);
    assert.ok(Number.isFinite(score));
  });
});

test('Reranker orders by legal relevance', async (t) => {
  await t.test('relevant document ranks first', () => {
    const docs = [
      { id: '1', text: 'General discussion on rights', score: 0.2 },
      { id: '2', text: 'Supreme Court held Article 21 guarantees right to life', score: 0.8 }
    ];
    const reranked = reranker.rerank('Article 21 Supreme Court', docs);
    assert.strictEqual(reranked[0].id, '2');
    assert.strictEqual(reranked.length, 2);
  });
});

test('Retriever citation helpers', async (t) => {
  const localResults = [
    { id: 'c1', text: 'Article 21 text...', metadata: { fileName: 'constitution.json', chunkIndex: 3 } },
    { id: 'c2', text: 'IPC section 302 text...', metadata: { fileName: 'ipc.json', chunkIndex: 0 } }
  ];

  await t.test('getCitations emits [Source N] labels in order', () => {
    const citations = retriever.getCitations(localResults, []);
    assert.ok(Array.isArray(citations));
    assert.strictEqual(citations.length, 2);
    assert.strictEqual(citations[0].articleId, 'c1');
    assert.strictEqual(citations[0].index, 1);
    assert.strictEqual(citations[0].type, 'local');
  });

  await t.test('formatContext inlines chunk text', () => {
    const context = retriever.formatContext(localResults, [], []);
    assert.match(context, /Article 21 text/);
    assert.match(context, /IPC section 302 text/);
  });

  await t.test('confidence is in bounds', () => {
    const result = retriever.calculateOverallConfidence(localResults.map((r, i) => ({ id: r.id, label: `Source ${i + 1}` })));
    assert.ok(result.score >= 0 && result.score <= 100);
  });
});

test('Vector store hybrid search', async (t) => {
  await t.test('returns best matching chunk first', async () => {
    await vectorStore.addDocuments([
      { id: 'v1', text: 'The right to life under the Constitution', metadata: { fileName: 'const.json' } },
      { id: 'v2', text: 'About banana farming and crops', metadata: { fileName: 'agri.json' } }
    ]);
    const results = await vectorStore.hybridSearch('right to life Constitution', 2);
    assert.ok(results.length >= 1);
    assert.strictEqual(results[0].id, 'v1');
  });
});