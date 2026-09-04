/**
 * LawLens — Legal Time Machine
 * Select any act and any date to see:
 * - The law exactly as it existed then
 * - Amendments since then
 * - Judgments applicable at that time
 * - What changed afterward
 * - Cross-reference updates
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

class LegalTimeMachine {
  constructor() {
    this._hierarchyDir = path.join(DATA_DIR, 'hierarchy');
  }

  /**
   * Get the state of an act at a specific point in time
   */
  getActAtDate(actId, targetDate) {
    const act = this._loadAct(actId);
    if (!act) return null;

    const date = new Date(targetDate);

    // Get all versions up to the target date
    const versions = this._getVersionsBefore(actId, date);

    // Apply amendments chronologically to reconstruct the law
    const state = this._reconstructState(act, versions, date);

    // Get amendments after this date
    const subsequentAmendments = this._getVersionsAfter(actId, date);

    // Get applicable judgments
    const applicableJudgments = this._getJudgmentsBefore(actId, date);

    // Get what changed after
    const changesAfter = this._getChangesSummary(subsequentAmendments);

    return {
      actId,
      actTitle: act.title,
      targetDate: date.toISOString(),
      currentState: state,
      versionCount: versions.length,
      enactedDate: act.createdAt,
      totalAmendments: subsequentAmendments.length,
      applicableJudgments,
      changesAfter,
      metadata: {
        reconstructedFrom: versions.length + ' versions',
        confidence: versions.length > 0 ? 'high' : 'medium'
      }
    };
  }

  /**
   * Get amendment timeline for an act
   */
  getAmendmentTimeline(actId) {
    const versions = this._getVersions(actId);
    const act = this._loadAct(actId);

    return {
      actId,
      actTitle: act?.title,
      enactedDate: act?.createdAt,
      amendments: versions.map(v => ({
        timestamp: v.timestamp,
        action: v.action,
        version: v.version,
        summary: this._summarizeChange(v.before, v.snapshot),
        user: v.userName
      })).reverse()
    };
  }

  /**
   * Compare two dates for an act
   */
  compareDates(actId, date1, date2) {
    const state1 = this.getActAtDate(actId, date1);
    const state2 = this.getActAtDate(actId, date2);

    if (!state1 || !state2) return null;

    const differences = this._diffStates(state1.currentState, state2.currentState);

    return {
      actId,
      date1,
      date2,
      state1,
      state2,
      differences,
      summary: `Between ${date1} and ${date2}, ${differences.length} change(s) occurred.`
    };
  }

  // ══════════════════════════════════════════════════════════════
  // INTERNAL HELPERS
  // ══════════════════════════════════════════════════════════════

  _loadAct(actId) {
    const filePath = path.join(this._hierarchyDir, `${actId}.json`);
    if (!fs.existsSync(filePath)) return null;
    try { return JSON.parse(fs.readFileSync(filePath, 'utf-8')); } catch { return null; }
  }

  _getVersions(actId) {
    const versionFile = path.join(DATA_DIR, 'versions', `${actId}.jsonl`);
    if (!fs.existsSync(versionFile)) return [];

    const lines = fs.readFileSync(versionFile, 'utf-8').trim().split('\n').filter(Boolean);
    return lines.map(line => {
      try { return JSON.parse(line); } catch { return null; }
    }).filter(Boolean);
  }

  _getVersionsBefore(actId, date) {
    return this._getVersions(actId).filter(v => new Date(v.timestamp) <= date);
  }

  _getVersionsAfter(actId, date) {
    return this._getVersions(actId).filter(v => new Date(v.timestamp) > date);
  }

  _reconstructState(act, versions, date) {
    // Start with the act as created
    let state = { ...act };

    // Apply each version chronologically
    versions.forEach(v => {
      if (v.snapshot) {
        state = { ...v.snapshot, _reconstructedAt: v.timestamp };
      }
    });

    return state;
  }

  _getJudgmentsBefore(actId, date) {
    // This would query the knowledge graph for cases that interpret sections of this act
    // before the given date
    return [];
  }

  _getChangesSummary(amendments) {
    return amendments.map(a => ({
      date: a.timestamp,
      action: a.action,
      summary: this._summarizeChange(a.before, a.snapshot),
      version: a.version
    }));
  }

  _summarizeChange(before, after) {
    if (!before || !after) return 'Initial version';

    const beforeObj = typeof before === 'string' ? JSON.parse(before) : before;
    const changes = [];

    if (beforeObj.title !== after.title) changes.push('Title changed');
    if (beforeObj.status !== after.status) changes.push(`Status: ${beforeObj.status} → ${after.status}`);
    if ((beforeObj.parts?.length || 0) < (after.parts?.length || 0)) {
      changes.push(`Added ${after.parts.length - beforeObj.parts.length} sections`);
    }

    return changes.length > 0 ? changes.join('; ') : 'Content updated';
  }

  _diffStates(state1, state2) {
    const diffs = [];
    const allKeys = new Set([...Object.keys(state1), ...Object.keys(state2)]);

    allKeys.forEach(key => {
      if (key.startsWith('_')) return;
      if (JSON.stringify(state1[key]) !== JSON.stringify(state2[key])) {
        diffs.push({
          field: key,
          from: state1[key],
          to: state2[key]
        });
      }
    });

    return diffs;
  }
}

module.exports = LegalTimeMachine;
