/**
 * LawLens Semantic Legal Knowledge Graph & Inter-Reference Engine
 * Implements Phase 7 (Cross references), Phase 8 (Semantic legal graph), Phase 10 (AI enrichment), and Phase 12 (Knowledge graph)
 */

class LegalKnowledgeGraph {
  constructor() {
    // Primary Nodes in the Knowledge Graph
    this.nodes = new Map();
    // Directed Edges between Nodes (e.g. BNS 103 -> IPC 302, Article 21 -> Puttaswamy)
    this.edges = [];
    this._initializeCoreGraph();
  }

  _initializeCoreGraph() {
    // 1. Constitutional Nodes
    this.addNode('Article 21', { type: 'constitutional_article', act: 'Constitution of India', title: 'Protection of Life and Personal Liberty' });
    this.addNode('Article 19', { type: 'constitutional_article', act: 'Constitution of India', title: 'Protection of Certain Rights Regarding Freedom of Speech' });
    this.addNode('Article 14', { type: 'constitutional_article', act: 'Constitution of India', title: 'Equality Before Law' });
    this.addNode('Article 32', { type: 'constitutional_article', act: 'Constitution of India', title: 'Remedies for Enforcement of Rights' });

    // 2. Criminal Law Nodes (BNS / IPC)
    this.addNode('BNS Section 103', { type: 'statutory_provision', act: 'Bharatiya Nyaya Sanhita 2023', section: '103', title: 'Punishment for Murder', previousEquivalent: 'IPC Section 302' });
    this.addNode('IPC Section 302', { type: 'historical_statute', act: 'Indian Penal Code 1860', section: '302', title: 'Punishment for Murder' });
    this.addNode('BNSS Section 173', { type: 'procedural_law', act: 'Bharatiya Nagarik Suraksha Sanhita 2023', section: '173', title: 'Information in Cognizable Cases (FIR)', previousEquivalent: 'CrPC Section 154' });
    this.addNode('BNSS Section 482', { type: 'procedural_law', act: 'Bharatiya Nagarik Suraksha Sanhita 2023', section: '482', title: 'Anticipatory Bail', previousEquivalent: 'CrPC Section 438' });
    this.addNode('BSA Section 61', { type: 'evidence_law', act: 'Bharatiya Sakshya Adhiniyam 2023', section: '61', title: 'Admissibility of Electronic Records', previousEquivalent: 'Evidence Act Section 65B' });

    // 3. Special Acts & Statutory Domains
    this.addNode('RTI Section 6', { type: 'statutory_provision', act: 'Right to Information Act 2005', section: '6', title: 'Request for Obtaining Information' });
    this.addNode('IT Act Section 69A', { type: 'statutory_provision', act: 'Information Technology Act 2000', section: '69A', title: 'Website Blocking Orders' });
    this.addNode('Consumer Protection Sec 28', { type: 'statutory_provision', act: 'Consumer Protection Act 2019', section: '28', title: 'District Commission Jurisdiction' });

    // 4. Supreme Court Landmark Case Nodes
    this.addNode('Puttaswamy (2017)', { type: 'landmark_case', citation: 'AIR 2017 SC 4161', title: 'Right to Privacy Case' });
    this.addNode('Maneka Gandhi (1978)', { type: 'landmark_case', citation: 'AIR 1978 SC 597', title: 'Procedural Due Process Case' });
    this.addNode('Shreya Singhal (2015)', { type: 'landmark_case', citation: 'AIR 2015 SC 1523', title: 'Section 66A Struck Down Case' });
    this.addNode('Kesavananda Bharati (1973)', { type: 'landmark_case', citation: 'AIR 1973 SC 1461', title: 'Basic Structure Doctrine Case' });

    // 5. Connect Edges (Relationships)
    this.addEdge('Article 21', 'Maneka Gandhi (1978)', 'EXPANDED_BY', { note: 'Procedure established by law must be fair, just, and reasonable' });
    this.addEdge('Article 21', 'Puttaswamy (2017)', 'INCLUDES_RIGHT', { note: 'Right to Privacy is fundamental under Article 21' });
    this.addEdge('Puttaswamy (2017)', 'IT Act Section 69A', 'APPLIES_TO', { note: 'Digital privacy & data blocking proportionality' });
    this.addEdge('Article 19', 'Shreya Singhal (2015)', 'STRUCK_DOWN_SECTION', { note: 'Section 66A IT Act struck down for violating Art 19(1)(a)' });
    this.addEdge('BNS Section 103', 'IPC Section 302', 'REPLACES', { note: 'BNS Section 103 replaces IPC Section 302' });
    this.addEdge('BNS Section 103', 'BNSS Section 173', 'REQUIRES_PROCEDURE', { note: 'FIR registration under BNSS 173' });
    this.addEdge('BNS Section 103', 'BSA Section 61', 'REQUIRES_EVIDENCE', { note: 'Electronic evidence admissible under BSA 61' });
  }

  addNode(id, data) {
    this.nodes.set(id, { id, ...data });
  }

  addEdge(sourceId, targetId, relationship, metadata = {}) {
    this.edges.push({ source: sourceId, target: targetId, relationship, metadata });
  }

  getConnectedNodes(nodeId) {
    const outgoing = this.edges.filter(e => e.source === nodeId);
    const incoming = this.edges.filter(e => e.target === nodeId);
    return {
      node: this.nodes.get(nodeId) || null,
      outgoingRelations: outgoing.map(e => ({ target: this.nodes.get(e.target), relation: e.relationship, meta: e.metadata })),
      incomingRelations: incoming.map(e => ({ source: this.nodes.get(e.source), relation: e.relationship, meta: e.metadata }))
    };
  }

  traversePath(startNodeId, targetNodeId) {
    const directEdge = this.edges.find(e => e.source === startNodeId && e.target === targetNodeId);
    if (directEdge) {
      return [{ step: 1, from: startNodeId, to: targetNodeId, relation: directEdge.relationship }];
    }
    // 2-hop traversal
    const firstHop = this.edges.filter(e => e.source === startNodeId);
    for (const edge1 of firstHop) {
      const secondHop = this.edges.find(e => e.source === edge1.target && e.target === targetNodeId);
      if (secondHop) {
        return [
          { step: 1, from: startNodeId, to: edge1.target, relation: edge1.relationship },
          { step: 2, from: edge1.target, to: targetNodeId, relation: secondHop.relationship }
        ];
      }
    }
    return [];
  }

  exportGraphSummary() {
    return {
      totalNodes: this.nodes.size,
      totalEdges: this.edges.length,
      nodeCategories: Array.from(this.nodes.values()).map(n => n.type)
    };
  }
}

module.exports = new LegalKnowledgeGraph();
