#!/usr/bin/env node

/**
 * LawLens Knowledge System CLI
 *
 * Usage:
 *   node knowledge/cli.js --sync          Run full knowledge sync
 *   node knowledge/cli.js --status        Get system status
 *   node knowledge/cli.js --benchmark     Run benchmark suite
 *   node knowledge/cli.js --heal          Run self-healing
 *   node knowledge/cli.js --graph         Show knowledge graph stats
 *   node knowledge/cli.js --sources       List all sources
 *   node knowledge/cli.js --query "text"  Query the knowledge graph
 *   node knowledge/cli.js --expand "text" Expand query with synonyms
 *   node knowledge/cli.js --report        Get observatory report
 */

const path = require('path');

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '--help' || command === '-h') {
    printHelp();
    process.exit(0);
  }

  const LegalKnowledgeOS = require('./index');
  const dataDir = path.join(__dirname, '..', 'data');

  const os = new LegalKnowledgeOS({
    dataDir,
    enableMonitoring: true,
    enableBenchmarking: true,
    enableSelfHealing: true,
  });

  try {
    await os.initialize();

    switch (command) {
      case '--sync':
      case '-s':
        await runSync(os, args.slice(1));
        break;
      case '--status':
      case '-st':
        await showStatus(os);
        break;
      case '--benchmark':
      case '-b':
        await runBenchmark(os);
        break;
      case '--heal':
      case '-h':
        await runHeal(os);
        break;
      case '--graph':
      case '-g':
        await showGraph(os);
        break;
      case '--sources':
      case '-src':
        await showSources(os);
        break;
      case '--query':
      case '-q':
        await runQuery(os, args.slice(1).join(' '));
        break;
      case '--expand':
      case '-e':
        await runExpand(os, args.slice(1).join(' '));
        break;
      case '--report':
      case '-r':
        await showReport(os);
        break;
      default:
        console.error(`Unknown command: ${command}`);
        printHelp();
        process.exit(1);
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

function printHelp() {
  console.log(`
LawLens Knowledge System CLI

Usage: node knowledge/cli.js <command> [options]

Commands:
  --sync, -s         Run full knowledge sync
  --status, -st      Get system status
  --benchmark, -b    Run benchmark suite
  --heal, -h         Run self-healing
  --graph, -g        Show knowledge graph stats
  --sources, -src    List all registered sources
  --query, -q <text> Query the knowledge graph
  --expand, -e <text> Expand query with synonyms
  --report, -r       Get observatory report
  --help, -h         Show this help message

Examples:
  node knowledge/cli.js --sync
  node knowledge/cli.js --status
  node knowledge/cli.js --query "murder punishment BNS"
  node knowledge/cli.js --expand "IPC 302"
  node knowledge/cli.js --benchmark
  `);
}

async function runSync(os, flags) {
  console.log('Starting knowledge sync...\n');
  const startTime = Date.now();

  const results = await os.sync({
    force: flags.includes('--force'),
  });

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('='.repeat(60));
  console.log('SYNC RESULTS');
  console.log('='.repeat(60));
  console.log(`Sync ID:          ${results.syncId}`);
  console.log(`Duration:         ${duration}s`);
  console.log(`Started:          ${results.startedAt}`);
  console.log(`Completed:        ${results.completedAt}`);
  console.log('');
  console.log('Sources:');
  console.log(`  Total:          ${results.sources.total}`);
  console.log(`  Updated:        ${results.sources.updated}`);
  console.log(`  Failed:         ${results.sources.failed}`);
  console.log(`  Skipped:        ${results.sources.skipped}`);
  console.log('');
  console.log('Documents:');
  console.log(`  Total:          ${results.documents.total}`);
  console.log(`  Parsed:         ${results.documents.parsed}`);
  console.log(`  Failed:         ${results.documents.failed}`);
  console.log('');
  console.log('Knowledge Graph:');
  console.log(`  Nodes Added:    ${results.graph.nodes}`);
  console.log(`  Edges Added:    ${results.graph.edges}`);
  console.log(`  Enriched:       ${results.graph.enriched}`);

  if (results.benchmark) {
    console.log('');
    console.log('Benchmark:');
    console.log(`  Health:         ${results.benchmark.summary?.overallHealth || 'N/A'}`);
    console.log(`  Pass Rate:      ${results.benchmark.summary?.passRate || 'N/A'}%`);
  }

  if (results.selfHealing) {
    console.log('');
    console.log('Self-Healing:');
    console.log(`  Issues Found:   ${results.selfHealing.summary?.issuesFound || 0}`);
    console.log(`  Fixes Applied:  ${results.selfHealing.summary?.fixesApplied || 0}`);
  }

  console.log('='.repeat(60));
}

async function showStatus(os) {
  const status = await os.getStatus();

  console.log('='.repeat(60));
  console.log('LAwLENS KNOWLEDGE OS STATUS');
  console.log('='.repeat(60));
  console.log(`Initialized:     ${status.initialized}`);
  console.log('');
  console.log('Source Registry:');
  console.log(`  Total Sources:  ${status.registry.total}`);
  console.log(`  Active:         ${status.registry.active}`);
  console.log(`  Inactive:       ${status.registry.inactive}`);
  console.log(`  By Type:        ${JSON.stringify(status.registry.byType)}`);
  console.log(`  By Status:      ${JSON.stringify(status.registry.byIntegrityStatus)}`);
  console.log('');
  console.log('Knowledge Graph:');
  console.log(`  Total Nodes:    ${status.graph.totalNodes}`);
  console.log(`  Total Edges:    ${status.graph.totalEdges}`);
  console.log(`  Node Types:     ${JSON.stringify(status.graph.nodeTypes)}`);
  console.log(`  Edge Types:     ${JSON.stringify(status.graph.edgeTypes)}`);
  console.log('');
  console.log('Synonym Engine:');
  console.log(`  Total Groups:   ${status.synonyms.totalGroups}`);
  console.log(`  Total Synonyms: ${status.synonyms.totalSynonyms}`);

  if (status.recentImports.length > 0) {
    console.log('');
    console.log('Recent Imports:');
    for (const imp of status.recentImports.slice(0, 5)) {
      console.log(`  ${imp.timestamp}: ${imp.act} (${imp.sectionsCount} sections)`);
    }
  }

  if (status.recentErrors.length > 0) {
    console.log('');
    console.log('Recent Errors:');
    for (const err of status.recentErrors.slice(0, 5)) {
      console.log(`  ${err.timestamp}: ${err.act} - ${err.error}`);
    }
  }

  console.log('='.repeat(60));
}

async function runBenchmark(os) {
  console.log('Running benchmark suite...\n');
  const startTime = Date.now();

  const results = await os.benchmarkSuite.run();
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('='.repeat(60));
  console.log('BENCHMARK RESULTS');
  console.log('='.repeat(60));
  console.log(`Run ID:           ${results.runId}`);
  console.log(`Duration:         ${duration}s`);
  console.log('');
  console.log('Summary:');
  console.log(`  Total Queries:  ${results.summary.totalQueries}`);
  console.log(`  Valid Queries:  ${results.summary.validQueries}`);
  console.log(`  Passed:         ${results.summary.passedQueries}`);
  console.log(`  Pass Rate:      ${results.summary.passRate}%`);
  console.log(`  Health:         ${results.summary.overallHealth}`);
  console.log('');
  console.log('Average Metrics:');
  console.log(`  Precision:      ${results.summary.avgMetrics.precision}`);
  console.log(`  Recall:         ${results.summary.avgMetrics.recall}`);
  console.log(`  F1 Score:       ${results.summary.avgMetrics.f1}`);
  console.log(`  Citation Acc:   ${results.summary.avgMetrics.citationAccuracy}`);
  console.log(`  Grounding:      ${results.summary.avgMetrics.groundingQuality}`);
  console.log(`  Confidence:     ${results.summary.avgMetrics.confidence}`);
  console.log(`  Latency:        ${results.summary.avgMetrics.latency}ms`);
  console.log(`  Hallucination:  ${results.summary.hallucinationRate}%`);
  console.log('');
  console.log('Per-Query Results:');
  for (const q of results.queries) {
    const status = q.passed ? '✅' : '❌';
    console.log(`  ${status} [${q.difficulty}] ${q.query}`);
    console.log(`     F1: ${q.metrics.f1} | Precision: ${q.metrics.precision} | Recall: ${q.metrics.recall} | Latency: ${q.metrics.latency}ms`);
  }

  console.log('='.repeat(60));
}

async function runHeal(os) {
  console.log('Running self-healing...\n');

  const results = await os.selfHealer.heal();

  console.log('='.repeat(60));
  console.log('SELF-HEALING RESULTS');
  console.log('='.repeat(60));
  console.log(`Heal ID:          ${results.healId}`);
  console.log(`Status:           ${results.summary.status}`);
  console.log(`Duration:         ${results.summary.duration}ms`);
  console.log('');
  console.log('Checks:');
  for (const check of results.checks) {
    const issues = check.issues?.length || 0;
    console.log(`  ${check.name}: ${issues} issues`);
    for (const issue of check.issues || []) {
      console.log(`    - [${issue.severity}] ${issue.type}: ${issue.error || issue.file || ''}`);
    }
  }

  if (results.fixes.length > 0) {
    console.log('');
    console.log('Fixes Applied:');
    for (const fix of results.fixes) {
      console.log(`  ${fix.action}: ${fix.issue} ${fix.file || fix.chunkId || ''}`);
    }
  }

  console.log('='.repeat(60));
}

async function showGraph(os) {
  const stats = await os.knowledgeGraph.getStats();

  console.log('='.repeat(60));
  console.log('KNOWLEDGE GRAPH');
  console.log('='.repeat(60));
  console.log(`Total Nodes:      ${stats.totalNodes}`);
  console.log(`Total Edges:      ${stats.totalEdges}`);
  console.log(`Indexed Keywords: ${stats.indexedKeywords}`);
  console.log('');
  console.log('Node Types:');
  for (const [type, count] of Object.entries(stats.nodeTypes)) {
    console.log(`  ${type}: ${count}`);
  }
  console.log('');
  console.log('Edge Types:');
  for (const [type, count] of Object.entries(stats.edgeTypes)) {
    console.log(`  ${type}: ${count}`);
  }

  console.log('='.repeat(60));
}

async function showSources(os) {
  const sources = await os.registry.getAllSources();
  const stats = await os.registry.getStats();

  console.log('='.repeat(60));
  console.log('SOURCE REGISTRY');
  console.log('='.repeat(60));
  console.log(`Total: ${stats.total} | Active: ${stats.active} | Inactive: ${stats.inactive}`);
  console.log('');
  console.log('By Type:');
  for (const [type, count] of Object.entries(stats.byType)) {
    console.log(`  ${type}: ${count}`);
  }
  console.log('');
  console.log('Sources:');
  for (const source of sources) {
    const status = source.isActive ? '🟢' : '⚪';
    const integrity = source.integrityStatus === 'verified' ? '✅' : source.integrityStatus === 'pending' ? '⏳' : '❌';
    console.log(`  ${status}${integrity} ${source.name}`);
    console.log(`     ID: ${source.id} | Authority: ${source.authority}`);
    console.log(`     Type: ${source.documentType} | Parser: ${source.parser}`);
    if (source.sourceUrl) {
      console.log(`     URL: ${source.sourceUrl.slice(0, 60)}...`);
    }
  }

  console.log('='.repeat(60));
}

async function runQuery(os, queryText) {
  if (!queryText) {
    console.error('Please provide a query: --query "your query here"');
    process.exit(1);
  }

  console.log(`Querying: "${queryText}"\n`);

  const results = await os.knowledgeGraph.query(queryText);

  console.log('='.repeat(60));
  console.log('QUERY RESULTS');
  console.log('='.repeat(60));
  console.log(`Found ${results.length} results\n`);

  for (const r of results.slice(0, 10)) {
    console.log(`[${r.score}] ${r.node.title || r.id}`);
    console.log(`  Type: ${r.node.type} | Act: ${r.node.act || 'N/A'}`);
    if (r.node.keywords) {
      console.log(`  Keywords: ${r.node.keywords.slice(0, 5).join(', ')}`);
    }
    if (r.connections && r.connections.length > 0) {
      console.log(`  Connected to:`);
      for (const c of r.connections.slice(0, 3)) {
        console.log(`    → ${c.node.title || c.node.id} (${c.relationship})`);
      }
    }
    console.log('');
  }

  console.log('='.repeat(60));
}

async function runExpand(os, queryText) {
  if (!queryText) {
    console.error('Please provide a query: --expand "your query here"');
    process.exit(1);
  }

  const expanded = os.synonymEngine.expandQuery(queryText);
  const synonyms = os.synonymEngine.findSynonyms(queryText);

  console.log('='.repeat(60));
  console.log('QUERY EXPANSION');
  console.log('='.repeat(60));
  console.log(`Original:  ${queryText}`);
  console.log(`Expanded:  ${expanded}`);
  console.log(`Synonyms:  ${synonyms.join(', ') || 'none found'}`);
  console.log('='.repeat(60));
}

async function showReport(os) {
  const report = await os.observatory.getReport('7d');

  console.log('='.repeat(60));
  console.log('OBSERVATORY REPORT (Last 7 days)');
  console.log('='.repeat(60));
  console.log(`Generated: ${report.generatedAt}`);
  console.log('');
  console.log('Summary:');
  console.log(`  Total Imports:     ${report.summary.totalImports}`);
  console.log(`  Successful:        ${report.summary.successfulImports}`);
  console.log(`  Failed:            ${report.summary.failedImports}`);
  console.log(`  Total Errors:      ${report.summary.totalErrors}`);
  console.log(`  Syncs:             ${report.summary.totalSyncs}`);
  console.log(`  Parser Errors:     ${report.summary.totalParserErrors}`);

  if (report.recentImports.length > 0) {
    console.log('');
    console.log('Recent Imports:');
    for (const imp of report.recentImports.slice(0, 10)) {
      console.log(`  ${imp.timestamp}: ${imp.act} (${imp.status})`);
    }
  }

  if (report.recentErrors.length > 0) {
    console.log('');
    console.log('Recent Errors:');
    for (const err of report.recentErrors.slice(0, 10)) {
      console.log(`  ${err.timestamp}: ${err.act} - ${err.error}`);
    }
  }

  console.log('='.repeat(60));
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
