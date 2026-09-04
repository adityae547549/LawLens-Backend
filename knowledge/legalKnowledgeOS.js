/**
 * LawLens Legal Knowledge Operating System (LKOS) v2
 * Full hierarchy management with versioning, audit, and corpus discovery
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR = path.join(__dirname, '..', 'data');
const VERSIONS_DIR = path.join(DATA_DIR, 'versions');

const NON_ACT_FILES = new Set([
  'benchmark-history.json', 'chunks-index.json', 'knowledge-graph.json',
  'source-registry.json', 'source-tracker.json', 'pages.json',
  'observatory-report.json', 'landmark-cases.json', 'legal-maxims.json'
]);

const FILENAME_TO_ACT_NAME = {
  'ipc.json': 'Indian Penal Code 1860',
  'bns.json': 'Bharatiya Nyaya Sanhita 2023',
  'bnss.json': 'Bharatiya Nagarik Suraksha Sanhita 2023',
  'bsa.json': 'Bharatiya Sakshya Adhiniyam 2023',
  'crpc.json': 'Code of Criminal Procedure 1973',
  'evidence-act.json': 'Indian Evidence Act 1872',
  'consumer_protection.json': 'Consumer Protection Act 2019',
  'contract_act.json': 'Indian Contract Act 1872',
  'environment_act.json': 'Environment (Protection) Act 1986',
  'gst_act.json': 'Central Goods and Services Tax Act 2017',
  'it_act.json': 'Information Technology Act 2000',
  'motor_vehicles.json': 'Motor Vehicles Act 1988',
  'rti.json': 'Right to Information Act 2005',
  'companies_act.json': 'Companies Act 2013',
  'amendments.json': 'Constitutional Amendments'
};

class LegalKnowledgeOS {
  constructor() {
    if (!fs.existsSync(VERSIONS_DIR)) {
      fs.mkdirSync(VERSIONS_DIR, { recursive: true });
    }
    this._corpusCache = null;
    this._corpusHash = null;
  }

  // ══════════════════════════════════════════════════════════════
  // HIERARCHY: Act > Part > Chapter > Section > Subsection > Clause > Explanation > Illustration
  // ══════════════════════════════════════════════════════════════

  _getHierarchyPath(actId) {
    return path.join(DATA_DIR, 'hierarchy', `${actId}.json`);
  }

  _loadAct(actId) {
    const filePath = this._getHierarchyPath(actId);
    if (!fs.existsSync(filePath)) return null;
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch {
      return null;
    }
  }

  _saveAct(actId, data) {
    const dir = path.join(DATA_DIR, 'hierarchy');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    data.updatedAt = new Date().toISOString();
    fs.writeFileSync(this._getHierarchyPath(actId), JSON.stringify(data, null, 2));
  }

  /**
   * Create a new Act with full hierarchy
   */
  createAct({ title, actNumber, year, authority, description, tags = [] }) {
    const actId = `act-${uuidv4().slice(0, 8)}`;
    const act = {
      id: actId,
      type: 'act',
      title,
      actNumber: actNumber || null,
      year: year || null,
      authority: authority || '',
      description: description || '',
      tags,
      status: 'draft', // draft, published, archived
      version: 1,
      parts: [],
      metadata: {
        totalSections: 0,
        lastEditedBy: null,
        createdAt: new Date().toISOString()
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this._saveAct(actId, act);
    this._recordVersion(actId, act, 'created');
    return act;
  }

  /**
   * Get full act hierarchy (supports hierarchy + corpus IDs)
   */
  getAct(actId) {
    const hierarchyAct = this._loadAct(actId);
    if (hierarchyAct) return hierarchyAct;

    if (actId && actId.startsWith('corpus-')) {
      const corpus = this.discoverCorpus();
      return corpus.find(a => a.id === actId) || null;
    }
    return null;
  }

  /**
   * List all acts (hierarchy + discovered corpus)
   */
  listActs({ status, search } = {}) {
    const dir = path.join(DATA_DIR, 'hierarchy');
    let hierarchyActs = [];
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
      hierarchyActs = files.map(f => {
        try {
          return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'));
        } catch {
          return null;
        }
      }).filter(Boolean);
    }

    const corpusActs = this.discoverCorpus();
    const hierarchyIds = new Set(hierarchyActs.map(a => a.id));
    const uniqueCorpus = corpusActs.filter(a => !hierarchyIds.has(a.id));
    let acts = [...hierarchyActs, ...uniqueCorpus];

    if (status) acts = acts.filter(a => a.status === status);
    if (search) {
      const q = search.toLowerCase();
      acts = acts.filter(a => (a.title || '').toLowerCase().includes(q) || (a.actNumber || '').toLowerCase().includes(q));
    }

    return acts.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  /**
   * Update act metadata
   */
  updateAct(actId, updates, userId, userName) {
    const act = this._loadAct(actId);
    if (!act) return null;

    const before = JSON.parse(JSON.stringify(act));
    Object.assign(act, updates, { updatedAt: new Date().toISOString() });
    act.metadata.lastEditedBy = userName || userId;

    this._saveAct(actId, act);
    this._recordVersion(actId, act, 'updated', before, userId, userName);
    return act;
  }

  /**
   * Publish an act
   */
  publishAct(actId, userId, userName) {
    return this.updateAct(actId, { status: 'published' }, userId, userName);
  }

  /**
   * Archive an act
   */
  archiveAct(actId, userId, userName) {
    return this.updateAct(actId, { status: 'archived' }, userId, userName);
  }

  /**
   * Delete an act
   */
  deleteAct(actId) {
    const filePath = this._getHierarchyPath(actId);
    if (!fs.existsSync(filePath)) return false;
    fs.unlinkSync(filePath);
    return true;
  }

  // ══════════════════════════════════════════════════════════════
  // SECTIONS: Add, update, delete within an act
  // ══════════════════════════════════════════════════════════════

  /**
   * Add a section to an act
   */
  addSection(actId, { parentId, type, number, title, content, keywords = [], legalTopics = [] }) {
    const act = this._loadAct(actId);
    if (!act) return null;

    const section = {
      id: `sec-${uuidv4().slice(0, 8)}`,
      type: type || 'section', // part, chapter, section, subsection, clause, explanation, illustration, schedule
      number: number || '',
      title: title || '',
      content: content || '',
      keywords,
      legalTopics,
      children: [],
      order: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (parentId) {
      const parent = this._findNode(act, parentId);
      if (parent) {
        section.order = (parent.children?.length || 0);
        parent.children = parent.children || [];
        parent.children.push(section);
      }
    } else {
      section.order = act.parts.length;
      act.parts.push(section);
    }

    act.metadata.totalSections = this._countNodes(act);
    this._saveAct(actId, act);
    this._recordVersion(actId, act, 'section_added');
    return section;
  }

  /**
   * Update a section
   */
  updateSection(actId, sectionId, updates, userId, userName) {
    const act = this._loadAct(actId);
    if (!act) return null;

    const node = this._findNode(act, sectionId);
    if (!node) return null;

    const before = JSON.parse(JSON.stringify(node));
    Object.assign(node, updates, { updatedAt: new Date().toISOString() });

    this._saveAct(actId, act);
    this._recordVersion(actId, act, 'section_updated', before, userId, userName);
    return node;
  }

  /**
   * Delete a section
   */
  deleteSection(actId, sectionId) {
    const act = this._loadAct(actId);
    if (!act) return false;

    const removed = this._removeNode(act, sectionId);
    if (removed) {
      act.metadata.totalSections = this._countNodes(act);
      this._saveAct(actId, act);
      this._recordVersion(actId, act, 'section_deleted');
    }
    return removed;
  }

  /**
   * Reorder sections
   */
  reorderSections(actId, parentPath, orderedIds) {
    const act = this._loadAct(actId);
    if (!act) return false;

    if (!parentPath) {
      act.parts = orderedIds.map(id => act.parts.find(p => p.id === id)).filter(Boolean);
    } else {
      const parent = this._findNodeByPath(act, parentPath);
      if (parent && parent.children) {
        parent.children = orderedIds.map(id => parent.children.find(c => c.id === id)).filter(Boolean);
      }
    }

    this._saveAct(actId, act);
    return true;
  }

  // ══════════════════════════════════════════════════════════════
  // VERSIONING
  // ══════════════════════════════════════════════════════════════

  _recordVersion(actId, data, action, before = null, userId = null, userName = null) {
    const versionFile = path.join(VERSIONS_DIR, `${actId}.jsonl`);
    const entry = {
      timestamp: new Date().toISOString(),
      action,
      version: data.version || 1,
      userId: userId || 'system',
      userName: userName || 'System',
      snapshot: JSON.parse(JSON.stringify(data)),
      before: before ? JSON.stringify(before) : null
    };

    fs.appendFileSync(versionFile, JSON.stringify(entry) + '\n');

    // Increment version
    data.version = (data.version || 0) + 1;
    this._saveAct(actId, data);
  }

  /**
   * Get version history for an act
   */
  getVersionHistory(actId, limit = 50) {
    const versionFile = path.join(VERSIONS_DIR, `${actId}.jsonl`);
    if (!fs.existsSync(versionFile)) return [];

    const lines = fs.readFileSync(versionFile, 'utf-8').trim().split('\n').filter(Boolean);
    return lines.slice(-limit).reverse().map(line => {
      try {
        const entry = JSON.parse(line);
        return {
          timestamp: entry.timestamp,
          action: entry.action,
          version: entry.version,
          userId: entry.userId,
          userName: entry.userName
        };
      } catch {
        return null;
      }
    }).filter(Boolean);
  }

  /**
   * Restore a specific version
   */
  restoreVersion(actId, timestamp, userId, userName) {
    const versionFile = path.join(VERSIONS_DIR, `${actId}.jsonl`);
    if (!fs.existsSync(versionFile)) return null;

    const lines = fs.readFileSync(versionFile, 'utf-8').trim().split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        if (entry.timestamp === timestamp && entry.snapshot) {
          this._saveAct(actId, entry.snapshot);
          this._recordVersion(actId, entry.snapshot, 'restored', null, userId, userName);
          return entry.snapshot;
        }
      } catch {}
    }
    return null;
  }

  // ══════════════════════════════════════════════════════════════
  // CORPUS DISCOVERY — Scan existing legal source files
  // ══════════════════════════════════════════════════════════════

  _isLegalCorpusFile(filename) {
    if (NON_ACT_FILES.has(filename)) return false;
    if (!filename.endsWith('.json')) return false;
    if (filename === 'amendments.json') return true;
    return FILENAME_TO_ACT_NAME.hasOwnProperty(filename);
  }

  _computeFileHash(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
    } catch {
      return null;
    }
  }

  _parseCorpusFile(filePath, filename) {
    try {
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (!Array.isArray(raw) || raw.length === 0) return null;

      const firstEntry = raw[0];
      const actName = FILENAME_TO_ACT_NAME[filename] || firstEntry.act || filename.replace('.json', '').replace(/_/g, ' ');
      const year = firstEntry.year || null;

      let totalSections = 0;
      const chapters = raw.map((entry, idx) => {
        const chapterNum = entry.chapter || entry.part || `Group ${idx + 1}`;
        const chapterTitle = entry.title || `Chapter ${chapterNum}`;
        const sections = (entry.sections || []).map(s => ({
          id: `sec-${filename}-${s.num}`,
          type: 'section',
          number: String(s.num || ''),
          title: s.title || `Section ${s.num}`,
          content: s.text || '',
          keywords: s.keywords || s.key_topics || s.key_offenses || [],
          children: [],
          order: s.num || 0
        }));
        totalSections += sections.length;
        return {
          id: `ch-${filename}-${idx}`,
          type: entry.part ? 'part' : 'chapter',
          number: String(chapterNum),
          title: chapterTitle,
          content: '',
          children: sections,
          order: idx
        };
      });

      const fileId = `corpus-${filename.replace('.json', '')}`;
      return {
        id: fileId,
        type: 'act',
        title: actName,
        actNumber: null,
        year: year,
        authority: '',
        description: `${actName} — sourced from ${filename}`,
        tags: ['corpus'],
        status: 'published',
        version: 1,
        parts: chapters,
        metadata: {
          totalSections,
          sourceFile: filename,
          contentHash: this._computeFileHash(filePath),
          lastEditedBy: 'corpus-discovery',
          createdAt: new Date().toISOString(),
          discoveredAt: new Date().toISOString()
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } catch (err) {
      return null;
    }
  }

  discoverCorpus() {
    if (this._corpusCache) return this._corpusCache;

    const acts = [];
    const files = fs.readdirSync(DATA_DIR).filter(f => this._isLegalCorpusFile(f));

    for (const filename of files) {
      const filePath = path.join(DATA_DIR, filename);
      const act = this._parseCorpusFile(filePath, filename);
      if (act) acts.push(act);
    }

    this._corpusCache = acts.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    return this._corpusCache;
  }

  invalidateCorpusCache() {
    this._corpusCache = null;
    this._corpusHash = null;
  }

  // ══════════════════════════════════════════════════════════════
  // TREE HELPERS
  // ══════════════════════════════════════════════════════════════

  _findNode(node, id) {
    if (node.id === id) return node;
    if (node.children) {
      for (const child of node.children) {
        const found = this._findNode(child, id);
        if (found) return found;
      }
    }
    if (node.parts) {
      for (const part of node.parts) {
        const found = this._findNode(part, id);
        if (found) return found;
      }
    }
    return null;
  }

  _findNodeByPath(act, pathStr) {
    const parts = pathStr.split('/');
    let current = act;
    for (const part of parts) {
      if (part === 'parts') continue;
      if (current.children) {
        current = current.children.find(c => c.id === part);
      } else if (current.parts) {
        current = current.parts.find(p => p.id === part);
      }
      if (!current) return null;
    }
    return current;
  }

  _removeNode(node, id) {
    if (node.children) {
      const idx = node.children.findIndex(c => c.id === id);
      if (idx >= 0) {
        node.children.splice(idx, 1);
        return true;
      }
      for (const child of node.children) {
        if (this._removeNode(child, id)) return true;
      }
    }
    if (node.parts) {
      const idx = node.parts.findIndex(p => p.id === id);
      if (idx >= 0) {
        node.parts.splice(idx, 1);
        return true;
      }
    }
    return false;
  }

  _countNodes(node) {
    let count = 0;
    if (node.children) {
      count += node.children.length;
      node.children.forEach(c => { count += this._countNodes(c); });
    }
    if (node.parts) {
      count += node.parts.length;
      node.parts.forEach(p => { count += this._countNodes(p); });
    }
    return count;
  }

  /**
   * Get stats
   */
  getStats() {
    const acts = this.listActs();
    const dir = path.join(DATA_DIR, 'hierarchy');
    let totalSections = 0;
    let totalNodes = 0;

    acts.forEach(act => {
      totalSections += act.metadata?.totalSections || 0;
      totalNodes += this._countNodes(act);
    });

    return {
      totalActs: acts.length,
      published: acts.filter(a => a.status === 'published').length,
      draft: acts.filter(a => a.status === 'draft').length,
      archived: acts.filter(a => a.status === 'archived').length,
      totalSections,
      totalNodes
    };
  }

  // ══════════════════════════════════════════════════════════════
  // REBUILD — Reset generated state and rebuild from corpus
  // ══════════════════════════════════════════════════════════════

  rebuild(onProgress) {
    const emit = (stage, data) => { if (onProgress) onProgress(stage, data); };
    const startTime = Date.now();
    const result = {
      sourcesDiscovered: 0, created: 0, updated: 0, unchanged: 0, skipped: 0, errors: 0,
      acts: 0, sections: 0, chunks: 0, graphNodes: 0, graphEdges: 0, duration: 0
    };

    try {
      emit('preparing', { message: 'Preparing reset...' });

      // 1. Clear generated hierarchy directory
      const hierarchyDir = path.join(DATA_DIR, 'hierarchy');
      if (fs.existsSync(hierarchyDir)) {
        const existing = fs.readdirSync(hierarchyDir).filter(f => f.endsWith('.json'));
        for (const f of existing) {
          fs.unlinkSync(path.join(hierarchyDir, f));
        }
      }
      fs.mkdirSync(hierarchyDir, { recursive: true });

      // 2. Clear generated chunks index
      const chunksPath = path.join(DATA_DIR, 'chunks-index.json');
      if (fs.existsSync(chunksPath)) fs.unlinkSync(chunksPath);

      // 3. Clear generated knowledge graph
      const graphPath = path.join(DATA_DIR, 'knowledge-graph.json');
      if (fs.existsSync(graphPath)) fs.unlinkSync(graphPath);

      // 4. Invalidate cache and rediscover
      emit('discovering', { message: 'Discovering legal corpus...' });
      this.invalidateCorpusCache();
      const corpus = this.discoverCorpus();
      result.sourcesDiscovered = corpus.length;

      emit('discovered', { message: `Found ${corpus.length} sources`, count: corpus.length });

      // 5. Process each source
      const chunksIndex = [];
      const graphNodes = [];
      const graphEdges = [];

      for (let i = 0; i < corpus.length; i++) {
        const act = corpus[i];
        emit('processing', { message: `Processing ${act.title} (${i + 1}/${corpus.length})`, index: i + 1, total: corpus.length, source: act.title });

        try {
          // Write act to hierarchy
          this._saveAct(act.id, act);
          result.created++;
          result.acts++;
          result.sections += act.metadata?.totalSections || 0;

          // Build chunks for this act
          const actChunks = this._buildChunksForAct(act);
          chunksIndex.push(...actChunks);
          result.chunks += actChunks.length;

          // Build graph nodes/edges for this act
          const actGraph = this._buildGraphForAct(act);
          graphNodes.push(...actGraph.nodes);
          graphEdges.push(...actGraph.edges);
          result.graphNodes += actGraph.nodes.length;
          result.graphEdges += actGraph.edges.length;
        } catch (err) {
          result.errors++;
          emit('error', { message: `Error processing ${act.title}: ${err.message}`, source: act.title });
        }
      }

      // 6. Write chunks index
      emit('indexing', { message: 'Building chunks index...' });
      fs.writeFileSync(chunksPath, JSON.stringify(chunksIndex, null, 2));

      // 7. Write knowledge graph
      emit('graphing', { message: 'Building knowledge graph...' });
      fs.writeFileSync(graphPath, JSON.stringify({ nodes: graphNodes, edges: graphEdges }, null, 2));

      // 8. Finalize
      result.duration = Date.now() - startTime;
      emit('complete', { message: 'Rebuild complete', result });

      return result;
    } catch (err) {
      result.duration = Date.now() - startTime;
      result.errors++;
      emit('error', { message: `Rebuild failed: ${err.message}` });
      return result;
    }
  }

  _buildChunksForAct(act) {
    const chunks = [];
    if (!act.parts) return chunks;

    for (let ci = 0; ci < act.parts.length; ci++) {
      const chapter = act.parts[ci];
      if (!chapter.children) continue;
      for (const section of chapter.children) {
        if (!section.content) continue;
        const chunkId = `chunk-${act.id}-ch${ci}-${section.id}`;
        chunks.push({
          id: chunkId,
          sourceId: act.id,
          sourceFile: act.metadata?.sourceFile,
          actTitle: act.title,
          chapterTitle: chapter.title,
          sectionNumber: section.number,
          sectionTitle: section.title,
          content: section.content,
          keywords: section.keywords || [],
          contentHash: crypto.createHash('sha256').update(section.content).digest('hex').slice(0, 16),
          createdAt: new Date().toISOString()
        });
      }
    }
    return chunks;
  }

  _buildGraphForAct(act) {
    const nodes = [];
    const edges = [];

    // Act node
    const actNodeId = `graph-${act.id}`;
    nodes.push({ id: actNodeId, type: 'act', label: act.title, sourceId: act.id });

    if (!act.parts) return { nodes, edges };

    for (let ci = 0; ci < act.parts.length; ci++) {
      const chapter = act.parts[ci];
      const chNodeId = `graph-${act.id}-ch${ci}`;
      nodes.push({ id: chNodeId, type: 'chapter', label: chapter.title, parentId: actNodeId });
      edges.push({ id: `edge-${actNodeId}-${chNodeId}`, source: actNodeId, target: chNodeId, type: 'contains' });

      if (!chapter.children) continue;
      for (const section of chapter.children) {
        const secNodeId = `graph-${act.id}-ch${ci}-${section.id}`;
        nodes.push({ id: secNodeId, type: 'section', label: `${section.number} ${section.title}`.trim(), parentId: chNodeId, keywords: section.keywords || [] });
        edges.push({ id: `edge-${chNodeId}-${secNodeId}`, source: chNodeId, target: secNodeId, type: 'contains' });

        // Cross-reference edges via keywords
        for (const kw of (section.keywords || [])) {
          edges.push({ id: `edge-${secNodeId}-kw-${kw}`, source: secNodeId, target: `keyword-${kw}`, type: 'references', label: kw });
        }
      }
    }
    return { nodes, edges };
  }
}

module.exports = LegalKnowledgeOS;
