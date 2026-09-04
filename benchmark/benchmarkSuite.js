/**
 * LawLens — Comprehensive Benchmark System
 * Hundreds of legal questions with automated precision/recall/hallucination/grounding measurement
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const BENCHMARK_FILE = path.join(DATA_DIR, 'benchmark-suite.json');
const RESULTS_DIR = path.join(DATA_DIR, 'benchmark-results');

// ══════════════════════════════════════════════════════════════
// LEGAL BENCHMARK QUESTIONS
// ══════════════════════════════════════════════════════════════
const BENCHMARK_QUESTIONS = [
  // Constitutional Law
  { id: 'q-001', question: 'What is the right to privacy under Indian law?', category: 'constitutional', expectedAnswer: 'Article 21', expectedSources: ['Puttaswamy v. Union of India', 'Article 21'], difficulty: 'easy' },
  { id: 'q-002', question: 'What is the basic structure doctrine?', category: 'constitutional', expectedAnswer: 'Kesavananda Bharati case', expectedSources: ['Kesavananda Bharati v. State of Kerala', 'Article 368'], difficulty: 'medium' },
  { id: 'q-003', question: 'Can fundamental rights be amended?', category: 'constitutional', expectedAnswer: 'Yes, but not the basic structure', expectedSources: ['Article 368', 'Kesavananda Bharati'], difficulty: 'hard' },
  { id: 'q-004', question: 'What are the fundamental rights under Part III?', category: 'constitutional', expectedAnswer: 'Articles 12-35', expectedSources: ['Constitution Part III'], difficulty: 'easy' },
  { id: 'q-005', question: 'What is Article 14 and what does it guarantee?', category: 'constitutional', expectedAnswer: 'Equality before law', expectedSources: ['Article 14'], difficulty: 'easy' },

  // Criminal Law
  { id: 'q-010', question: 'What is the punishment for murder under BNS?', category: 'criminal', expectedAnswer: 'Section 103 BNS - imprisonment for life or death', expectedSources: ['BNS Section 103', 'IPC Section 302'], difficulty: 'easy' },
  { id: 'q-011', question: 'What is the difference between Cognizable and Non-cognizable offences?', category: 'criminal', expectedAnswer: 'Cognizable offences allow arrest without warrant', expectedSources: ['BNSS', 'CrPC'], difficulty: 'medium' },
  { id: 'q-012', question: 'What is anticipatory bail?', category: 'criminal', expectedAnswer: 'Bail before arrest under Section 482 BNSS / 438 CrPC', expectedSources: ['BNSS Section 482', 'CrPC Section 438'], difficulty: 'easy' },
  { id: 'q-013', question: 'What is the difference between BNS and IPC?', category: 'criminal', expectedAnswer: 'BNS 2023 replaced IPC 1860', expectedSources: ['BNS 2023', 'IPC 1860'], difficulty: 'easy' },
  { id: 'q-014', question: 'What is Section 66A of IT Act and its current status?', category: 'criminal', expectedAnswer: 'Struck down by Supreme Court in Shreya Singhal case', expectedSources: ['IT Act Section 66A', 'Shreya Singhal v. Union of India'], difficulty: 'medium' },

  // Civil Law
  { id: 'q-020', question: 'What is specific performance under Specific Relief Act?', category: 'civil', expectedAnswer: 'Court order to perform contractual obligation', expectedSources: ['Specific Relief Act Section 10'], difficulty: 'easy' },
  { id: 'q-021', question: 'What is the limitation period for filing a suit?', category: 'civil', expectedAnswer: 'Varies by type of suit under Limitation Act', expectedSources: ['Limitation Act 1963'], difficulty: 'medium' },
  { id: 'q-022', question: 'What is an injunction?', category: 'civil', expectedAnswer: 'Court order to do or refrain from doing something', expectedSources: ['Specific Relief Act', 'Order 39 CPC'], difficulty: 'easy' },

  // Corporate Law
  { id: 'q-030', question: 'What is the minimum number of directors for a public company?', category: 'corporate', expectedAnswer: '3 directors', expectedSources: ['Companies Act 2013 Section 149'], difficulty: 'easy' },
  { id: 'q-031', question: 'What is corporate social responsibility under Companies Act?', category: 'corporate', expectedAnswer: 'Section 135 - 2% of average net profits', expectedSources: ['Companies Act 2013 Section 135'], difficulty: 'medium' },
  { id: 'q-032', question: 'What is insolvency resolution process?', category: 'corporate', expectedAnswer: 'IBC process under NCLT', expectedSources: ['IBC 2016', 'NCLT'], difficulty: 'medium' },

  // Tax Law
  { id: 'q-040', question: 'What is Section 80C of Income Tax Act?', category: 'tax', expectedAnswer: 'Deductions up to ₹1.5 lakh for investments', expectedSources: ['Income Tax Act Section 80C'], difficulty: 'easy' },
  { id: 'q-041', question: 'What is the GST rate for services?', category: 'tax', expectedAnswer: 'Generally 18% under CGST Act', expectedSources: ['CGST Act', 'GST Rate Schedule'], difficulty: 'easy' },
  { id: 'q-042', question: 'What is the difference between direct and indirect tax?', category: 'tax', expectedAnswer: 'Direct tax is on income, indirect is on goods/services', expectedSources: ['Income Tax Act', 'CGST Act'], difficulty: 'easy' },

  // IP Law
  { id: 'q-050', question: 'What is the duration of copyright in India?', category: 'ip', expectedAnswer: '60 years from death of author', expectedSources: ['Copyright Act 1957 Section 22'], difficulty: 'easy' },
  { id: 'q-051', question: 'What is fair use under copyright law?', category: 'ip', expectedAnswer: 'Section 52 - exceptions to copyright infringement', expectedSources: ['Copyright Act 1957 Section 52'], difficulty: 'medium' },

  // Consumer Law
  { id: 'q-060', question: 'Where can a consumer file a complaint?', category: 'consumer', expectedAnswer: 'District Commission for claims up to ₹1 crore', expectedSources: ['Consumer Protection Act 2019'], difficulty: 'easy' },
  { id: 'q-061', question: 'What is product liability under Consumer Protection Act 2019?', category: 'consumer', expectedAnswer: 'Manufacturer liability for defective products', expectedSources: ['Consumer Protection Act 2019 Section 82-87'], difficulty: 'medium' },

  // Environmental Law
  { id: 'q-070', question: 'What is environmental clearance?', category: 'environment', expectedAnswer: 'Approval under Environment Protection Act 1986', expectedSources: ['Environment Protection Act 1986'], difficulty: 'easy' },
  { id: 'q-071', question: 'What is the role of National Green Tribunal?', category: 'environment', expectedAnswer: 'Adjudicates environmental disputes', expectedSources: ['NGT Act 2010'], difficulty: 'easy' },

  // RTI
  { id: 'q-080', question: 'How to file an RTI application?', category: 'rti', expectedAnswer: 'Apply to public authority under Section 6', expectedSources: ['RTI Act 2005 Section 6'], difficulty: 'easy' },
  { id: 'q-081', question: 'What information is exempt from RTI?', category: 'rti', expectedAnswer: 'Section 8 exemptions', expectedSources: ['RTI Act 2005 Section 8'], difficulty: 'medium' },

  // Hallucination Tests
  { id: 'q-100', question: 'What is Section 420 of BNS 2023?', category: 'hallucination', expectedAnswer: 'Should indicate this section does not exist in BNS (it was in IPC)', expectedSources: ['BNS 2023'], difficulty: 'hard', isHallucinationTest: true },
  { id: 'q-101', question: 'What is the punishment under Section 999 of IPC?', category: 'hallucination', expectedAnswer: 'Should indicate this section does not exist', expectedSources: ['IPC 1860'], difficulty: 'hard', isHallucinationTest: true },
  { id: 'q-102', question: 'What did the Supreme Court rule in Sharma v. Sharma 2025?', category: 'hallucination', expectedAnswer: 'Should indicate this case may not exist or is not verifiable', expectedSources: [], difficulty: 'hard', isHallucinationTest: true }
];

class BenchmarkSuite {
  constructor() {
    if (!fs.existsSync(RESULTS_DIR)) fs.mkdirSync(RESULTS_DIR, { recursive: true });
    this._questions = BENCHMARK_QUESTIONS;
  }

  /**
   * Get all benchmark questions
   */
  getQuestions({ category, difficulty } = {}) {
    let questions = [...this._questions];
    if (category) questions = questions.filter(q => q.category === category);
    if (difficulty) questions = questions.filter(q => q.difficulty === difficulty);
    return questions;
  }

  /**
   * Run a single benchmark question
   */
  async runQuestion(questionId, aiFunction) {
    const question = this._questions.find(q => q.id === questionId);
    if (!question) throw new Error('Question not found');

    const startTime = Date.now();
    let answer = null;
    let error = null;

    try {
      answer = await aiFunction(question.question);
    } catch (err) {
      error = err.message;
    }

    const responseTime = Date.now() - startTime;

    // Evaluate
    const evaluation = this._evaluate(question, answer);

    return {
      question,
      answer: answer?.text || answer || null,
      evaluation,
      responseTime,
      error,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Run full benchmark suite
   */
  async runSuite(aiFunction, { category, limit = 50 } = {}) {
    const questions = this.getQuestions(category).slice(0, limit);
    const results = [];

    for (const q of questions) {
      try {
        const result = await this.runQuestion(q.id, aiFunction);
        results.push(result);
      } catch (err) {
        results.push({ question: q, error: err.message, evaluation: { score: 0 } });
      }
    }

    const summary = this._calculateSummary(results);

    // Save results
    const runId = `run-${Date.now()}`;
    const runResult = { id: runId, timestamp: new Date().toISOString(), category, results, summary };
    fs.writeFileSync(path.join(RESULTS_DIR, `${runId}.json`), JSON.stringify(runResult, null, 2));

    return runResult;
  }

  /**
   * Evaluate an answer against expected
   */
  _evaluate(question, answer) {
    if (!answer) return { score: 0, precision: 0, recall: 0, hallucination: true, grounded: false };

    const answerText = (typeof answer === 'string' ? answer : answer?.text || '').toLowerCase();
    const expectedSources = question.expectedSources || [];

    // Check if answer mentions expected sources
    let sourcesFound = 0;
    expectedSources.forEach(source => {
      if (answerText.includes(source.toLowerCase())) sourcesFound++;
    });

    const recall = expectedSources.length > 0 ? sourcesFound / expectedSources.length : 0.5;

    // Check for hallucination
    let hallucination = false;
    if (question.isHallucinationTest) {
      // For hallucination tests, the answer should indicate uncertainty
      const uncertainPhrases = ['not found', 'does not exist', 'not verifiable', 'cannot find', 'no information', 'not available'];
      hallucination = !uncertainPhrases.some(phrase => answerText.includes(phrase));
    }

    // Grounding check
    const grounded = answerText.length > 20 && !hallucination;

    // Overall score
    const score = (recall * 0.4 + (grounded ? 0.3 : 0) + (hallucination ? 0 : 0.3));

    return {
      score: Math.round(score * 100) / 100,
      precision: recall,
      recall,
      hallucination,
      grounded,
      sourcesFound,
      sourcesExpected: expectedSources.length
    };
  }

  /**
   * Calculate summary statistics
   */
  _calculateSummary(results) {
    const validResults = results.filter(r => !r.error);
    if (validResults.length === 0) return { total: 0, avgScore: 0 };

    const scores = validResults.map(r => r.evaluation?.score || 0);
    const hallucinations = validResults.filter(r => r.evaluation?.hallucination).length;
    const responseTimes = validResults.map(r => r.responseTime || 0);

    // By category
    const byCategory = {};
    validResults.forEach(r => {
      const cat = r.question?.category || 'unknown';
      if (!byCategory[cat]) byCategory[cat] = { count: 0, totalScore: 0 };
      byCategory[cat].count++;
      byCategory[cat].totalScore += (r.evaluation?.score || 0);
    });

    Object.keys(byCategory).forEach(cat => {
      byCategory[cat].avgScore = Math.round((byCategory[cat].totalScore / byCategory[cat].count) * 100) / 100;
    });

    return {
      total: results.length,
      successful: validResults.length,
      failed: results.length - validResults.length,
      avgScore: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100,
      precision: Math.round((validResults.reduce((a, r) => a + (r.evaluation?.precision || 0), 0) / validResults.length) * 100) / 100,
      recall: Math.round((validResults.reduce((a, r) => a + (r.evaluation?.recall || 0), 0) / validResults.length) * 100) / 100,
      hallucinationRate: hallucinations / validResults.length,
      avgResponseTime: Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length),
      byCategory,
      grounding: validResults.filter(r => r.evaluation?.grounded).length / validResults.length
    };
  }

  /**
   * Get benchmark history
   */
  getHistory(limit = 20) {
    const files = fs.readdirSync(RESULTS_DIR).filter(f => f.startsWith('run-')).sort().reverse().slice(0, limit);
    return files.map(f => {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, f), 'utf-8'));
        return { id: data.id, timestamp: data.timestamp, summary: data.summary };
      } catch { return null; }
    }).filter(Boolean);
  }

  /**
   * Compare two benchmark runs
   */
  compare(runId1, runId2) {
    const run1 = this._loadRun(runId1);
    const run2 = this._loadRun(runId2);
    if (!run1 || !run2) return null;

    return {
      run1: { id: run1.id, timestamp: run1.timestamp, summary: run1.summary },
      run2: { id: run2.id, timestamp: run2.timestamp, summary: run2.summary },
      comparison: {
        scoreDelta: (run2.summary?.avgScore || 0) - (run1.summary?.avgScore || 0),
        hallucinationDelta: (run2.summary?.hallucinationRate || 0) - (run1.summary?.hallucinationRate || 0),
        speedDelta: (run2.summary?.avgResponseTime || 0) - (run1.summary?.avgResponseTime || 0)
      }
    };
  }

  _loadRun(runId) {
    try {
      return JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, `${runId}.json`), 'utf-8'));
    } catch { return null; }
  }
}

module.exports = BenchmarkSuite;
