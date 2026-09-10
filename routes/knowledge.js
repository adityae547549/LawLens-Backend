/**
 * Knowledge System API Routes
 * Endpoints for the Legal Knowledge Operating System
 */

const express = require('express');
const router = express.Router();
const { authenticate, adminOnly } = require('../middleware/auth');

// The knowledge operating system exposes internal data structures (graphs,
// sources, benchmarks, observatory). Lock every endpoint to admins.
router.use(authenticate, adminOnly);

// Lazy-load the LKOS to avoid circular deps
let lkos = null;
async function getLKOS() {
  if (!lkos) {
    const LegalKnowledgeOS = require('../knowledge');
    lkos = new LegalKnowledgeOS({
      dataDir: require('path').join(__dirname, '..', 'data'),
      enableMonitoring: true,
      enableBenchmarking: true,
      enableSelfHealing: true,
    });
    await lkos.initialize();
  }
  return lkos;
}

/**
 * GET /api/knowledge/status
 * Get system status and statistics
 */
router.get('/status', async (req, res) => {
  try {
    const os = await getLKOS();
    const status = await os.getStatus();
    res.json({
      success: true,
      data: status,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to get knowledge system status',
      message: err.message,
    });
  }
});

/**
 * POST /api/knowledge/sync
 * Trigger a full knowledge sync (admin only)
 */
router.post('/sync', authenticate, adminOnly, async (req, res) => {
  try {
    const os = await getLKOS();
    const results = await os.sync({
      force: req.body.force || false,
      sourceIds: req.body.sourceIds || null,
    });
    res.json({
      success: true,
      data: results,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Knowledge sync failed',
      message: err.message,
    });
  }
});

/**
 * GET /api/knowledge/sources
 * Get all registered sources
 */
router.get('/sources', async (req, res) => {
  try {
    const os = await getLKOS();
    const sources = await os.registry.getAllSources();
    const stats = await os.registry.getStats();
    res.json({
      success: true,
      data: {
        sources,
        stats,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to get sources',
      message: err.message,
    });
  }
});

/**
 * POST /api/knowledge/sources
 * Add a new source (admin only)
 */
router.post('/sources', authenticate, adminOnly, async (req, res) => {
  try {
    const os = await getLKOS();
    const source = await os.registry.addSource(req.body);
    res.json({
      success: true,
      data: source,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to add source',
      message: err.message,
    });
  }
});

/**
 * PUT /api/knowledge/sources/:id
 * Update a source (admin only)
 */
router.put('/sources/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const os = await getLKOS();
    const source = await os.registry.updateSource(req.params.id, req.body);
    res.json({
      success: true,
      data: source,
    });
  } catch (err) {
    res.status(404).json({
      success: false,
      error: 'Source not found',
      message: err.message,
    });
  }
});

/**
 * DELETE /api/knowledge/sources/:id
 * Remove a source (admin only)
 */
router.delete('/sources/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const os = await getLKOS();
    await os.registry.removeSource(req.params.id);
    res.json({
      success: true,
      message: 'Source removed',
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to remove source',
      message: err.message,
    });
  }
});

/**
 * GET /api/knowledge/graph
 * Get knowledge graph statistics
 */
router.get('/graph', async (req, res) => {
  try {
    const os = await getLKOS();
    const stats = await os.knowledgeGraph.getStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to get graph stats',
      message: err.message,
    });
  }
});

/**
 * GET /api/knowledge/graph/query
 * Query the knowledge graph
 */
router.get('/graph/query', async (req, res) => {
  try {
    const { q, maxDepth, maxResults } = req.query;
    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter "q" is required',
      });
    }

    const os = await getLKOS();
    const results = await os.knowledgeGraph.query(q, {
      maxDepth: parseInt(maxDepth) || 2,
      maxResults: parseInt(maxResults) || 10,
    });

    res.json({
      success: true,
      data: results,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to query knowledge graph',
      message: err.message,
    });
  }
});

/**
 * GET /api/knowledge/graph/node/:id
 * Get connected nodes for a given node
 */
router.get('/graph/node/:id', async (req, res) => {
  try {
    const os = await getLKOS();
    const connections = os.knowledgeGraph.getConnectedNodes(req.params.id);
    res.json({
      success: true,
      data: connections,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to get node connections',
      message: err.message,
    });
  }
});

/**
 * GET /api/knowledge/synonyms
 * Get synonym engine statistics
 */
router.get('/synonyms', async (req, res) => {
  try {
    const os = await getLKOS();
    const stats = await os.synonymEngine.getStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to get synonym stats',
      message: err.message,
    });
  }
});

/**
 * GET /api/knowledge/synonyms/expand
 * Expand a query with synonyms
 */
router.get('/synonyms/expand', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter "q" is required',
      });
    }

    const os = await getLKOS();
    const expanded = os.synonymEngine.expandQuery(q);
    const synonyms = os.synonymEngine.findSynonyms(q);

    res.json({
      success: true,
      data: {
        original: q,
        expanded,
        synonyms,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to expand query',
      message: err.message,
    });
  }
});

/**
 * GET /api/knowledge/benchmark
 * Get benchmark results
 */
router.get('/benchmark', async (req, res) => {
  try {
    const os = await getLKOS();
    const history = await os.benchmarkSuite.getHistory();
    const latest = os.benchmarkSuite.getLatest();
    res.json({
      success: true,
      data: {
        latest,
        history: history.slice(-20),
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to get benchmark results',
      message: err.message,
    });
  }
});

/**
 * POST /api/knowledge/benchmark/run
 * Run a new benchmark (admin only)
 */
router.post('/benchmark/run', authenticate, adminOnly, async (req, res) => {
  try {
    const os = await getLKOS();
    const results = await os.benchmarkSuite.run();
    res.json({
      success: true,
      data: results,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to run benchmark',
      message: err.message,
    });
  }
});

/**
 * GET /api/knowledge/observatory
 * Get observatory report
 */
router.get('/observatory', async (req, res) => {
  try {
    const { period } = req.query;
    const os = await getLKOS();
    const report = await os.observatory.getReport(period || '7d');
    res.json({
      success: true,
      data: report,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to get observatory report',
      message: err.message,
    });
  }
});

/**
 * POST /api/knowledge/heal
 * Trigger self-healing (admin only)
 */
router.post('/heal', authenticate, adminOnly, async (req, res) => {
  try {
    const os = await getLKOS();
    const results = await os.selfHealer.heal();
    res.json({
      success: true,
      data: results,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Failed to run self-healing',
      message: err.message,
    });
  }
});

module.exports = router;
