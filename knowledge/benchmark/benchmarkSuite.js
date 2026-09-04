/**
 * Benchmark Suite - Automated quality gates for legal knowledge platform
 * Measures: retrieval precision, retrieval recall, citation accuracy,
 * grounding quality, hallucination rate, latency, confidence
 */

const fs = require('fs');
const path = require('path');

class BenchmarkSuite {
  constructor(config = {}) {
    this.config = config;
    this.historyPath = path.join(config.dataDir || 'data', 'benchmark-history.json');
    this.history = [];
    this.testQueries = this.getDefaultTestQueries();
  }

  async initialize() {
    try {
      if (fs.existsSync(this.historyPath)) {
        const data = JSON.parse(fs.readFileSync(this.historyPath, 'utf8'));
        this.history = data.runs || [];
      }
    } catch (err) {
      this.history = [];
    }
  }

  /**
   * Default test queries with expected results for benchmarking
   */
  getDefaultTestQueries() {
    return [
      {
        query: 'What is the punishment for murder under BNS?',
        expectedActs: ['Bharatiya Nyaya Sanhita, 2023'],
        expectedSections: ['103'],
        expectedKeywords: ['murder', 'death penalty', 'life imprisonment'],
        category: 'criminal-law',
        difficulty: 'easy',
      },
      {
        query: 'How to file an FIR under BNSS?',
        expectedActs: ['Bharatiya Nagarik Suraksha Sanhita, 2023'],
        expectedSections: ['173'],
        expectedKeywords: ['fir', 'first information', 'cognizable'],
        category: 'procedural-law',
        difficulty: 'easy',
      },
      {
        query: 'What is anticipatory bail and how to get it?',
        expectedActs: ['Bharatiya Nagarik Suraksha Sanhita, 2023'],
        expectedSections: ['482'],
        expectedKeywords: ['anticipatory bail', 'arrest', 'pre-arrest'],
        category: 'criminal-law',
        difficulty: 'medium',
      },
      {
        query: 'What are the fundamental rights under the Indian Constitution?',
        expectedActs: ['Constitution of India'],
        expectedSections: ['12-35'],
        expectedKeywords: ['fundamental rights', 'equality', 'freedom', 'life'],
        category: 'constitutional-law',
        difficulty: 'easy',
      },
      {
        query: 'Is electronic evidence admissible in court?',
        expectedActs: ['Bharatiya Sakshya Adhiniyam, 2023'],
        expectedSections: ['61'],
        expectedKeywords: ['electronic evidence', 'admissibility', 'digital'],
        category: 'evidence-law',
        difficulty: 'medium',
      },
      {
        query: 'Right to privacy under Article 21',
        expectedActs: ['Constitution of India'],
        expectedSections: ['21'],
        expectedKeywords: ['privacy', 'life', 'liberty', 'puttaswamy'],
        category: 'constitutional-law',
        difficulty: 'medium',
      },
      {
        query: 'What is the limitation period for filing a civil suit?',
        expectedActs: ['Limitation Act, 1963'],
        expectedSections: [],
        expectedKeywords: ['limitation', 'time-barred', 'prescription'],
        category: 'procedural-law',
        difficulty: 'medium',
      },
      {
        query: 'How to file a consumer complaint?',
        expectedActs: ['Consumer Protection Act, 2019'],
        expectedSections: ['28'],
        expectedKeywords: ['consumer', 'complaint', 'district commission'],
        category: 'consumer-law',
        difficulty: 'easy',
      },
      {
        query: 'What is the difference between IPC 302 and BNS 103?',
        expectedActs: ['Indian Penal Code, 1860', 'Bharatiya Nyaya Sanhita, 2023'],
        expectedSections: ['302', '103'],
        expectedKeywords: ['murder', 'replacement', 'ipc', 'bns'],
        category: 'criminal-law',
        difficulty: 'hard',
      },
      {
        query: 'What are the remedies for violation of fundamental rights?',
        expectedActs: ['Constitution of India'],
        expectedSections: ['32', '226'],
        expectedKeywords: ['writ', 'habeas corpus', 'mandamus', 'certiorari'],
        category: 'constitutional-law',
        difficulty: 'medium',
      },
    ];
  }

  /**
   * Run the full benchmark suite
   */
  async run() {
    const startTime = Date.now();
    const results = {
      runId: `bench-${Date.now()}`,
      timestamp: new Date().toISOString(),
      queries: [],
      summary: {},
    };

    for (const testQuery of this.testQueries) {
      const queryResult = await this.runSingleBenchmark(testQuery);
      results.queries.push(queryResult);
    }

    // Calculate summary
    results.summary = this.calculateSummary(results.queries);
    results.duration = Date.now() - startTime;

    // Save to history
    this.history.push(results);
    if (this.history.length > 50) {
      this.history = this.history.slice(-50);
    }
    await this.persist();

    return results;
  }

  /**
   * Run a single benchmark query
   */
  async runSingleBenchmark(testQuery) {
    const startTime = Date.now();

    try {
      // Get retrieval results if retriever is available
      let retrievalResults = [];
      try {
        const retriever = require('../../rag/retriever');
        const { localResults } = await retriever.retrieve(testQuery.query, { k: 5, useWebSearch: false });
        retrievalResults = localResults || [];
      } catch {
        // Retriever not available - test metadata only
      }

      const latency = Date.now() - startTime;

      // Calculate metrics
      const precision = this.calculatePrecision(retrievalResults, testQuery);
      const recall = this.calculateRecall(retrievalResults, testQuery);
      const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
      const citationAccuracy = this.calculateCitationAccuracy(retrievalResults, testQuery);
      const groundingQuality = this.calculateGroundingQuality(retrievalResults);
      const confidence = this.calculateConfidence(retrievalResults);

      return {
        query: testQuery.query,
        category: testQuery.category,
        difficulty: testQuery.difficulty,
        metrics: {
          precision: Math.round(precision * 100) / 100,
          recall: Math.round(recall * 100) / 100,
          f1: Math.round(f1 * 100) / 100,
          citationAccuracy: Math.round(citationAccuracy * 100) / 100,
          groundingQuality: Math.round(groundingQuality * 100) / 100,
          confidence: Math.round(confidence * 100) / 100,
          latency,
        },
        resultsCount: retrievalResults.length,
        passed: f1 >= 0.3 && citationAccuracy >= 0.5,
      };
    } catch (err) {
      return {
        query: testQuery.query,
        category: testQuery.category,
        difficulty: testQuery.difficulty,
        error: err.message,
        metrics: { precision: 0, recall: 0, f1: 0, citationAccuracy: 0, groundingQuality: 0, confidence: 0, latency: 0 },
        passed: false,
      };
    }
  }

  /**
   * Calculate precision - how many results are relevant
   */
  calculatePrecision(results, testQuery) {
    if (results.length === 0) return 0;
    let relevant = 0;
    for (const r of results) {
      const text = (r.text || '').toLowerCase();
      const metadata = r.metadata || {};
      if (this.isRelevant(text, metadata, testQuery)) {
        relevant++;
      }
    }
    return relevant / results.length;
  }

  /**
   * Calculate recall - how many expected items were found
   */
  calculateRecall(results, testQuery) {
    if (!testQuery.expectedSections.length && !testQuery.expectedKeywords.length) return 1;
    let found = 0;
    let total = 0;

    // Check section recall
    for (const section of testQuery.expectedSections) {
      total++;
      const foundSection = results.some((r) => {
        const text = (r.text || '').toLowerCase();
        const metadata = r.metadata || {};
        return text.includes(`section ${section}`) ||
               metadata.section === section ||
               metadata.sectionNumber === section;
      });
      if (foundSection) found++;
    }

    // Check keyword recall
    for (const keyword of testQuery.expectedKeywords) {
      total++;
      const foundKeyword = results.some((r) => {
        const text = (r.text || '').toLowerCase();
        return text.includes(keyword.toLowerCase());
      });
      if (foundKeyword) found++;
    }

    return total > 0 ? found / total : 1;
  }

  /**
   * Calculate citation accuracy
   */
  calculateCitationAccuracy(results, testQuery) {
    if (results.length === 0) return 0;
    let accurate = 0;
    for (const r of results) {
      const text = (r.text || '').toLowerCase();
      const metadata = r.metadata || {};
      // Check if the result references the correct act
      const hasCorrectAct = testQuery.expectedActs.some((act) => {
        return text.includes(act.toLowerCase()) ||
               metadata.fileName?.toLowerCase().includes(act.toLowerCase().slice(0, 10));
      });
      if (hasCorrectAct) accurate++;
    }
    return accurate / results.length;
  }

  /**
   * Calculate grounding quality (non-hallucination)
   */
  calculateGroundingQuality(results) {
    if (results.length === 0) return 0;
    let grounded = 0;
    for (const r of results) {
      const text = r.text || '';
      // Check for grounding indicators
      const hasSectionRef = /section\s+\d+/i.test(text);
      const hasActRef = /act\s*,?\s*\d{4}/i.test(text);
      const hasLegalTerminology = /(?:shall|may|provided that|notwithstanding|herein|thereof)/i.test(text);
      if (hasSectionRef || hasActRef || hasLegalTerminology) grounded++;
    }
    return grounded / results.length;
  }

  /**
   * Calculate confidence score
   */
  calculateConfidence(results) {
    if (results.length === 0) return 0;
    const scores = results.map((r) => r.rerankScore || r.score || 0);
    const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    return Math.min(avgScore * 2, 1); // Normalize to 0-1
  }

  /**
   * Check if a result is relevant to the query
   */
  isRelevant(text, metadata, testQuery) {
    // Check if any expected keyword is present
    const hasKeyword = testQuery.expectedKeywords.some((kw) =>
      text.includes(kw.toLowerCase())
    );
    // Check if any expected act is referenced
    const hasAct = testQuery.expectedActs.some((act) =>
      text.includes(act.toLowerCase().slice(0, 10))
    );
    // Check if any expected section is present
    const hasSection = testQuery.expectedSections.some((sec) =>
      text.includes(`section ${sec}`) || metadata.section === sec
    );
    return hasKeyword || hasAct || hasSection;
  }

  /**
   * Calculate summary metrics
   */
  calculateSummary(queryResults) {
    const validResults = queryResults.filter((q) => !q.error);
    if (validResults.length === 0) return { overall: 'no-data' };

    const avgMetrics = {
      precision: 0,
      recall: 0,
      f1: 0,
      citationAccuracy: 0,
      groundingQuality: 0,
      confidence: 0,
      latency: 0,
    };

    for (const q of validResults) {
      for (const key of Object.keys(avgMetrics)) {
        avgMetrics[key] += q.metrics[key] || 0;
      }
    }

    for (const key of Object.keys(avgMetrics)) {
      avgMetrics[key] = Math.round((avgMetrics[key] / validResults.length) * 100) / 100;
    }

    const passedCount = validResults.filter((q) => q.passed).length;

    return {
      totalQueries: queryResults.length,
      validQueries: validResults.length,
      passedQueries: passedCount,
      passRate: Math.round((passedCount / validResults.length) * 100),
      avgMetrics,
      hallucinationRate: Math.round((1 - avgMetrics.groundingQuality) * 100),
      overallHealth: avgMetrics.f1 >= 0.3 ? 'healthy' : avgMetrics.f1 >= 0.1 ? 'warning' : 'critical',
    };
  }

  /**
   * Get benchmark history
   */
  async getHistory() {
    return this.history;
  }

  /**
   * Get latest benchmark
   */
  getLatest() {
    return this.history.length > 0 ? this.history[this.history.length - 1] : null;
  }

  /**
   * Persist history
   */
  async persist() {
    try {
      const data = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        runs: this.history,
      };
      fs.writeFileSync(this.historyPath, JSON.stringify(data, null, 2));
    } catch (err) {
      // Ignore
    }
  }
}

module.exports = BenchmarkSuite;
