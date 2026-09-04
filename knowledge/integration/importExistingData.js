#!/usr/bin/env node

/**
 * Integration Script: Import existing legal-sync data into the LKOS
 * Processes all existing JSON data files and builds the knowledge graph
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const LEGAL_SYNC_DIR = path.join(__dirname, '..', '..', 'legal-sync');

async function importExistingData() {
  console.log('====================================================');
  console.log(' LawLens LKOS - Import Existing Legal Data');
  console.log('====================================================\n');

  const LegalKnowledgeOS = require('../index');
  const os = new LegalKnowledgeOS({
    dataDir: DATA_DIR,
    enableMonitoring: false,
    enableBenchmarking: false,
    enableSelfHealing: false,
  });

  await os.initialize();
  console.log('✓ LKOS initialized\n');

  // Load the existing legal-sync registry
  const registryPath = path.join(LEGAL_SYNC_DIR, 'registry.json');
  let existingRegistry = {};
  if (fs.existsSync(registryPath)) {
    existingRegistry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    console.log(`✓ Loaded existing registry with ${Object.keys(existingRegistry).length} sources\n`);
  }

  // Process each data file (skip system files)
  const systemFiles = ['source-registry.json', 'knowledge-graph.json', 'chunks-index.json',
    'observatory-report.json', 'change-log.json', 'synonym-index.json', 'heal-log.json',
    'benchmark-history.json', 'system.log'];
  const dataFiles = fs.readdirSync(DATA_DIR).filter((f) =>
    f.endsWith('.json') && !systemFiles.includes(f)
  );
  console.log(`Found ${dataFiles.length} data files\n`);

  let totalNodes = 0;
  let totalEdges = 0;
  let totalChunks = 0;
  let processedFiles = 0;
  let failedFiles = 0;

  for (const file of dataFiles) {
    const filePath = path.join(DATA_DIR, file);
    const fileId = path.basename(file, '.json');

    console.log(`Processing: ${file}`);

    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      // Get existing registry info if available
      const existingInfo = Object.values(existingRegistry).find(
        (r) => r.localFile === file
      );

      // Create a source entry
      const source = {
        id: existingInfo?.id || fileId,
        name: existingInfo?.title || fileId.replace(/_/g, ' ').replace(/-/g, ' '),
        authority: existingInfo?.source || 'Unknown',
        documentType: getDocumentType(file),
        parser: 'indiacode',
        sourceUrl: existingInfo?.officialUrl || null,
        updateFrequency: 'monthly',
        effectiveDate: existingInfo?.year ? `${existingInfo.year}-01-01` : null,
        tags: [existingInfo?.category || 'legal'],
        isActive: true,
      };

      // Register the source
      await os.registry.addSource(source);

      // Parse the document
      const parsed = await os.parser.parse(data, source);

      // Build hierarchy
      const hierarchy = await os.hierarchyBuilder.build(parsed);

      // Extract metadata
      const enriched = await os.metadataExtractor.extract(hierarchy, source);

      // Cross-reference
      const crossReferenced = await os.crossReferenceEngine.enrich(enriched);

      // Add to knowledge graph
      const graphUpdate = await os.knowledgeGraph.addDocument(crossReferenced);
      totalNodes += graphUpdate.nodes;
      totalEdges += graphUpdate.edges;

      // Chunk for embedding
      const chunks = await os.chunkingEngine.chunk(crossReferenced);
      totalChunks += chunks.length;

      // Record import
      os.observatory.recordImport({
        sourceId: source.id,
        act: source.name,
        sectionsCount: hierarchy.hierarchyStats?.sections || 0,
        chunksCount: chunks.length,
        timestamp: new Date().toISOString(),
      });

      console.log(`  ✓ ${graphUpdate.nodes} nodes, ${graphUpdate.edges} edges, ${chunks.length} chunks`);
      processedFiles++;
    } catch (err) {
      console.log(`  ✗ Error: ${err.message}`);
      os.observatory.recordFailedImport({
        sourceId: fileId,
        act: fileId,
        error: err.message,
      });
      failedFiles++;
    }

    console.log('');
  }

  // Save the knowledge graph
  await os.knowledgeGraph.save();
  await os.chunkingEngine.save();
  await os.observatory.persist();

  // Print summary
  console.log('====================================================');
  console.log(' IMPORT COMPLETE');
  console.log('====================================================');
  console.log(`Files Processed:  ${processedFiles}`);
  console.log(`Files Failed:     ${failedFiles}`);
  console.log(`Total Nodes:      ${totalNodes}`);
  console.log(`Total Edges:      ${totalEdges}`);
  console.log(`Total Chunks:     ${totalChunks}`);
  console.log('');

  // Print graph stats
  const graphStats = await os.knowledgeGraph.getStats();
  console.log('Knowledge Graph:');
  console.log(`  Nodes: ${graphStats.totalNodes}`);
  console.log(`  Edges: ${graphStats.totalEdges}`);
  console.log(`  Node Types: ${JSON.stringify(graphStats.nodeTypes)}`);
  console.log('');

  // Print synonym stats
  const synonymStats = await os.synonymEngine.getStats();
  console.log('Synonym Engine:');
  console.log(`  Groups: ${synonymStats.totalGroups}`);
  console.log(`  Synonyms: ${synonymStats.totalSynonyms}`);
  console.log('====================================================\n');
}

function getDocumentType(filename) {
  const lower = filename.toLowerCase();
  if (lower.includes('case') || lower.includes('judgment')) return 'judgment';
  if (lower.includes('maxim')) return 'legal_principle';
  if (lower.includes('amendment')) return 'amendment';
  if (lower.includes('constitution')) return 'constitution';
  return 'act';
}

importExistingData().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
