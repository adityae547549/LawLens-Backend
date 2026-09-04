const retriever = require('../rag/retriever');
const generator = require('../rag/generator');

const BENCHMARK_QUESTIONS = [
  "What is Article 21?",
  "What is anticipatory bail?",
  "What is an FIR?",
  "What are Fundamental Rights?",
  "What is Section 302 BNS?",
  "What is the Right to Information Act?",
  "What powers do police have during arrest?",
  "Difference between BNS and IPC",
  "What is Article 19?",
  "Consumer rights under Consumer Protection Act"
];

async function runLegalBenchmark() {
  console.log('====================================================');
  console.log(' LawLens Legal Knowledge & RAG Benchmark Evaluation ');
  console.log('====================================================');
  console.log('');

  const resultsSummary = [];

  for (let i = 0; i < BENCHMARK_QUESTIONS.length; i++) {
    const question = BENCHMARK_QUESTIONS[i];
    const startTime = Date.now();

    const { localResults, webResults } = await retriever.retrieve(question, { mode: 'hybrid', k: 5 });
    const latencyMs = Date.now() - startTime;

    const context = retriever.formatContext(localResults, webResults);
    const citations = retriever.getCitations(localResults, webResults);
    const confidenceResult = retriever.calculateOverallConfidence(citations);

    const topDoc = localResults[0]?.metadata?.fileName || 'N/A';
    const topTextSnippet = (localResults[0]?.text || '').slice(0, 100).replace(/\n/g, ' ');

    console.log(`[Q${i + 1}] "${question}"`);
    console.log(`     Latency     : ${latencyMs} ms`);
    console.log(`     Local Chunks: ${localResults.length}`);
    console.log(`     Confidence  : ${confidenceResult.score}% (${confidenceResult.label})`);
    console.log(`     Top Source  : ${topDoc}`);
    console.log(`     Snippet     : "${topTextSnippet}..."`);
    console.log('');

    resultsSummary.push({
      question,
      latencyMs,
      chunksCount: localResults.length,
      confidence: confidenceResult.score,
      topSource: topDoc
    });
  }

  const avgLatency = Math.round(resultsSummary.reduce((s, r) => s + r.latencyMs, 0) / resultsSummary.length);
  const avgConfidence = Math.round(resultsSummary.reduce((s, r) => s + r.confidence, 0) / resultsSummary.length);
  const avgChunks = (resultsSummary.reduce((s, r) => s + r.chunksCount, 0) / resultsSummary.length).toFixed(1);

  console.log('====================================================');
  console.log(' BENCHMARK SUMMARY ');
  console.log('====================================================');
  console.log(` Total Questions Evaluated : ${BENCHMARK_QUESTIONS.length}`);
  console.log(` Average Retrieval Latency: ${avgLatency} ms`);
  console.log(` Average Confidence Score : ${avgConfidence}%`);
  console.log(` Average Chunks Retrieved  : ${avgChunks} per query`);
  console.log('====================================================');
}

runLegalBenchmark();
