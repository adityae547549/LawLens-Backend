/**
 * LawLens — Audit Log System
 * Records every admin action with before/after state
 */

const fs = require('fs');
const path = require('path');

const AUDIT_DIR = path.join(__dirname, '..', 'data', 'audit');
const MAX_LOGS = 10000;

class AuditLog {
  constructor() {
    if (!fs.existsSync(AUDIT_DIR)) {
      fs.mkdirSync(AUDIT_DIR, { recursive: true });
    }
  }

  _getLogPath() {
    const date = new Date().toISOString().split('T')[0];
    return path.join(AUDIT_DIR, `audit-${date}.json`);
  }

  _readLogs() {
    const logPath = this._getLogPath();
    if (!fs.existsSync(logPath)) return [];
    try {
      return JSON.parse(fs.readFileSync(logPath, 'utf-8'));
    } catch {
      return [];
    }
  }

  _writeLogs(logs) {
    const logPath = this._getLogPath();
    const trimmed = logs.slice(-MAX_LOGS);
    fs.writeFileSync(logPath, JSON.stringify(trimmed, null, 2));
  }

  /**
   * Record an audit event
   * @param {Object} params
   * @param {string} params.action - Action performed (create, update, delete, publish, etc.)
   * @param {string} params.entity - Entity type (knowledge, graph, user, settings, etc.)
   * @param {string} params.entityId - ID of the entity
   * @param {Object} params.before - State before change
   * @param {Object} params.after - State after change
   * @param {string} params.userId - User who performed the action
   * @param {string} params.userName - Name of the user
   * @param {Object} params.metadata - Additional context
   */
  record({ action, entity, entityId, before, after, userId, userName, metadata = {} }) {
    const logs = this._readLogs();
    const entry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      action,
      entity,
      entityId: entityId || null,
      before: before || null,
      after: after || null,
      userId: userId || 'system',
      userName: userName || 'System',
      metadata,
      ip: metadata.ip || null
    };

    logs.push(entry);
    this._writeLogs(logs);
    return entry;
  }

  /**
   * Query audit logs
   */
  query({ entity, action, userId, startDate, endDate, limit = 50, offset = 0 } = {}) {
    let allLogs = [];

    // Read logs from date range or all files
    if (fs.existsSync(AUDIT_DIR)) {
      const files = fs.readdirSync(AUDIT_DIR)
        .filter(f => f.startsWith('audit-') && f.endsWith('.json'))
        .sort()
        .reverse()
        .slice(0, 30); // Last 30 days

      for (const file of files) {
        try {
          const logs = JSON.parse(fs.readFileSync(path.join(AUDIT_DIR, file), 'utf-8'));
          allLogs.push(...logs);
        } catch {}
      }
    }

    // Sort newest first
    allLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Filter
    if (entity) allLogs = allLogs.filter(l => l.entity === entity);
    if (action) allLogs = allLogs.filter(l => l.action === action);
    if (userId) allLogs = allLogs.filter(l => l.userId === userId);
    if (startDate) allLogs = allLogs.filter(l => new Date(l.timestamp) >= new Date(startDate));
    if (endDate) allLogs = allLogs.filter(l => new Date(l.timestamp) <= new Date(endDate));

    const total = allLogs.length;
    const items = allLogs.slice(offset, offset + limit);

    return { items, total, limit, offset };
  }

  /**
   * Get stats
   */
  getStats() {
    const { items, total } = this.query({ limit: 1000 });
    const today = new Date().toISOString().split('T')[0];
    const todayLogs = items.filter(l => l.timestamp.startsWith(today));

    const byAction = {};
    const byEntity = {};
    items.forEach(l => {
      byAction[l.action] = (byAction[l.action] || 0) + 1;
      byEntity[l.entity] = (byEntity[l.entity] || 0) + 1;
    });

    return {
      total,
      today: todayLogs.length,
      byAction,
      byEntity,
      recentActivity: items.slice(0, 10)
    };
  }
}

module.exports = new AuditLog();
