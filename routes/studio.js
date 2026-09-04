/**
 * LawLens Studio — API Routes
 * All Studio-specific endpoints under /api/studio
 */

const express = require('express');
const router = express.Router();
const { authenticate, adminOnly, authenticateSSE } = require('../middleware/auth');
const ctrl = require('../controllers/studioController');

// ── SSE Events (before global auth/rate-limit, uses query-param auth) ──
router.get('/events', authenticateSSE, adminOnly, ctrl.getStudioEvents);

// All Studio routes require admin auth
router.use(authenticate, adminOnly);

// Rate limiting for studio routes
const rateLimit = require('express-rate-limit');
const studioLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
  message: { error: 'Too many requests, please try again later.' }
});
router.use(studioLimiter);

// ── System ───────────────────────────────────────────────────
router.get('/system/info', ctrl.getSystemInfo);
router.get('/system/health', ctrl.getHealth);
router.get('/system/storage', ctrl.getStorage);
router.get('/system/process', ctrl.getProcessInfo);

// ── Knowledge CRUD ───────────────────────────────────────────
router.get('/knowledge/items', ctrl.getKnowledgeItems);
router.post('/knowledge/items', ctrl.createKnowledgeItem);
router.put('/knowledge/items/:id', ctrl.updateKnowledgeItem);
router.delete('/knowledge/items/:id', ctrl.deleteKnowledgeItem);

// ── Knowledge Graph ──────────────────────────────────────────
router.get('/graph', ctrl.getGraph);
router.post('/graph/nodes', ctrl.addGraphNode);
router.put('/graph/nodes/:id', ctrl.updateGraphNode);
router.delete('/graph/nodes/:id', ctrl.deleteGraphNode);
router.post('/graph/edges', ctrl.addGraphEdge);
router.delete('/graph/edges/:id', ctrl.deleteGraphEdge);

// ── Search Config ────────────────────────────────────────────
router.get('/search/config', ctrl.getSearchConfig);
router.put('/search/config', ctrl.updateSearchConfig);

// ── AI Config ────────────────────────────────────────────────
router.get('/ai/config', ctrl.getAIConfig);
router.put('/ai/config', ctrl.updateAIConfig);

// ── Theme ────────────────────────────────────────────────────
router.get('/theme', ctrl.getTheme);
router.put('/theme', ctrl.updateTheme);

// ── Audit Log ────────────────────────────────────────────────
router.get('/audit', ctrl.getAuditLogs);
router.get('/audit/stats', ctrl.getAuditStats);
router.post('/audit', ctrl.recordAudit);

// ── Background Jobs ──────────────────────────────────────────
router.get('/jobs', ctrl.getJobs);
router.get('/jobs/stats', ctrl.getJobStats);
router.post('/jobs', ctrl.createJob);
router.get('/jobs/:id', ctrl.getJob);
router.post('/jobs/:id/cancel', ctrl.cancelJob);
router.post('/jobs/:id/retry', ctrl.retryJob);

// ── Page Builder ─────────────────────────────────────────────
router.get('/pages', ctrl.getPages);
router.get('/pages/:id/html', ctrl.getPageHTML);
router.post('/pages', ctrl.savePage);
router.post('/pages/:id/autosave', ctrl.autosavePage);
router.get('/pages/:id/autosave', ctrl.getAutosave);
router.delete('/pages/:id', ctrl.deletePage);
router.get('/pages/:id/revisions', ctrl.getPageRevisions);
router.post('/pages/:id/revisions/:revisionId/restore', ctrl.restorePageRevision);

// ── Knowledge OS — Full Hierarchy ────────────────────────────
router.get('/lkos/acts', ctrl.lkosListActs);
router.get('/lkos/stats', ctrl.lkosGetStats);
router.post('/lkos/rebuild', ctrl.lkosRebuild);
router.get('/lkos/acts/:actId', ctrl.lkosGetAct);
router.post('/lkos/acts', ctrl.lkosCreateAct);
router.put('/lkos/acts/:actId', ctrl.lkosUpdateAct);
router.delete('/lkos/acts/:actId', ctrl.lkosDeleteAct);
router.post('/lkos/acts/:actId/publish', ctrl.lkosPublishAct);
router.post('/lkos/acts/:actId/archive', ctrl.lkosArchiveAct);
router.post('/lkos/acts/:actId/sections', ctrl.lkosAddSection);
router.put('/lkos/acts/:actId/sections/:sectionId', ctrl.lkosUpdateSection);
router.delete('/lkos/acts/:actId/sections/:sectionId', ctrl.lkosDeleteSection);
router.get('/lkos/acts/:actId/versions', ctrl.lkosGetVersions);
router.post('/lkos/acts/:actId/versions/:timestamp/restore', ctrl.lkosRestoreVersion);

// ── Source Tracker — Official Source Monitoring ──────────────
router.get('/sources/tracker', ctrl.sourceTrackerList);
router.get('/sources/tracker/stats', ctrl.sourceTrackerStats);
router.get('/sources/tracker/:id', ctrl.sourceTrackerGet);
router.post('/sources/tracker/:id/check', ctrl.sourceTrackerCheck);
router.post('/sources/tracker/check-all', ctrl.sourceTrackerCheckAll);
router.post('/sources/tracker/:id/approve', ctrl.sourceTrackerApprove);
router.post('/sources/tracker/:id/reject', ctrl.sourceTrackerReject);
router.post('/sources/tracker/:id/toggle', ctrl.sourceTrackerToggle);
router.post('/sources/tracker', ctrl.sourceTrackerAdd);
router.delete('/sources/tracker/:id', ctrl.sourceTrackerRemove);

// Error handling middleware for studio routes
router.use((err, req, res, next) => {
  console.error('[Studio Error]', err.message, err.stack);
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

module.exports = router;
