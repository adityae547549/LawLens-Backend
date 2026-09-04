/**
 * LawLens — Professional Lawyer Workspace
 * Matter management, evidence, timeline, notes, AI drafting, citation manager
 * Think Cursor but for lawyers
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR = path.join(__dirname, '..', 'data');
const WORKSPACES_DIR = path.join(DATA_DIR, 'workspaces');

class LawyerWorkspace {
  constructor() {
    if (!fs.existsSync(WORKSPACES_DIR)) {
      fs.mkdirSync(WORKSPACES_DIR, { recursive: true });
    }
  }

  _getWorkspacePath(id) {
    return path.join(WORKSPACES_DIR, `${id}.json`);
  }

  _loadWorkspace(id) {
    const filePath = this._getWorkspacePath(id);
    if (!fs.existsSync(filePath)) return null;
    try { return JSON.parse(fs.readFileSync(filePath, 'utf-8')); } catch { return null; }
  }

  _saveWorkspace(ws) {
    ws.updatedAt = new Date().toISOString();
    fs.writeFileSync(this._getWorkspacePath(ws.id), JSON.stringify(ws, null, 2));
  }

  // ══════════════════════════════════════════════════════════════
  // MATTERS
  // ══════════════════════════════════════════════════════════════

  createMatter({ name, description, client, court, judge, nextDate, practiceArea }) {
    const ws = {
      id: uuidv4(),
      type: 'matter',
      name, description, client, court, judge, nextDate, practiceArea,
      status: 'active',
      notes: [],
      evidence: [],
      timeline: [],
      documents: [],
      citations: [],
      tasks: [],
      aiDrafts: [],
      members: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this._saveWorkspace(ws);
    return ws;
  }

  getMatter(id) { return this._loadWorkspace(id); }

  listMatters({ status, practiceArea } = {}) {
    const files = fs.readdirSync(WORKSPACES_DIR).filter(f => f.endsWith('.json'));
    let matters = files.map(f => {
      try { return JSON.parse(fs.readFileSync(path.join(WORKSPACES_DIR, f), 'utf-8')); } catch { return null; }
    }).filter(w => w && w.type === 'matter');

    if (status) matters = matters.filter(m => m.status === status);
    if (practiceArea) matters = matters.filter(m => m.practiceArea === practiceArea);
    return matters.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  updateMatter(id, updates) {
    const ws = this._loadWorkspace(id);
    if (!ws) return null;
    Object.assign(ws, updates);
    this._saveWorkspace(ws);
    return ws;
  }

  deleteMatter(id) {
    const filePath = this._getWorkspacePath(id);
    if (!fs.existsSync(filePath)) return false;
    fs.unlinkSync(filePath);
    return true;
  }

  // ══════════════════════════════════════════════════════════════
  // EVIDENCE
  // ══════════════════════════════════════════════════════════════

  addEvidence(matterId, { title, type, description, source, date, tags }) {
    const ws = this._loadWorkspace(matterId);
    if (!ws) return null;

    const evidence = {
      id: uuidv4(), title, type, description, source, date, tags,
      status: 'pending', // pending, admitted, rejected
      createdAt: new Date().toISOString()
    };
    ws.evidence.push(evidence);
    this._saveWorkspace(ws);
    return evidence;
  }

  updateEvidence(matterId, evidenceId, updates) {
    const ws = this._loadWorkspace(matterId);
    if (!ws) return null;
    const ev = ws.evidence.find(e => e.id === evidenceId);
    if (!ev) return null;
    Object.assign(ev, updates);
    this._saveWorkspace(ws);
    return ev;
  }

  removeEvidence(matterId, evidenceId) {
    const ws = this._loadWorkspace(matterId);
    if (!ws) return false;
    ws.evidence = ws.evidence.filter(e => e.id !== evidenceId);
    this._saveWorkspace(ws);
    return true;
  }

  // ══════════════════════════════════════════════════════════════
  // TIMELINE
  // ══════════════════════════════════════════════════════════════

  addTimelineEvent(matterId, { date, title, description, type, importance }) {
    const ws = this._loadWorkspace(matterId);
    if (!ws) return null;

    const event = {
      id: uuidv4(), date, title, description,
      type: type || 'event', // event, hearing, filing, deadline, evidence
      importance: importance || 'normal', // low, normal, high, critical
      createdAt: new Date().toISOString()
    };
    ws.timeline.push(event);
    ws.timeline.sort((a, b) => new Date(a.date) - new Date(b.date));
    this._saveWorkspace(ws);
    return event;
  }

  removeTimelineEvent(matterId, eventId) {
    const ws = this._loadWorkspace(matterId);
    if (!ws) return false;
    ws.timeline = ws.timeline.filter(e => e.id !== eventId);
    this._saveWorkspace(ws);
    return true;
  }

  // ══════════════════════════════════════════════════════════════
  // NOTES
  // ══════════════════════════════════════════════════════════════

  addNote(matterId, { title, content, tags }) {
    const ws = this._loadWorkspace(matterId);
    if (!ws) return null;

    const note = {
      id: uuidv4(), title, content, tags: tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    ws.notes.push(note);
    this._saveWorkspace(ws);
    return note;
  }

  updateNote(matterId, noteId, updates) {
    const ws = this._loadWorkspace(matterId);
    if (!ws) return null;
    const note = ws.notes.find(n => n.id === noteId);
    if (!note) return null;
    Object.assign(note, updates, { updatedAt: new Date().toISOString() });
    this._saveWorkspace(ws);
    return note;
  }

  removeNote(matterId, noteId) {
    const ws = this._loadWorkspace(matterId);
    if (!ws) return false;
    ws.notes = ws.notes.filter(n => n.id !== noteId);
    this._saveWorkspace(ws);
    return true;
  }

  // ══════════════════════════════════════════════════════════════
  // CITATIONS
  // ══════════════════════════════════════════════════════════════

  addCitation(matterId, { reference, type, context, tags }) {
    const ws = this._loadWorkspace(matterId);
    if (!ws) return null;

    const citation = {
      id: uuidv4(), reference, type, context, tags: tags || [],
      createdAt: new Date().toISOString()
    };
    ws.citations.push(citation);
    this._saveWorkspace(ws);
    return citation;
  }

  removeCitation(matterId, citationId) {
    const ws = this._loadWorkspace(matterId);
    if (!ws) return false;
    ws.citations = ws.citations.filter(c => c.id !== citationId);
    this._saveWorkspace(ws);
    return true;
  }

  // ══════════════════════════════════════════════════════════════
  // AI DRAFTS
  // ══════════════════════════════════════════════════════════════

  addDraft(matterId, { title, content, type, prompt }) {
    const ws = this._loadWorkspace(matterId);
    if (!ws) return null;

    const draft = {
      id: uuidv4(), title, content, type, prompt,
      status: 'draft', // draft, reviewed, final
      versions: [{ content, timestamp: new Date().toISOString() }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    ws.aiDrafts.push(draft);
    this._saveWorkspace(ws);
    return draft;
  }

  updateDraft(matterId, draftId, updates) {
    const ws = this._loadWorkspace(matterId);
    if (!ws) return null;
    const draft = ws.aiDrafts.find(d => d.id === draftId);
    if (!draft) return null;
    Object.assign(draft, updates, { updatedAt: new Date().toISOString() });
    if (updates.content) {
      draft.versions.push({ content: updates.content, timestamp: new Date().toISOString() });
    }
    this._saveWorkspace(ws);
    return draft;
  }

  // ══════════════════════════════════════════════════════════════
  // TASKS
  // ══════════════════════════════════════════════════════════════

  addTask(matterId, { title, description, dueDate, priority, assignedTo }) {
    const ws = this._loadWorkspace(matterId);
    if (!ws) return null;

    const task = {
      id: uuidv4(), title, description, dueDate,
      priority: priority || 'medium',
      assignedTo: assignedTo || null,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    ws.tasks.push(task);
    this._saveWorkspace(ws);
    return task;
  }

  updateTask(matterId, taskId, updates) {
    const ws = this._loadWorkspace(matterId);
    if (!ws) return null;
    const task = ws.tasks.find(t => t.id === taskId);
    if (!task) return null;
    Object.assign(task, updates);
    this._saveWorkspace(ws);
    return task;
  }

  // ══════════════════════════════════════════════════════════════
  // STATS
  // ══════════════════════════════════════════════════════════════

  getStats() {
    const matters = this.listMatters();
    let totalEvidence = 0, totalNotes = 0, totalCitations = 0, totalDrafts = 0, totalTasks = 0;

    matters.forEach(m => {
      totalEvidence += m.evidence?.length || 0;
      totalNotes += m.notes?.length || 0;
      totalCitations += m.citations?.length || 0;
      totalDrafts += m.aiDrafts?.length || 0;
      totalTasks += m.tasks?.length || 0;
    });

    return {
      totalMatters: matters.length,
      activeMatters: matters.filter(m => m.status === 'active').length,
      totalEvidence, totalNotes, totalCitations, totalDrafts, totalTasks
    };
  }
}

module.exports = LawyerWorkspace;
