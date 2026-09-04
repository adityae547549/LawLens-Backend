/**
 * LawLens Legal Knowledge Operating System (LKOS)
 * Central orchestration module
 */

const SourceRegistry = require('./registry/sourceRegistry');
const ChangeDetector = require('./monitors/changeDetector');
const DocumentParser = require('./parsers/documentParser');
const HierarchyBuilder = require('./parsers/hierarchyBuilder');
const MetadataExtractor = require('./parsers/metadataExtractor');
const CrossReferenceEngine = require('./graph/crossReferenceEngine');
const LegalKnowledgeGraph = require('./graph/legalKnowledgeGraph');
const LegalSynonymEngine = require('./synonyms/legalSynonymEngine');
const ChunkingEngine = require('./embeddings/chunkingEngine');
const BenchmarkSuite = require('./benchmark/benchmarkSuite');
const SelfHealer = require('./healing/selfHealer');
const Observatory = require('./observability/observatory');

class LegalKnowledgeOS {
  constructor(options = {}) {
    this.config = {
      dataDir: options.dataDir || require('path').join(__dirname, '..', 'data'),
      knowledgeDir: options.knowledgeDir || __dirname,
      enableMonitoring: options.enableMonitoring !== false,
      enableBenchmarking: options.enableBenchmarking !== false,
      enableSelfHealing: options.enableSelfHealing !== false,
      logLevel: options.logLevel || 'info',
      ...options,
    };

    // Core modules
    this.registry = new SourceRegistry(this.config);
    this.changeDetector = new ChangeDetector(this.config);
    this.parser = new DocumentParser(this.config);
    this.hierarchyBuilder = new HierarchyBuilder(this.config);
    this.metadataExtractor = new MetadataExtractor(this.config);
    this.crossReferenceEngine = new CrossReferenceEngine(this.config);
    this.knowledgeGraph = new LegalKnowledgeGraph(this.config);
    this.synonymEngine = new LegalSynonymEngine(this.config);
    this.chunkingEngine = new ChunkingEngine(this.config);
    this.benchmarkSuite = new BenchmarkSuite(this.config);
    this.selfHealer = new SelfHealer(this.config);
    this.observatory = new Observatory(this.config);

    this._initialized = false;
    this._syncStatus = new Map();
  }

  /**
   * Initialize the LKOS
   */
  async initialize() {
    if (this._initialized) return this;

    this.observatory.log('info', 'Initializing Legal Knowledge OS...');

    // Initialize all sub-modules
    await this.registry.initialize();
    await this.knowledgeGraph.initialize();
    await this.synonymEngine.initialize();
    await this.chunkingEngine.initialize();
    await this.selfHealer.initialize();
    await this.observatory.initialize();

    if (this.config.enableMonitoring) {
      await this.changeDetector.initialize();
    }

    if (this.config.enableBenchmarking) {
      await this.benchmarkSuite.initialize();
    }

    this._initialized = true;
    this.observatory.log('info', 'Legal Knowledge OS initialized successfully');
    return this;
  }

  /**
   * Run a full sync - discover, download, parse, index, enrich
   */
  async sync(options = {}) {
    const syncId = `sync-${Date.now()}`;
    this.observatory.log('info', `Starting sync: ${syncId}`);

    const results = {
      syncId,
      startedAt: new Date().toISOString(),
      sources: { total: 0, updated: 0, failed: 0, skipped: 0 },
      documents: { total: 0, parsed: 0, failed: 0 },
      graph: { nodes: 0, edges: 0, enriched: 0 },
      embeddings: { total: 0, failed: 0 },
      benchmark: null,
      selfHealing: null,
    };

    try {
      // 1. Source Registry - get all registered sources
      const sources = await this.registry.getAllSources();
      results.sources.total = sources.length;
      this.observatory.log('info', `Found ${sources.length} registered sources`);

      // 2. Change Detection - check what's new/changed
      const changes = await this.changeDetector.detectChanges(sources);
      this.observatory.log('info', `Detected ${changes.length} changes`);

      // 3. Process each changed source
      for (const change of changes) {
        try {
          if (change.status === 'skipped') {
            results.sources.skipped++;
            continue;
          }

          // Parse the document
          const parsed = await this.parser.parse(change.document, change.source);
          results.documents.total++;
          results.documents.parsed++;

          // Build hierarchy
          const hierarchy = await this.hierarchyBuilder.build(parsed);

          // Extract metadata
          const enriched = await this.metadataExtractor.extract(hierarchy, change.source);

          // Cross-reference
          const crossReferenced = await this.crossReferenceEngine.enrich(enriched);

          // Add to knowledge graph
          const graphUpdate = await this.knowledgeGraph.addDocument(crossReferenced);
          results.graph.nodes += graphUpdate.nodes;
          results.graph.edges += graphUpdate.edges;
          results.graph.enriched += graphUpdate.enriched;

          // Chunk for embedding
          const chunks = await this.chunkingEngine.chunk(crossReferenced);

          // Update registry with new checksum
          await this.registry.updateChecksum(change.source.id, change.newChecksum);
          results.sources.updated++;

          // Record in observatory
          this.observatory.recordImport({
            sourceId: change.source.id,
            act: change.source.name,
            sectionsCount: hierarchy.sections?.length || 0,
            chunksCount: chunks.length,
            timestamp: new Date().toISOString(),
          });
        } catch (err) {
          results.documents.failed++;
          results.sources.failed++;
          this.observatory.log('error', `Failed processing ${change.source?.id}: ${err.message}`);
        }
      }

      // 4. Self-healing check
      if (this.config.enableSelfHealing) {
        results.selfHealing = await this.selfHealer.heal();
      }

      // 5. Benchmark
      if (this.config.enableBenchmarking) {
        results.benchmark = await this.benchmarkSuite.run();
      }

      results.completedAt = new Date().toISOString();
      this._syncStatus.set(syncId, results);

      this.observatory.log('info', `Sync completed: ${syncId} - ${results.sources.updated} sources updated`);
      return results;
    } catch (err) {
      this.observatory.log('error', `Sync failed: ${syncId} - ${err.message}`);
      results.error = err.message;
      results.completedAt = new Date().toISOString();
      this._syncStatus.set(syncId, results);
      return results;
    }
  }

  /**
   * Query the knowledge graph
   */
  async query(queryText, options = {}) {
    return this.knowledgeGraph.query(queryText, options);
  }

  /**
   * Get system status
   */
  async getStatus() {
    const graphStats = await this.knowledgeGraph.getStats();
    const registryStats = await this.registry.getStats();
    const synonymStats = await this.synonymEngine.getStats();
    const observatoryReport = await this.observatory.getReport();

    return {
      initialized: this._initialized,
      registry: registryStats,
      graph: graphStats,
      synonyms: synonymStats,
      recentImports: observatoryReport.recentImports.slice(-10),
      recentErrors: observatoryReport.recentErrors.slice(-10),
      syncHistory: observatoryReport.syncHistory.slice(-10),
    };
  }

  /**
   * Get benchmark results
   */
  async getBenchmarkResults() {
    return this.benchmarkSuite.getHistory();
  }

  /**
   * Get observatory report
   */
  async getReport(period = '7d') {
    return this.observatory.getReport(period);
  }
}

module.exports = LegalKnowledgeOS;
