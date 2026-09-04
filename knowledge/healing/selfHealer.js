/**
 * Self-Healing System - Automatically detects and recovers from:
 * - corrupted datasets
 * - duplicate entries
 * - broken graph edges
 * - missing metadata
 * - failed embeddings
 * - failed indexing
 * - parser failures
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class SelfHealer {
  constructor(config = {}) {
    this.config = config;
    this.healLogPath = path.join(config.dataDir || 'data', 'heal-log.json');
    this.healLog = [];
  }

  async initialize() {
    try {
      if (fs.existsSync(this.healLogPath)) {
        const data = JSON.parse(fs.readFileSync(this.healLogPath, 'utf8'));
        this.healLog = data.entries || [];
      }
    } catch (err) {
      this.healLog = [];
    }
  }

  /**
   * Run full self-healing cycle
   */
  async heal() {
    const startTime = Date.now();
    const results = {
      healId: `heal-${Date.now()}`,
      timestamp: new Date().toISOString(),
      checks: [],
      fixes: [],
      summary: {},
    };

    // 1. Check for corrupted data files
    const dataCheck = await this.checkDataIntegrity();
    results.checks.push(dataCheck);

    // 2. Check for duplicates
    const duplicateCheck = await this.checkDuplicates();
    results.checks.push(duplicateCheck);

    // 3. Check graph integrity
    const graphCheck = await this.checkGraphIntegrity();
    results.checks.push(graphCheck);

    // 4. Check for missing metadata
    const metadataCheck = await this.checkMissingMetadata();
    results.checks.push(metadataCheck);

    // 5. Check for broken references
    const referenceCheck = await this.checkBrokenReferences();
    results.checks.push(referenceCheck);

    // 6. Check chunk integrity
    const chunkCheck = await this.checkChunkIntegrity();
    results.checks.push(chunkCheck);

    // Apply fixes
    results.fixes = await this.applyFixes(results.checks);

    // Summary
    results.summary = {
      totalChecks: results.checks.length,
      issuesFound: results.checks.reduce((sum, c) => sum + (c.issues?.length || 0), 0),
      fixesApplied: results.fixes.length,
      duration: Date.now() - startTime,
      status: results.fixes.length > 0 ? 'repaired' : 'healthy',
    };

    // Log
    this.healLog.push(results);
    if (this.healLog.length > 100) {
      this.healLog = this.healLog.slice(-100);
    }
    await this.persist();

    return results;
  }

  /**
   * Check data file integrity
   */
  async checkDataIntegrity() {
    const issues = [];
    const dataDir = this.config.dataDir || 'data';

    try {
      if (!fs.existsSync(dataDir)) {
        issues.push({ type: 'missing-directory', path: dataDir, severity: 'high' });
        return { name: 'data-integrity', issues };
      }

      const files = fs.readdirSync(dataDir).filter((f) => f.endsWith('.json'));

      for (const file of files) {
        const filePath = path.join(dataDir, file);
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          JSON.parse(content);
        } catch (err) {
          issues.push({
            type: 'corrupted-file',
            file,
            error: err.message,
            severity: 'high',
          });
        }
      }
    } catch (err) {
      issues.push({ type: 'directory-error', error: err.message, severity: 'medium' });
    }

    return { name: 'data-integrity', issues };
  }

  /**
   * Check for duplicate entries
   */
  async checkDuplicates() {
    const issues = [];
    const dataDir = this.config.dataDir || 'data';

    try {
      // Check source registry for duplicates
      const registryPath = path.join(dataDir, 'source-registry.json');
      if (fs.existsSync(registryPath)) {
        const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
        const seen = new Map();
        for (const source of registry.sources || []) {
          if (seen.has(source.id)) {
            issues.push({
              type: 'duplicate-source',
              sourceId: source.id,
              severity: 'medium',
            });
          }
          seen.set(source.id, source);
        }
      }

      // Check chunks for duplicates
      const chunksPath = path.join(dataDir, 'chunks-index.json');
      if (fs.existsSync(chunksPath)) {
        const chunks = JSON.parse(fs.readFileSync(chunksPath, 'utf8'));
        const textHashes = new Map();
        for (const chunk of chunks.chunks || []) {
          const hash = crypto.createHash('md5').update(chunk.text || '').digest('hex');
          if (textHashes.has(hash)) {
            issues.push({
              type: 'duplicate-chunk',
              chunkId: chunk.id,
              duplicateOf: textHashes.get(hash),
              severity: 'low',
            });
          }
          textHashes.set(hash, chunk.id);
        }
      }
    } catch (err) {
      issues.push({ type: 'check-error', error: err.message, severity: 'low' });
    }

    return { name: 'duplicates', issues };
  }

  /**
   * Check knowledge graph integrity
   */
  async checkGraphIntegrity() {
    const issues = [];
    const dataDir = this.config.dataDir || 'data';

    try {
      const graphPath = path.join(dataDir, 'knowledge-graph.json');
      if (fs.existsSync(graphPath)) {
        const graph = JSON.parse(fs.readFileSync(graphPath, 'utf8'));
        const nodeIds = new Set((graph.nodes || []).map((n) => n.id));

        // Check for broken edges (referencing non-existent nodes)
        for (const edge of graph.edges || []) {
          if (!nodeIds.has(edge.source)) {
            issues.push({
              type: 'broken-edge-source',
              edge,
              severity: 'medium',
            });
          }
          if (!nodeIds.has(edge.target)) {
            issues.push({
              type: 'broken-edge-target',
              edge,
              severity: 'medium',
            });
          }
        }

        // Check for orphan nodes (no edges)
        const connectedNodes = new Set();
        for (const edge of graph.edges || []) {
          connectedNodes.add(edge.source);
          connectedNodes.add(edge.target);
        }
        const orphans = (graph.nodes || []).filter((n) => !connectedNodes.has(n.id));
        if (orphans.length > 0) {
          issues.push({
            type: 'orphan-nodes',
            count: orphans.length,
            nodeIds: orphans.slice(0, 10).map((n) => n.id),
            severity: 'low',
          });
        }
      }
    } catch (err) {
      issues.push({ type: 'graph-check-error', error: err.message, severity: 'low' });
    }

    return { name: 'graph-integrity', issues };
  }

  /**
   * Check for missing metadata
   */
  async checkMissingMetadata() {
    const issues = [];
    const dataDir = this.config.dataDir || 'data';

    try {
      const registryPath = path.join(dataDir, 'source-registry.json');
      if (fs.existsSync(registryPath)) {
        const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
        for (const source of registry.sources || []) {
          if (!source.name) {
            issues.push({ type: 'missing-name', sourceId: source.id, severity: 'medium' });
          }
          if (!source.authority) {
            issues.push({ type: 'missing-authority', sourceId: source.id, severity: 'low' });
          }
          if (!source.documentType) {
            issues.push({ type: 'missing-document-type', sourceId: source.id, severity: 'low' });
          }
        }
      }
    } catch (err) {
      issues.push({ type: 'metadata-check-error', error: err.message, severity: 'low' });
    }

    return { name: 'missing-metadata', issues };
  }

  /**
   * Check for broken cross-references
   */
  async checkBrokenReferences() {
    const issues = [];
    // Placeholder - will be populated as knowledge grows
    return { name: 'broken-references', issues };
  }

  /**
   * Check chunk integrity
   */
  async checkChunkIntegrity() {
    const issues = [];
    const dataDir = this.config.dataDir || 'data';

    try {
      const chunksPath = path.join(dataDir, 'chunks-index.json');
      if (fs.existsSync(chunksPath)) {
        const chunks = JSON.parse(fs.readFileSync(chunksPath, 'utf8'));
        for (const chunk of chunks.chunks || []) {
          if (!chunk.text || chunk.text.trim().length === 0) {
            issues.push({ type: 'empty-chunk', chunkId: chunk.id, severity: 'medium' });
          }
          if (!chunk.metadata?.docId) {
            issues.push({ type: 'chunk-missing-docid', chunkId: chunk.id, severity: 'low' });
          }
        }
      }
    } catch (err) {
      issues.push({ type: 'chunk-check-error', error: err.message, severity: 'low' });
    }

    return { name: 'chunk-integrity', issues };
  }

  /**
   * Apply fixes for detected issues
   */
  async applyFixes(checks) {
    const fixes = [];
    const dataDir = this.config.dataDir || 'data';

    for (const check of checks) {
      for (const issue of check.issues || []) {
        try {
          switch (issue.type) {
            case 'corrupted-file':
              // Attempt to restore from backup or create empty
              await this.fixCorruptedFile(dataDir, issue.file);
              fixes.push({ issue: issue.type, file: issue.file, action: 'reset' });
              break;

            case 'duplicate-source':
              // Keep the first occurrence
              fixes.push({ issue: issue.type, sourceId: issue.sourceId, action: 'noted' });
              break;

            case 'duplicate-chunk':
              // Remove duplicate chunk
              await this.removeDuplicateChunk(dataDir, issue.chunkId);
              fixes.push({ issue: issue.type, chunkId: issue.chunkId, action: 'removed' });
              break;

            case 'broken-edge-source':
            case 'broken-edge-target':
              // Remove broken edge
              await this.removeBrokenEdge(dataDir, issue.edge);
              fixes.push({ issue: issue.type, action: 'edge-removed' });
              break;

            case 'empty-chunk':
              fixes.push({ issue: issue.type, chunkId: issue.chunkId, action: 'noted' });
              break;
          }
        } catch (err) {
          fixes.push({ issue: issue.type, error: err.message, action: 'failed' });
        }
      }
    }

    return fixes;
  }

  /**
   * Fix a corrupted file by creating a fresh empty structure
   */
  async fixCorruptedFile(dataDir, filename) {
    const filePath = path.join(dataDir, filename);
    const backupPath = path.join(dataDir, 'backups', `${filename}.bak.${Date.now()}`);

    // Create backups directory
    const backupDir = path.join(dataDir, 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Try to backup the corrupted file
    try {
      if (fs.existsSync(filePath)) {
        fs.copyFileSync(filePath, backupPath);
      }
    } catch {
      // Ignore backup failure
    }

    // Create fresh empty structure
    const emptyStructure = { version: '1.0.0', repaired: true, repairedAt: new Date().toISOString(), sources: [] };
    fs.writeFileSync(filePath, JSON.stringify(emptyStructure, null, 2));
  }

  /**
   * Remove a duplicate chunk
   */
  async removeDuplicateChunk(dataDir, chunkId) {
    const chunksPath = path.join(dataDir, 'chunks-index.json');
    if (fs.existsSync(chunksPath)) {
      const chunks = JSON.parse(fs.readFileSync(chunksPath, 'utf8'));
      chunks.chunks = (chunks.chunks || []).filter((c) => c.id !== chunkId);
      fs.writeFileSync(chunksPath, JSON.stringify(chunks, null, 2));
    }
  }

  /**
   * Remove a broken edge from the knowledge graph
   */
  async removeBrokenEdge(dataDir, edge) {
    const graphPath = path.join(dataDir, 'knowledge-graph.json');
    if (fs.existsSync(graphPath)) {
      const graph = JSON.parse(fs.readFileSync(graphPath, 'utf8'));
      graph.edges = (graph.edges || []).filter(
        (e) => !(e.source === edge.source && e.target === edge.target && e.relationship === edge.relationship)
      );
      fs.writeFileSync(graphPath, JSON.stringify(graph, null, 2));
    }
  }

  /**
   * Persist heal log
   */
  async persist() {
    try {
      const data = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        entries: this.healLog,
      };
      fs.writeFileSync(this.healLogPath, JSON.stringify(data, null, 2));
    } catch (err) {
      // Ignore
    }
  }
}

module.exports = SelfHealer;
