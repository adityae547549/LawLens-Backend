const assert = require('assert');
const test = require('node:test');

// Test 1: Validation Schemas
test('Phase 1 Zod Validation Schemas', async (t) => {
  const { firebaseIdTokenSchema, profileUpdateSchema, chatSchema, searchSchema } = require('../validators');

  await t.test('firebaseIdTokenSchema requires an idToken', () => {
    const valid = firebaseIdTokenSchema.safeParse({ idToken: 'eyJhbGciOiJSUzI1NiJ9.payload.signature' });
    assert.strictEqual(valid.success, true);

    const invalid = firebaseIdTokenSchema.safeParse({});
    assert.strictEqual(invalid.success, false);
  });

  await t.test('profileUpdateSchema trims name and bounds theme', () => {
    const valid = profileUpdateSchema.safeParse({ name: '  Test User  ', preferences: { theme: 'dark' } });
    assert.strictEqual(valid.success, true);
    assert.strictEqual(valid.data.name, 'Test User');

    const invalid = profileUpdateSchema.safeParse({ preferences: { theme: 'neon' } });
    assert.strictEqual(invalid.success, false);
  });

  await t.test('chatSchema applies default modes', () => {
    const res = chatSchema.safeParse({ message: 'What is Article 21?' });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data.mode, 'legal');
    assert.strictEqual(res.data.level, 'general');
  });
});

// Test 2: RAG Pipeline Components
test('Phase 6 & 7 RAG Pipeline Components', async (t) => {
  const legalSynonyms = require('../rag/legalSynonyms');
  const embeddings = require('../rag/embeddings');
  const reranker = require('../rag/reranker');

  await t.test('legalSynonyms expands legal queries', () => {
    const expanded = legalSynonyms.expandQuery('bail for arrest');
    assert.match(expanded, /anticipatory bail/);
    assert.match(expanded, /detention/);
  });

  await t.test('embeddings calculates hybrid score with character n-grams', () => {
    const score = embeddings.hybridScore('fundamental rights', { text: 'Article 19 protects fundamental rights' });
    assert.ok(score > 0);
  });

  await t.test('reranker sorts results by legal relevance', () => {
    const docs = [
      { text: 'General discussion on rights', score: 0.2 },
      { text: 'Supreme Court held Article 21 guarantees right to life', score: 0.8 }
    ];
    const reranked = reranker.rerank('Article 21 Supreme Court', docs);
    assert.strictEqual(reranked[0].text.includes('Supreme Court'), true);
  });
});

// Test 3: AI Provider Factory & Base Provider
test('Phase 3 AI Provider Factory', async (t) => {
  const ProviderFactory = require('../rag/aiProvider/ProviderFactory');
  const BaseProvider = require('../rag/aiProvider/BaseProvider');

  await t.test('ProviderFactory instantiates GroqProvider', () => {
    const provider = ProviderFactory.createProvider('groq');
    assert.ok(provider instanceof BaseProvider);
  });
});

// Test 4: Repository Layer
test('Phase 10 Repository Layer', async (t) => {
  const { userRepository, conversationRepository, documentRepository } = require('../repositories');

  await t.test('Repositories expose standard CRUD interface', () => {
    assert.strictEqual(typeof userRepository.findAll, 'function');
    assert.strictEqual(typeof conversationRepository.findAll, 'function');
    assert.strictEqual(typeof documentRepository.findAll, 'function');
  });
});

// Test 5: Knowledge Graph Engine
test('Phase 12 Knowledge Graph Engine', async (t) => {
  const legalGraph = require('../rag/legalGraph');

  await t.test('Traverses multi-hop connections from Article 21 to IT Act Section 69A', () => {
    const path = legalGraph.traversePath('Article 21', 'IT Act Section 69A');
    assert.strictEqual(path.length, 2);
    assert.strictEqual(path[0].from, 'Article 21');
    assert.strictEqual(path[0].to, 'Puttaswamy (2017)');
    assert.strictEqual(path[1].to, 'IT Act Section 69A');
  });
});
