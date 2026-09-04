const legalGraph = require('../rag/legalGraph');

function testKnowledgeGraph() {
  console.log('==================================================');
  console.log(' Testing LawLens Semantic Legal Knowledge Graph ');
  console.log('==================================================');

  const summary = legalGraph.exportGraphSummary();
  console.log(`Total Nodes: ${summary.totalNodes}`);
  console.log(`Total Edges: ${summary.totalEdges}`);

  // Test 1: Article 21 Connections
  const art21 = legalGraph.getConnectedNodes('Article 21');
  console.log('\n[Test 1] Article 21 Connections:');
  art21.outgoingRelations.forEach(r => console.log(`  -> (${r.relation}) -> ${r.target.id} [${r.meta.note}]`));

  // Test 2: Multi-hop path: Article 21 -> IT Act Section 69A
  const path = legalGraph.traversePath('Article 21', 'IT Act Section 69A');
  console.log('\n[Test 2] Multi-hop path from Article 21 to IT Act Section 69A:');
  path.forEach(p => console.log(`  Step ${p.step}: ${p.from} --(${p.relation})--> ${p.to}`));

  // Test 3: BNS Section 103 Replacement & Evidence Connections
  const bns103 = legalGraph.getConnectedNodes('BNS Section 103');
  console.log('\n[Test 3] BNS Section 103 Procedural & Evidentiary Connections:');
  bns103.outgoingRelations.forEach(r => console.log(`  -> (${r.relation}) -> ${r.target.id} [${r.meta.note}]`));

  console.log('==================================================');
}

testKnowledgeGraph();
