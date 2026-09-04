/**
 * Observatory - Detailed reporting for the Legal Knowledge Platform
 * Tracks: imported documents, skipped documents, failed imports,
 * graph statistics, chunk counts, embedding counts, benchmark history,
 * update history, parser errors, integrity reports
 */

const fs = require('fs');
const path = require('path');

class Observatory {
  constructor(config = {}) {
    this.config = config;
    this.reportPath = path.join(config.dataDir || 'data', 'observatory-report.json');
    this.logPath = path.join(config.dataDir || 'data', 'system.log');
    this.report = {
      imports: [],
      errors: [],
      syncHistory: [],
      parserErrors: [],
      systemEvents: [],
    };
  }

  async initialize() {
    try {
      if (fs.existsSync(this.reportPath)) {
        const data = JSON.parse(fs.readFileSync(this.reportPath, 'utf8'));
        this.report = { ...this.report, ...data };
      }
    } catch (err) {
      // Initialize with defaults
    }
  }

  /**
   * Log a message
   */
  log(level, message, details = {}) {
    const entry = {
      level,
      message,
      details,
      timestamp: new Date().toISOString(),
    };

    this.report.systemEvents.push(entry);

    // Keep only last 1000 events
    if (this.report.systemEvents.length > 1000) {
      this.report.systemEvents = this.report.systemEvents.slice(-1000);
    }

    // Also write to log file
    try {
      const logLine = `[${entry.timestamp}] [${level.toUpperCase()}] ${message}\n`;
      fs.appendFileSync(this.logPath, logLine);
    } catch {
      // Ignore
    }
  }

  /**
   * Record an import event
   */
  recordImport(data) {
    const entry = {
      id: `import-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sourceId: data.sourceId,
      act: data.act,
      sectionsCount: data.sectionsCount || 0,
      chunksCount: data.chunksCount || 0,
      timestamp: data.timestamp || new Date().toISOString(),
      status: 'success',
    };

    this.report.imports.push(entry);

    // Keep only last 500 imports
    if (this.report.imports.length > 500) {
      this.report.imports = this.report.imports.slice(-500);
    }

    this.log('info', `Imported: ${data.act} (${data.sectionsCount} sections, ${data.chunksCount} chunks)`);
  }

  /**
   * Record a failed import
   */
  recordFailedImport(data) {
    const entry = {
      id: `fail-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sourceId: data.sourceId,
      act: data.act,
      error: data.error,
      timestamp: data.timestamp || new Date().toISOString(),
      status: 'failed',
    };

    this.report.imports.push(entry);
    this.report.errors.push(entry);

    if (this.report.imports.length > 500) {
      this.report.imports = this.report.imports.slice(-500);
    }
    if (this.report.errors.length > 200) {
      this.report.errors = this.report.errors.slice(-200);
    }

    this.log('error', `Failed import: ${data.act} - ${data.error}`);
  }

  /**
   * Record a parser error
   */
  recordParserError(data) {
    const entry = {
      sourceId: data.sourceId,
      parser: data.parser,
      error: data.error,
      input: data.input?.slice(0, 200),
      timestamp: new Date().toISOString(),
    };

    this.report.parserErrors.push(entry);

    if (this.report.parserErrors.length > 200) {
      this.report.parserErrors = this.report.parserErrors.slice(-200);
    }
  }

  /**
   * Record a sync event
   */
  recordSync(data) {
    const entry = {
      syncId: data.syncId || `sync-${Date.now()}`,
      sourcesProcessed: data.sourcesProcessed || 0,
      sourcesUpdated: data.sourcesUpdated || 0,
      sourcesFailed: data.sourcesFailed || 0,
      documentsParsed: data.documentsParsed || 0,
      chunksCreated: data.chunksCreated || 0,
      graphNodes: data.graphNodes || 0,
      graphEdges: data.graphEdges || 0,
      benchmark: data.benchmark || null,
      selfHealing: data.selfHealing || null,
      timestamp: new Date().toISOString(),
    };

    this.report.syncHistory.push(entry);

    if (this.report.syncHistory.length > 100) {
      this.report.syncHistory = this.report.syncHistory.slice(-100);
    }

    this.log('info', `Sync completed: ${entry.sourcesUpdated} sources updated, ${entry.documentsParsed} documents parsed`);
  }

  /**
   * Get a comprehensive report
   */
  async getReport(period = '7d') {
    const now = Date.now();
    const periodMs = this.parsePeriod(period);
    const cutoff = new Date(now - periodMs);

    const recentImports = this.report.imports.filter(
      (i) => new Date(i.timestamp) >= cutoff
    );
    const recentErrors = this.report.errors.filter(
      (e) => new Date(e.timestamp) >= cutoff
    );
    const recentSyncs = this.report.syncHistory.filter(
      (s) => new Date(s.timestamp) >= cutoff
    );
    const recentParserErrors = this.report.parserErrors.filter(
      (e) => new Date(e.timestamp) >= cutoff
    );

    return {
      period,
      generatedAt: new Date().toISOString(),
      summary: {
        totalImports: recentImports.length,
        successfulImports: recentImports.filter((i) => i.status === 'success').length,
        failedImports: recentImports.filter((i) => i.status === 'failed').length,
        totalErrors: recentErrors.length,
        totalSyncs: recentSyncs.length,
        totalParserErrors: recentParserErrors.length,
      },
      recentImports: recentImports.slice(-20),
      recentErrors: recentErrors.slice(-20),
      syncHistory: recentSyncs,
      recentParserErrors: recentParserErrors.slice(-10),
      systemEvents: this.report.systemEvents.slice(-50),
    };
  }

  /**
   * Parse period string to milliseconds
   */
  parsePeriod(period) {
    const match = period.match(/^(\d+)([dhm])$/);
    if (!match) return 7 * 24 * 60 * 60 * 1000; // Default 7 days

    const value = parseInt(match[1]);
    const unit = match[2];
    switch (unit) {
      case 'd': return value * 24 * 60 * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'm': return value * 60 * 1000;
      default: return 7 * 24 * 60 * 60 * 1000;
    }
  }

  /**
   * Persist report
   */
  async persist() {
    try {
      const data = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        imports: this.report.imports.slice(-500),
        errors: this.report.errors.slice(-200),
        syncHistory: this.report.syncHistory.slice(-100),
        parserErrors: this.report.parserErrors.slice(-200),
        systemEvents: this.report.systemEvents.slice(-1000),
      };
      fs.writeFileSync(this.reportPath, JSON.stringify(data, null, 2));
    } catch (err) {
      // Ignore
    }
  }
}

module.exports = Observatory;
