/**
 * LawLens — Knowledge Graph 2.0
 * Thousands of relationship types connecting all legal concepts
 * Act → Chapter → Section → Explanation → Illustration → Exception → Case → Ratio → Doctrine → Maxim
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const GRAPH_FILE = path.join(DATA_DIR, 'knowledge-graph-v2.json');

// ══════════════════════════════════════════════════════════════
// RELATIONSHIP TYPE TAXONOMY
// ══════════════════════════════════════════════════════════════
const RELATIONSHIP_TYPES = {
  // Structural relationships
  'CONTAINS_CHAPTER': { from: 'act', to: 'chapter', category: 'structural' },
  'CONTAINS_SECTION': { from: 'act', to: 'section', category: 'structural' },
  'CONTAINS_PART': { from: 'act', to: 'part', category: 'structural' },
  'CHAPTER_HAS_SECTION': { from: 'chapter', to: 'section', category: 'structural' },
  'SECTION_HAS_SUBSECTION': { from: 'section', to: 'subsection', category: 'structural' },
  'SECTION_HAS_CLAUSE': { from: 'section', to: 'clause', category: 'structural' },
  'SECTION_HAS_EXPLANATION': { from: 'section', to: 'explanation', category: 'structural' },
  'SECTION_HAS_ILLUSTRATION': { from: 'section', to: 'illustration', category: 'structural' },
  'SECTION_HAS_EXCEPTION': { from: 'section', to: 'exception', category: 'structural' },
  'SECTION_HAS_PROVISO': { from: 'section', to: 'proviso', category: 'structural' },
  'SECTION_HAS_SCHEDULE': { from: 'act', to: 'schedule', category: 'structural' },

  // Amendment relationships
  'AMENDED_BY': { from: 'section', to: 'amendment', category: 'amendment' },
  'REPEALED_BY': { from: 'section', to: 'act', category: 'amendment' },
  'SUPERSEDED_BY': { from: 'section', to: 'section', category: 'amendment' },
  'REPLACED_BY': { from: 'ipc_section', to: 'bns_section', category: 'amendment' },
  'INCORPORATED_INTO': { from: 'section', to: 'act', category: 'amendment' },
  'OMITTED_BY': { from: 'section', to: 'act', category: 'amendment' },

  // Case relationships
  'INTERPRETED_BY': { from: 'section', to: 'case', category: 'interpretation' },
  'CONSTRUED_BY': { from: 'section', to: 'case', category: 'interpretation' },
  'APPLIED_IN': { from: 'doctrine', to: 'case', category: 'interpretation' },
  'EXPANDED_BY': { from: 'article', to: 'case', category: 'interpretation' },
  'NARROWED_BY': { from: 'article', to: 'case', category: 'interpretation' },
  'STRUCK_DOWN': { from: 'case', to: 'section', category: 'interpretation' },
  'UHELD': { from: 'case', to: 'section', category: 'interpretation' },
  'READ_DOWN': { from: 'case', to: 'section', category: 'interpretation' },
  'READ_INTO': { from: 'case', to: 'section', category: 'interpretation' },
  'OVERRULEED_BY': { from: 'case', to: 'case', category: 'interpretation' },
  'FOLLOWED_BY': { from: 'case', to: 'case', category: 'interpretation' },
  'DISTINGUISHED_BY': { from: 'case', to: 'case', category: 'interpretation' },
  'REFERRED_TO': { from: 'case', to: 'case', category: 'interpretation' },

  // Doctrine relationships
  'ESTABLISHES_DOCTRINE': { from: 'case', to: 'doctrine', category: 'doctrine' },
  'APPLIES_DOCTRINE': { from: 'case', to: 'doctrine', category: 'doctrine' },
  'DOCTRINE_APPLIES_TO': { from: 'doctrine', to: 'section', category: 'doctrine' },
  'DOCTRINE_APPLIES_TO': { from: 'doctrine', to: 'article', category: 'doctrine' },
  'DOCTRINE_LIMITS': { from: 'doctrine', to: 'power', category: 'doctrine' },
  'DOCTRINE_EXPANDS': { from: 'doctrine', to: 'right', category: 'doctrine' },

  // Maxim relationships
  'MAXIM_APPLIES_TO': { from: 'maxim', to: 'section', category: 'maxim' },
  'MAXIM_APPLIES_TO': { from: 'maxim', to: 'case', category: 'maxim' },
  'ILLUSTRATED_BY': { from: 'maxim', to: 'case', category: 'maxim' },
  'MAXIM_LIMITS': { from: 'maxim', to: 'doctrine', category: 'maxim' },

  // Cross-act relationships
  'RELATED_TO': { from: 'section', to: 'section', category: 'cross-reference' },
  'REFERENCES': { from: 'section', to: 'section', category: 'cross-reference' },
  'DEPENDS_ON': { from: 'section', to: 'section', category: 'cross-reference' },
  'CONFLICTS_WITH': { from: 'section', to: 'section', category: 'cross-reference' },
  'COMPLEMENTARY_TO': { from: 'section', to: 'section', category: 'cross-reference' },
  'OVERRIDES': { from: 'section', to: 'section', category: 'cross-reference' },
  'DERIVED_FROM': { from: 'act', to: 'act', category: 'cross-reference' },

  // Constitutional relationships
  'ARTICLE_APPLIES_TO': { from: 'article', to: 'act', category: 'constitutional' },
  'ARTICLE_VALIDATES': { from: 'article', to: 'act', category: 'constitutional' },
  'ARTICLE_INVALIDATES': { from: 'article', to: 'act', category: 'constitutional' },
  'FUNDAMENTAL_RIGHT': { from: 'article', to: 'right', category: 'constitutional' },
  'DPSP': { from: 'article', to: 'principle', category: 'constitutional' },
  'AMENDMENT_POWER': { from: 'article', to: 'power', category: 'constitutional' },
  'SAVED_BY_SCHEDULE': { from: 'act', to: 'schedule', category: 'constitutional' },

  // Procedural relationships
  'GOVERNS_PROCEDURE': { from: 'section', to: 'procedure', category: 'procedural' },
  'PROCEDURE_FOR': { from: 'procedure', to: 'right', category: 'procedural' },
  'REMEDY_UNDER': { from: 'violation', to: 'section', category: 'procedural' },
  'APPEAL_FROM': { from: 'tribunal', to: 'court', category: 'procedural' },
  'JURISDICTION_OF': { from: 'court', to: 'section', category: 'procedural' },

  // Circular/notification relationships
  'CLARIFIES': { from: 'circular', to: 'section', category: 'clarification' },
  'MODIFIES': { from: 'notification', to: 'section', category: 'clarification' },
  'NOTIFIES_UNDER': { from: 'notification', to: 'section', category: 'clarification' },
  'CIRCULAR_ISSUED_UNDER': { from: 'circular', to: 'section', category: 'clarification' },
  'EXEMPTION_BY': { from: 'notification', to: 'section', category: 'clarification' },

  // Academic relationships
  'COMMENTED_ON_BY': { from: 'section', to: 'commentary', category: 'academic' },
  'CRITIQUED_BY': { from: 'section', to: 'commentary', category: 'academic' },
  'SUPPORTED_BY': { from: 'doctrine', to: 'commentary', category: 'academic' },
  'LAW_COMMISSION_REPORT': { from: 'report', to: 'act', category: 'academic' },

  // Timeline relationships
  'ENACTED_ON': { from: 'act', to: 'date', category: 'temporal' },
  'EFFECTIVE_FROM': { from: 'section', to: 'date', category: 'temporal' },
  'CASE_DECIDED_ON': { from: 'case', to: 'date', category: 'temporal' },
  'AMENDMENT_DATE': { from: 'amendment', to: 'date', category: 'temporal' }
};

class KnowledgeGraphV2 {
  constructor() {
    this._graph = this._loadGraph();
  }

  _loadGraph() {
    try {
      if (fs.existsSync(GRAPH_FILE)) {
        return JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf-8'));
      }
    } catch {}
    return { version: '2.0.0', nodes: [], edges: [], metadata: { lastUpdated: null, nodeCount: 0, edgeCount: 0 } };
  }

  _saveGraph() {
    this._graph.metadata.lastUpdated = new Date().toISOString();
    this._graph.metadata.nodeCount = this._graph.nodes.length;
    this._graph.metadata.edgeCount = this._graph.edges.length;
    fs.writeFileSync(GRAPH_FILE, JSON.stringify(this._graph, null, 2));
  }

  /**
   * Add a node
   */
  addNode({ id, type, title, metadata = {} }) {
    const existing = this._graph.nodes.find(n => n.id === id);
    if (existing) {
      Object.assign(existing, { type, title, ...metadata, updatedAt: new Date().toISOString() });
    } else {
      this._graph.nodes.push({
        id, type, title, ...metadata,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    this._saveGraph();
    return this._graph.nodes.find(n => n.id === id);
  }

  /**
   * Add an edge (relationship)
   */
  addEdge({ source, target, relationship, metadata = {} }) {
    // Validate relationship type
    if (!RELATIONSHIP_TYPES[relationship]) {
      // Allow custom relationships but log warning
    }

    const existing = this._graph.edges.find(e =>
      e.source === source && e.target === target && e.relationship === relationship
    );

    if (existing) {
      Object.assign(existing, { metadata: { ...existing.metadata, ...metadata }, updatedAt: new Date().toISOString() });
    } else {
      this._graph.edges.push({
        id: `edge-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        source, target, relationship, metadata,
        createdAt: new Date().toISOString()
      });
    }
    this._saveGraph();
  }

  /**
   * Remove a node and all its edges
   */
  removeNode(nodeId) {
    this._graph.nodes = this._graph.nodes.filter(n => n.id !== nodeId);
    this._graph.edges = this._graph.edges.filter(e => e.source !== nodeId && e.target !== nodeId);
    this._saveGraph();
  }

  /**
   * Remove an edge
   */
  removeEdge(edgeId) {
    this._graph.edges = this._graph.edges.filter(e => e.id !== edgeId);
    this._saveGraph();
  }

  /**
   * Get full graph
   */
  getGraph() {
    return this._graph;
  }

  /**
   * Get nodes by type
   */
  getNodesByType(type) {
    return this._graph.nodes.filter(n => n.type === type);
  }

  /**
   * Get edges by relationship type
   */
  getEdgesByRelationship(relationship) {
    return this._graph.edges.filter(e => e.relationship === relationship);
  }

  /**
   * Get connected nodes for a given node
   */
  getConnections(nodeId, { maxDepth = 2, relationshipTypes = null } = {}) {
    const visited = new Set();
    const result = { node: this._graph.nodes.find(n => n.id === nodeId), connections: [] };

    const traverse = (currentId, depth) => {
      if (depth > maxDepth || visited.has(currentId)) return;
      visited.add(currentId);

      const outgoing = this._graph.edges.filter(e =>
        e.source === currentId && (!relationshipTypes || relationshipTypes.includes(e.relationship))
      );
      const incoming = this._graph.edges.filter(e =>
        e.target === currentId && (!relationshipTypes || relationshipTypes.includes(e.relationship))
      );

      [...outgoing, ...incoming].forEach(edge => {
        const otherId = edge.source === currentId ? edge.target : edge.source;
        const otherNode = this._graph.nodes.find(n => n.id === otherId);
        if (otherNode) {
          result.connections.push({
            node: otherNode,
            relationship: edge.relationship,
            direction: edge.source === currentId ? 'outgoing' : 'incoming',
            depth,
            metadata: edge.metadata
          });
          traverse(otherId, depth + 1);
        }
      });
    };

    traverse(nodeId, 1);
    return result;
  }

  /**
   * Find shortest path between two nodes
   */
  findPath(startId, endId, maxDepth = 5) {
    const queue = [{ id: startId, path: [] }];
    const visited = new Set();

    while (queue.length > 0) {
      const { id, path } = queue.shift();
      if (id === endId) return path;
      if (visited.has(id) || path.length >= maxDepth) continue;
      visited.add(id);

      this._graph.edges.forEach(edge => {
        if (edge.source === id && !visited.has(edge.target)) {
          queue.push({ id: edge.target, path: [...path, { from: id, to: edge.target, relationship: edge.relationship }] });
        }
        if (edge.target === id && !visited.has(edge.source)) {
          queue.push({ id: edge.source, path: [...path, { from: id, to: edge.source, relationship: edge.relationship }] });
        }
      });
    }

    return null; // No path found
  }

  /**
   * Search nodes
   */
  search(query, { type = null, limit = 50 } = {}) {
    const q = query.toLowerCase();
    let results = this._graph.nodes.filter(n => {
      const matchesQuery = (n.title || '').toLowerCase().includes(q) ||
                          (n.id || '').toLowerCase().includes(q) ||
                          (n.act || '').toLowerCase().includes(q);
      const matchesType = !type || n.type === type;
      return matchesQuery && matchesType;
    });

    // Score by relevance
    results = results.map(n => ({
      ...n,
      score: (n.title || '').toLowerCase().startsWith(q) ? 1 :
             (n.title || '').toLowerCase().includes(q) ? 0.8 : 0.5
    }));

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  /**
   * Auto-generate edges based on node metadata
   */
  autoGenerateEdges() {
    let edgesAdded = 0;

    // Connect sections to their parent acts
    this._graph.nodes.filter(n => n.type === 'section' && n.actId).forEach(section => {
      const exists = this._graph.edges.some(e => e.source === section.actId && e.target === section.id && e.relationship === 'CONTAINS_SECTION');
      if (!exists) {
        this.addEdge({ source: section.actId, target: section.id, relationship: 'CONTAINS_SECTION' });
        edgesAdded++;
      }
    });

    // Connect cases to sections they interpret
    this._graph.nodes.filter(n => n.type === 'case' && n.interpretsSections).forEach(caseNode => {
      (caseNode.interpretsSections || []).forEach(sectionId => {
        const exists = this._graph.edges.some(e => e.source === sectionId && e.target === caseNode.id && e.relationship === 'INTERPRETED_BY');
        if (!exists) {
          this.addEdge({ source: sectionId, target: caseNode.id, relationship: 'INTERPRETED_BY' });
          edgesAdded++;
        }
      });
    });

    // Connect BNS sections to their IPC predecessors
    this._graph.nodes.filter(n => n.type === 'bns_section' && n.previousEquivalent).forEach(bns => {
      const ipcNode = this._graph.nodes.find(n => n.id === bns.previousEquivalent || n.title === bns.previousEquivalent);
      if (ipcNode) {
        const exists = this._graph.edges.some(e => e.source === bns.id && e.target === ipcNode.id && e.relationship === 'REPLACED_BY');
        if (!exists) {
          this.addEdge({ source: bns.id, target: ipcNode.id, relationship: 'REPLACED_BY' });
          edgesAdded++;
        }
      }
    });

    this._saveGraph();
    return edgesAdded;
  }

  /**
   * Get relationship type taxonomy
   */
  getRelationshipTypes() {
    return RELATIONSHIP_TYPES;
  }

  /**
   * Get stats
   */
  getStats() {
    const byType = {};
    const byRelationship = {};
    const byCategory = {};

    this._graph.nodes.forEach(n => {
      byType[n.type] = (byType[n.type] || 0) + 1;
    });

    this._graph.edges.forEach(e => {
      byRelationship[e.relationship] = (byRelationship[e.relationship] || 0) + 1;
      const relType = RELATIONSHIP_TYPES[e.relationship];
      if (relType) {
        byCategory[relType.category] = (byCategory[relType.category] || 0) + 1;
      }
    });

    return {
      totalNodes: this._graph.nodes.length,
      totalEdges: this._graph.edges.length,
      byType,
      byRelationship,
      byCategory,
      totalRelationshipTypes: Object.keys(RELATIONSHIP_TYPES).length,
      version: this._graph.version,
      lastUpdated: this._graph.metadata.lastUpdated
    };
  }
}

module.exports = KnowledgeGraphV2;
