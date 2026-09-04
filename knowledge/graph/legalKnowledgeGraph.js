/**
 * Legal Knowledge Graph - Enhanced knowledge graph for LawLens
 * Relationships between Acts, Articles, Sections, Rules, Notifications,
 * Circulars, Definitions, Judgments, Legal Maxims, Constitutional Principles
 */

const fs = require('fs');
const path = require('path');

class LegalKnowledgeGraph {
  constructor(config = {}) {
    this.config = config;
    this.nodes = new Map();
    this.edges = [];
    this.adjacencyList = new Map(); // For fast traversal
    this.nodeIndex = new Map();     // For text search
    this.statsPath = path.join(config.dataDir || 'data', 'knowledge-graph-stats.json');

    // Edge relationship types
    this.edgeTypes = {
      REPLACES: { direction: 'forward', inverse: 'REPLACED_BY' },
      REPLACED_BY: { direction: 'forward', inverse: 'REPLACES' },
      AMENDS: { direction: 'forward', inverse: 'AMENDED_BY' },
      AMENDED_BY: { direction: 'forward', inverse: 'AMENDS' },
      REFERENCES: { direction: 'forward', inverse: 'REFERENCED_BY' },
      REFERENCED_BY: { direction: 'forward', inverse: 'REFERENCES' },
      DERIVES_FROM: { direction: 'forward', inverse: 'DERIVED_BY' },
      DERIVED_BY: { direction: 'forward', inverse: 'DERIVES_FROM' },
      OVERRULES: { direction: 'forward', inverse: 'OVERRULED_BY' },
      OVERRULED_BY: { direction: 'forward', inverse: 'OVERRULES' },
      DISTINGUISHES: { direction: 'forward', inverse: 'DISTINGUISHED_BY' },
      DISTINGUISHED_BY: { direction: 'forward', inverse: 'DISTINGUISHES' },
      FOLLOWS: { direction: 'forward', inverse: 'FOLLOWED_BY' },
      FOLLOWED_BY: { direction: 'forward', inverse: 'FOLLOWS' },
      INTERPRETS: { direction: 'forward', inverse: 'INTERPRETED_BY' },
      INTERPRETED_BY: { direction: 'forward', inverse: 'INTERPRETS' },
      APPLIES_TO: { direction: 'forward', inverse: 'APPLIED_BY' },
      APPLIED_BY: { direction: 'forward', inverse: 'APPLIES_TO' },
      PROCEDURE_FOR: { direction: 'forward', inverse: 'PROCEDURE_OF' },
      PROCEDURE_OF: { direction: 'forward', inverse: 'PROCEDURE_FOR' },
      EVIDENCE_FOR: { direction: 'forward', inverse: 'EVIDENCE_OF' },
      EVIDENCE_OF: { direction: 'forward', inverse: 'EVIDENCE_FOR' },
      EXCEPTION_TO: { direction: 'forward', inverse: 'EXCEPTION_OF' },
      EXCEPTION_OF: { direction: 'forward', inverse: 'EXCEPTION_TO' },
      CONTAINS: { direction: 'forward', inverse: 'CONTAINED_IN' },
      CONTAINED_IN: { direction: 'forward', inverse: 'CONTAINS' },
      DEFINES: { direction: 'forward', inverse: 'DEFINED_IN' },
      DEFINED_IN: { direction: 'forward', inverse: 'DEFINES' },
      PART_OF: { direction: 'forward', inverse: 'HAS_PART' },
      HAS_PART: { direction: 'forward', inverse: 'PART_OF' },
      SUPERSEDES: { direction: 'forward', inverse: 'SUPERSEDED_BY' },
      SUPERSEDED_BY: { direction: 'forward', inverse: 'SUPERSEDES' },
    };
  }

  /**
   * Initialize the knowledge graph with core data
   */
  async initialize() {
    // Load existing graph data if available
    await this.loadGraph();

    // If empty, initialize with core legal nodes
    if (this.nodes.size === 0) {
      this._initializeCoreGraph();
    }
  }

  /**
   * Initialize core graph with essential legal relationships
   */
  _initializeCoreGraph() {
    // === CONSTITUTIONAL NODES ===
    this.addNode('ARTICLE-21', {
      type: 'constitutional_article',
      title: 'Protection of Life and Personal Liberty',
      act: 'Constitution of India',
      articleNumber: '21',
      keywords: ['life', 'liberty', 'personal liberty', 'due process', 'privacy'],
      legalTopics: ['constitutional-law', 'fundamental-rights'],
    });
    this.addNode('ARTICLE-14', {
      type: 'constitutional_article',
      title: 'Equality Before Law',
      act: 'Constitution of India',
      articleNumber: '14',
      keywords: ['equality', 'equal protection', 'non-discrimination'],
      legalTopics: ['constitutional-law', 'fundamental-rights'],
    });
    this.addNode('ARTICLE-19', {
      type: 'constitutional_article',
      title: 'Protection of Certain Rights Regarding Freedom of Speech',
      act: 'Constitution of India',
      articleNumber: '19',
      keywords: ['speech', 'expression', 'assembly', 'association', 'movement', 'residence', 'profession'],
      legalTopics: ['constitutional-law', 'fundamental-rights'],
    });
    this.addNode('ARTICLE-32', {
      type: 'constitutional_article',
      title: 'Remedies for Enforcement of Rights',
      act: 'Constitution of India',
      articleNumber: '32',
      keywords: ['writ', 'habeas corpus', 'mandamus', 'prohibition', 'certiorari', 'quo warranto'],
      legalTopics: ['constitutional-law', 'remedies'],
    });
    this.addNode('ARTICLE-136', {
      type: 'constitutional_article',
      title: 'Special Leave Petition',
      act: 'Constitution of India',
      articleNumber: '136',
      keywords: ['slp', 'special leave', 'supreme court', 'appeal'],
      legalTopics: ['constitutional-law', 'appellate-jurisdiction'],
    });
    this.addNode('ARTICLE-226', {
      type: 'constitutional_article',
      title: 'Writ Jurisdiction of High Courts',
      act: 'Constitution of India',
      articleNumber: '226',
      keywords: ['writ', 'high court', 'jurisdiction', 'fundamental rights'],
      legalTopics: ['constitutional-law', 'remedies'],
    });
    this.addNode('ARTICLE-142', {
      type: 'constitutional_article',
      title: 'Power to Do Complete Justice',
      act: 'Constitution of India',
      articleNumber: '142',
      keywords: ['complete justice', 'supreme court', 'power', 'equity'],
      legalTopics: ['constitutional-law', 'supreme-court-power'],
    });

    // === CRIMINAL LAW NODES (BNS / IPC) ===
    this.addNode('BNS-103', {
      type: 'statutory_provision',
      title: 'Punishment for Murder',
      act: 'Bharatiya Nyaya Sanhita, 2023',
      sectionNumber: '103',
      keywords: ['murder', 'death penalty', 'life imprisonment', 'culpable homicide'],
      legalTopics: ['criminal-law'],
    });
    this.addNode('IPC-302', {
      type: 'historical_statute',
      title: 'Punishment for Murder',
      act: 'Indian Penal Code, 1860',
      sectionNumber: '302',
      keywords: ['murder', 'death penalty', 'life imprisonment'],
      legalTopics: ['criminal-law'],
    });
    this.addNode('BNS-105', {
      type: 'statutory_provision',
      title: 'Punishment for Culpable Homicide Not Amounting to Murder',
      act: 'Bharatiya Nyaya Sanhita, 2023',
      sectionNumber: '105',
      keywords: ['culpable homicide', 'hurt', 'grievous hurt'],
      legalTopics: ['criminal-law'],
    });
    this.addNode('BNS-63', {
      type: 'statutory_provision',
      title: 'Rape',
      act: 'Bharatiya Nyaya Sanhita, 2023',
      sectionNumber: '63',
      keywords: ['rape', 'sexual assault', 'consent'],
      legalTopics: ['criminal-law'],
    });
    this.addNode('BNS-85', {
      type: 'statutory_provision',
      title: 'Cruelty by Husband or His Relatives',
      act: 'Bharatiya Nyaya Sanhita, 2023',
      sectionNumber: '85',
      keywords: ['cruelty', 'dowry', 'domestic violence', '498A'],
      legalTopics: ['criminal-law', 'family-law'],
    });
    this.addNode('BNS-303', {
      type: 'statutory_provision',
      title: 'Theft',
      act: 'Bharatiya Nyaya Sanhita, 2023',
      sectionNumber: '303',
      keywords: ['theft', 'dishonest taking', 'movable property'],
      legalTopics: ['criminal-law'],
    });
    this.addNode('BNS-318', {
      type: 'statutory_provision',
      title: 'Cheating',
      act: 'Bharatiya Nyaya Sanhita, 2023',
      sectionNumber: '318',
      keywords: ['cheating', 'fraud', 'deception', 'dishonesty'],
      legalTopics: ['criminal-law'],
    });

    // === PROCEDURAL LAW NODES ===
    this.addNode('BNSS-173', {
      type: 'procedural_law',
      title: 'Information in Cognizable Cases (FIR)',
      act: 'Bharatiya Nagarik Suraksha Sanhita, 2023',
      sectionNumber: '173',
      keywords: ['fir', 'first information', 'cognizable', 'police'],
      legalTopics: ['criminal-law', 'procedural-law'],
    });
    this.addNode('BNSS-482', {
      type: 'procedural_law',
      title: 'Anticipatory Bail',
      act: 'Bharatiya Nagarik Suraksha Sanhita, 2023',
      sectionNumber: '482',
      keywords: ['anticipatory bail', 'arrest', 'bail', '438 CrPC'],
      legalTopics: ['criminal-law', 'procedural-law'],
    });
    this.addNode('BNSS-480', {
      type: 'procedural_law',
      title: 'Bail in Non-Bailable Offences',
      act: 'Bharatiya Nagarik Suraksha Sanhita, 2023',
      sectionNumber: '480',
      keywords: ['bail', 'non-bailable', 'release'],
      legalTopics: ['criminal-law', 'procedural-law'],
    });
    this.addNode('BNSS-335', {
      type: 'procedural_law',
      title: 'Power to Release on Probation',
      act: 'Bharatiya Nagarik Suraksha Sanhita, 2023',
      sectionNumber: '335',
      keywords: ['probation', 'release', 'good conduct'],
      legalTopics: ['criminal-law', 'procedural-law'],
    });

    // === EVIDENCE LAW NODES ===
    this.addNode('BSA-61', {
      type: 'evidence_law',
      title: 'Admissibility of Electronic Records',
      act: 'Bharatiya Sakshya Adhiniyam, 2023',
      sectionNumber: '61',
      keywords: ['electronic evidence', 'admissibility', 'digital', '65B'],
      legalTopics: ['evidence-law'],
    });
    this.addNode('BSA-26', {
      type: 'evidence_law',
      title: 'Dying Declaration',
      act: 'Bharatiya Sakshya Adhiniyam, 2023',
      sectionNumber: '26',
      keywords: ['dying declaration', 'statement before death'],
      legalTopics: ['evidence-law'],
    });
    this.addNode('BSA-12', {
      type: 'evidence_law',
      title: 'Facts in Issue and Relevant Facts',
      act: 'Bharatiya Sakshya Adhiniyam, 2023',
      sectionNumber: '12',
      keywords: ['relevant facts', 'facts in issue', 'admissibility'],
      legalTopics: ['evidence-law'],
    });

    // === SPECIAL ACTS ===
    this.addNode('RTI-6', {
      type: 'statutory_provision',
      title: 'Request for Obtaining Information',
      act: 'Right to Information Act, 2005',
      sectionNumber: '6',
      keywords: ['rti', 'information request', 'public authority'],
      legalTopics: ['rti'],
    });
    this.addNode('IT-69A', {
      type: 'statutory_provision',
      title: 'Website Blocking Orders',
      act: 'Information Technology Act, 2000',
      sectionNumber: '69A',
      keywords: ['blocking', 'website', 'internet', 'censorship'],
      legalTopics: ['cyber-law'],
    });
    this.addNode('CONSUMER-28', {
      type: 'statutory_provision',
      title: 'District Commission Jurisdiction',
      act: 'Consumer Protection Act, 2019',
      sectionNumber: '28',
      keywords: ['consumer', 'district forum', 'jurisdiction', 'complaint'],
      legalTopics: ['consumer-law'],
    });

    // === LANDMARK CASE NODES ===
    this.addNode('CASE-PUTTASWAMY-2017', {
      type: 'landmark_case',
      title: 'Right to Privacy',
      citation: 'AIR 2017 SC 4161',
      court: 'Supreme Court of India',
      year: 2017,
      bench: '9-judge bench',
      keywords: ['privacy', 'data protection', 'informational privacy', 'dignity'],
      legalTopics: ['constitutional-law', 'cyber-law'],
    });
    this.addNode('CASE-MANEKA-GANDHI-1978', {
      type: 'landmark_case',
      title: 'Procedural Due Process',
      citation: 'AIR 1978 SC 597',
      court: 'Supreme Court of India',
      year: 1978,
      keywords: ['due process', 'procedure established by law', 'fair just reasonable'],
      legalTopics: ['constitutional-law'],
    });
    this.addNode('CASE-SHREYA-SINGHAL-2015', {
      type: 'landmark_case',
      title: 'Section 66A Struck Down',
      citation: 'AIR 2015 SC 1523',
      court: 'Supreme Court of India',
      year: 2015,
      keywords: ['66A', 'free speech', 'internet', 'website blocking'],
      legalTopics: ['cyber-law', 'constitutional-law'],
    });
    this.addNode('CASE-KESAVANANDA-1973', {
      type: 'landmark_case',
      title: 'Basic Structure Doctrine',
      citation: 'AIR 1973 SC 1461',
      court: 'Supreme Court of India',
      year: 1973,
      keywords: ['basic structure', 'amendment', 'parliament', 'constitution'],
      legalTopics: ['constitutional-law'],
    });
    this.addNode('CASE-OLGA-TELLIS-1985', {
      type: 'landmark_case',
      title: 'Right to Livelihood',
      citation: 'AIR 1985 SC 1416',
      court: 'Supreme Court of India',
      year: 1985,
      keywords: ['livelihood', 'slum', 'eviction', 'article 21'],
      legalTopics: ['constitutional-law'],
    });
    this.addNode('CASE-VISHAKA-1997', {
      type: 'landmark_case',
      title: 'Sexual Harassment at Workplace',
      citation: 'AIR 1997 SC 3011',
      court: 'Supreme Court of India',
      year: 1997,
      keywords: ['sexual harassment', 'workplace', 'employer', 'guidelines'],
      legalTopics: ['labour-law', 'criminal-law'],
    });

    // === LEGAL MAXIM NODES ===
    this.addNode('MAXIM-NULLUM-CRIMEN', {
      type: 'legal_maxim',
      title: 'Nullum Crimen Sine Lege',
      meaning: 'No crime without law',
      explanation: 'There can be no criminal offence unless it is defined by law',
      category: 'criminal-law',
      keywords: ['nullum crimen', 'no crime without law', 'rule of law'],
    });
    this.addNode('MAXIM-ACTUS-REA', {
      type: 'legal_maxim',
      title: 'Actus Non Facit Reum Nisi Mens Sit Rea',
      meaning: 'The act does not make the guilty unless the mind is guilty',
      explanation: 'A person is not guilty of a crime unless they have both a guilty act and a guilty mind',
      category: 'criminal-law',
      keywords: ['actus reus', 'mens rea', 'guilty mind', 'guilty act'],
    });
    this.addNode('MAXIM-NEMO-JUDEx', {
      type: 'legal_maxim',
      title: 'Nemo Judex in Causa Sua',
      meaning: 'No one shall be a judge in their own cause',
      explanation: 'A person cannot judge a case in which they have a personal interest',
      category: 'natural-justice',
      keywords: ['nemo judex', 'bias', 'natural justice', 'conflict of interest'],
    });
    this.addNode('MAXIM-AUDI-ALTERAM', {
      type: 'legal_maxim',
      title: 'Audi Alteram Partem',
      meaning: 'Hear the other side',
      explanation: 'No person should be condemned unheard; both sides must be heard',
      category: 'natural-justice',
      keywords: ['audi alteram', 'fair hearing', 'natural justice', 'right to be heard'],
    });
    this.addNode('MAXIM-ULTRA-VIRES', {
      type: 'legal_maxim',
      title: 'Ultra Vires',
      meaning: 'Beyond the powers',
      explanation: 'An act which requires legal authority but is done without it',
      category: 'administrative-law',
      keywords: ['ultra vires', 'beyond powers', 'jurisdiction', 'authority'],
    });

    // === GOVERNMENT BODY NODES ===
    this.addNode('BODY-SCI', {
      type: 'government_body',
      title: 'Supreme Court of India',
      abbreviation: 'SCI',
      established: '1950',
      jurisdiction: 'India',
      keywords: ['supreme court', 'apex court', 'article 32', 'article 136'],
    });
    this.addNode('BODY-RBI', {
      type: 'government_body',
      title: 'Reserve Bank of India',
      abbreviation: 'RBI',
      established: '1935',
      jurisdiction: 'Banking & Finance',
      keywords: ['rbi', 'banking', 'monetary policy', 'regulation'],
    });
    this.addNode('BODY-SEBI', {
      type: 'government_body',
      title: 'Securities and Exchange Board of India',
      abbreviation: 'SEBI',
      established: '1988',
      jurisdiction: 'Securities Market',
      keywords: ['sebi', 'stock market', 'securities', 'investor protection'],
    });
    this.addNode('BODY-MCA', {
      type: 'government_body',
      title: 'Ministry of Corporate Affairs',
      abbreviation: 'MCA',
      jurisdiction: 'Corporate Affairs',
      keywords: ['mca', 'company', 'corporate', 'compliance'],
    });

    // === EDGES (Relationships) ===
    // BNS replaces IPC
    this.addEdge('BNS-103', 'IPC-302', 'REPLACES', { note: 'BNS Section 103 replaces IPC Section 302 - Punishment for Murder' });

    // Constitutional interpretation links
    this.addEdge('ARTICLE-21', 'CASE-MANEKA-GANDHI-1978', 'INTERPRETS', { note: 'Procedure established by law must be fair, just, and reasonable' });
    this.addEdge('ARTICLE-21', 'CASE-PUTTASWAMY-2017', 'INTERPRETS', { note: 'Right to Privacy is fundamental under Article 21' });
    this.addEdge('ARTICLE-21', 'CASE-OLGA-TELLIS-1985', 'INTERPRETS', { note: 'Right to livelihood is part of Article 21' });
    this.addEdge('ARTICLE-19', 'CASE-SHREYA-SINGHAL-2015', 'INTERPRETS', { note: 'Section 66A IT Act struck down for violating Art 19(1)(a)' });
    this.addEdge('ARTICLE-32', 'CASE-KESAVANANDA-1973', 'INTERPRETS', { note: 'Basic Structure limits amending power under Art 32' });

    // Criminal law procedural links
    this.addEdge('BNS-103', 'BNSS-173', 'PROCEDURE_FOR', { note: 'FIR registration under BNSS 173 for murder cases' });
    this.addEdge('BNS-103', 'BSA-61', 'EVIDENCE_FOR', { note: 'Electronic evidence admissible under BSA 61 for murder trials' });
    this.addEdge('BNS-85', 'BNSS-173', 'PROCEDURE_FOR', { note: 'FIR registration for cruelty cases' });

    // Constitutional remedy links
    this.addEdge('ARTICLE-32', 'ARTICLE-226', 'REFERENCES', { note: 'Both provide writ jurisdiction - SC under Art 32, HC under Art 226' });

    // Legal maxim connections
    this.addEdge('MAXIM-NULLUM-CRIMEN', 'BNS-103', 'APPLIES_TO', { note: 'Murder must be defined in law before prosecution' });
    this.addEdge('MAXIM-ACTUS-REA', 'BNS-103', 'APPLIES_TO', { note: 'Both actus reus and mens rea required for murder conviction' });
    this.addEdge('MAXIM-NEMO-JUDEx', 'ARTICLE-14', 'APPLIES_TO', { note: 'Equality requires unbiased adjudication' });
    this.addEdge('MAXIM-AUDI-ALTERAM', 'ARTICLE-21', 'APPLIES_TO', { note: 'Fair hearing is part of procedure established by law' });
    this.addEdge('MAXIM-ULTRA-VIRES', 'ARTICLE-13', 'APPLIES_TO', { note: 'Laws inconsistent with fundamental rights are void' });

    // Government body links
    this.addEdge('BODY-SCI', 'ARTICLE-32', 'CONTAINS', { note: 'Supreme Court exercises jurisdiction under Article 32' });
    this.addEdge('BODY-SCI', 'ARTICLE-136', 'CONTAINS', { note: 'Supreme Court hears SLPs under Article 136' });
    this.addEdge('BODY-RBI', 'IT-69A', 'REFERENCES', { note: 'RBI uses IT Act provisions for digital banking regulation' });
  }

  /**
   * Add a node to the graph
   */
  addNode(id, data) {
    const node = { id, ...data, createdAt: new Date().toISOString() };
    this.nodes.set(id, node);

    // Index by keywords for search
    if (data.keywords) {
      for (const kw of data.keywords) {
        const key = kw.toLowerCase();
        if (!this.nodeIndex.has(key)) {
          this.nodeIndex.set(key, new Set());
        }
        this.nodeIndex.get(key).add(id);
      }
    }
    return node;
  }

  /**
   * Add an edge between two nodes
   */
  addEdge(sourceId, targetId, relationship, metadata = {}) {
    const edge = {
      source: sourceId,
      target: targetId,
      relationship,
      metadata,
      createdAt: new Date().toISOString(),
    };
    this.edges.push(edge);

    // Update adjacency list
    if (!this.adjacencyList.has(sourceId)) {
      this.adjacencyList.set(sourceId, []);
    }
    this.adjacencyList.get(sourceId).push(edge);

    return edge;
  }

  /**
   * Add a document to the graph
   */
  async addDocument(doc) {
    const result = { nodes: 0, edges: 0, enriched: 0 };

    // Use flatSections if available, otherwise fall back to sections
    const sections = doc?.flatSections || doc?.sections || [];
    if (!doc || sections.length === 0) return result;

    // Create document node
    const docId = doc.metadata?.citationId || `DOC-${doc.title?.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 50) || Date.now()}`;
    this.addNode(docId, {
      type: doc.type || 'act',
      title: doc.title,
      act: doc.metadata?.actTitle || doc.title,
      year: doc.year,
      authority: doc.authority,
      keywords: doc.metadata?.keywords || [],
      legalTopics: doc.metadata?.legalTopics || [],
    });
    result.nodes++;

    // Create section nodes
    for (const section of sections) {
      const sectionNum = section.number || section.id || '';
      const sectionId = `${docId}-SEC${sectionNum}`.replace(/[^a-zA-Z0-9-]/g, '-');

      // Determine node type based on document type
      let nodeType = 'section';
      if (doc.type === 'judgment') nodeType = 'landmark_case';
      else if (doc.type === 'legal_principle') nodeType = 'legal_maxim';
      else if (doc.type === 'amendment') nodeType = 'constitutional_amendment';

      this.addNode(sectionId, {
        type: nodeType,
        title: section.title,
        number: section.number,
        content: (section.content || '').slice(0, 500),
        act: doc.title,
        parent: docId,
        chapter: section.chapterNumber || section.chapter || null,
        chapterTitle: section.chapterTitle || null,
        keywords: section.keywords || section.metadata?.keywords || [],
        legalTopics: doc.metadata?.legalTopics || [],
        previousEquivalent: section.previousEquivalent || null,
        // Judgment-specific fields
        citation: section.metadata?.citation || null,
        court: section.metadata?.court || null,
        year: section.year || doc.year,
        // Maxim-specific fields
        meaning: section.metadata?.meaning || null,
        category: section.metadata?.category || null,
        // Amendment-specific fields
        amendmentNumber: section.metadata?.amendmentNumber || null,
        articlesAffected: section.metadata?.articlesAffected || null,
      });
      result.nodes++;

      // Edge: document contains section
      this.addEdge(docId, sectionId, 'CONTAINS', { act: doc.title });
      result.edges++;

      // Link to existing graph nodes by keyword matching
      this.autoLinkSection(sectionId, section, doc);

      // Link replacement references
      if (doc.metadata?.replacementReferences) {
        for (const ref of doc.metadata.replacementReferences) {
          const targetId = this.findNodeIdByText(ref.newProvision);
          if (targetId) {
            this.addEdge(sectionId, targetId, 'REFERENCES', { type: 'replacement' });
            result.edges++;
          }
        }
      }

      // Link constitutional references
      if (doc.metadata?.constitutionalLinks) {
        for (const link of doc.metadata.constitutionalLinks) {
          const targetId = this.findNodeIdByText(link.article);
          if (targetId) {
            this.addEdge(sectionId, targetId, 'REFERENCES', { type: 'constitutional' });
            result.edges++;
          }
        }
      }
    }

    result.enriched = result.edges;
    return result;
  }

  /**
   * Auto-link a section to existing graph nodes by keyword/title matching
   */
  autoLinkSection(sectionId, section, doc) {
    const sectionText = `${section.title || ''} ${section.content || ''}`.toLowerCase();
    const sectionKeywords = section.keywords || [];

    // Check for replacement references (e.g., "Previous Equivalent: IPC Section 302")
    if (section.previousEquivalent) {
      const targetId = this.findNodeIdByText(section.previousEquivalent);
      if (targetId && this.nodes.has(targetId)) {
        this.addEdge(sectionId, targetId, 'REPLACES', { note: `Replaces ${section.previousEquivalent}` });
      }
    }

    // Check for keyword matches with existing nodes
    for (const kw of sectionKeywords) {
      const kwLower = kw.toLowerCase();
      for (const [nodeId, node] of this.nodes) {
        if (nodeId === sectionId) continue;
        const nodeKeywords = (node.keywords || []).map(k => k.toLowerCase());
        const nodeTitle = (node.title || '').toLowerCase();

        // Match if keywords overlap significantly
        if (nodeKeywords.some(nk => kwLower.includes(nk) || nk.includes(kwLower)) ||
            nodeTitle.includes(kwLower) || kwLower.includes(nodeTitle)) {
          // Avoid duplicate edges
          const existingEdge = this.edges.find(
            e => e.source === sectionId && e.target === nodeId
          );
          if (!existingEdge) {
            this.addEdge(sectionId, nodeId, 'REFERENCES', {
              matchType: 'keyword',
              matchedKeyword: kw
            });
          }
        }
      }
    }

    // Check for previous equivalent in text
    const prevMatch = sectionText.match(/previous\s+equivalent[:\s]+([^\n;]+)/i);
    if (prevMatch) {
      const prevText = prevMatch[1].trim();
      const targetId = this.findNodeIdByText(prevText);
      if (targetId && this.nodes.has(targetId)) {
        this.addEdge(sectionId, targetId, 'REPLACES', { note: prevText });
      }
    }

    // Link amendments to constitutional articles
    if (doc.type === 'amendment' && section.articlesAffected) {
      for (const art of section.articlesAffected) {
        const articleId = `ARTICLE-${art}`;
        if (this.nodes.has(articleId)) {
          this.addEdge(sectionId, articleId, 'AMENDS', {
            note: `Amendment affects Article ${art}`
          });
        }
      }
    }

    // Link judgments to constitutional articles
    if (doc.type === 'judgment' && section.keywords) {
      for (const kw of section.keywords) {
        const artMatch = kw.match(/^Article\s+(\d+[A-Z]?)$/i);
        if (artMatch) {
          const articleId = `ARTICLE-${artMatch[1]}`;
          if (this.nodes.has(articleId)) {
            this.addEdge(sectionId, articleId, 'INTERPRETS', {
              note: `Judgment interprets Article ${artMatch[1]}`
            });
          }
        }
      }
    }
  }

  /**
   * Find a node by text search
   */
  findNodeIdByText(text) {
    const lower = text.toLowerCase();
    // Direct ID match
    if (this.nodes.has(text)) return text;
    // Search by title
    for (const [id, node] of this.nodes) {
      if (node.title?.toLowerCase().includes(lower) || node.act?.toLowerCase().includes(lower)) {
        return id;
      }
    }
    // Search by keywords
    for (const [kw, ids] of this.nodeIndex) {
      if (kw.includes(lower) || lower.includes(kw)) {
        return Array.from(ids)[0];
      }
    }
    return null;
  }

  /**
   * Query the knowledge graph
   */
  async query(queryText, options = {}) {
    const { maxDepth = 2, maxResults = 10 } = options;
    const queryLower = queryText.toLowerCase();
    const results = [];

    // Search nodes by keywords and title
    for (const [id, node] of this.nodes) {
      let score = 0;
      const title = (node.title || '').toLowerCase();
      const keywords = (node.keywords || []).join(' ').toLowerCase();
      const act = (node.act || '').toLowerCase();

      if (title.includes(queryLower) || queryLower.includes(title)) score += 10;
      if (keywords.includes(queryLower)) score += 5;
      if (act.includes(queryLower)) score += 3;

      // Check individual query words
      const words = queryLower.split(/\s+/);
      for (const word of words) {
        if (word.length < 3) continue;
        if (title.includes(word)) score += 2;
        if (keywords.includes(word)) score += 1;
        if (act.includes(word)) score += 1;
      }

      if (score > 0) {
        results.push({ id, node, score });
      }
    }

    // Sort by score
    results.sort((a, b) => b.score - a.score);

    // Expand top results with connected nodes
    const expandedResults = [];
    for (const r of results.slice(0, maxResults)) {
      const connections = this.getConnectedNodes(r.id, maxDepth);
      expandedResults.push({
        ...r,
        connections,
      });
    }

    return expandedResults;
  }

  /**
   * Get all connected nodes up to a given depth
   */
  getConnectedNodes(nodeId, maxDepth = 1) {
    const visited = new Set();
    const result = [];

    const traverse = (id, depth) => {
      if (depth > maxDepth || visited.has(id)) return;
      visited.add(id);

      const edges = this.adjacencyList.get(id) || [];
      for (const edge of edges) {
        const targetNode = this.nodes.get(edge.target);
        if (targetNode) {
          result.push({
            node: targetNode,
            relationship: edge.relationship,
            metadata: edge.metadata,
            depth,
          });
          traverse(edge.target, depth + 1);
        }
      }
    };

    traverse(nodeId, 1);
    return result;
  }

  /**
   * Find path between two nodes
   */
  findPath(startId, endId, maxDepth = 3) {
    const visited = new Set();
    const queue = [[startId]];

    while (queue.length > 0) {
      const path = queue.shift();
      const current = path[path.length - 1];

      if (current === endId) {
        return path.map((id, i) => {
          const node = this.nodes.get(id);
          const edge = i > 0 ? this.findEdge(path[i - 1], id) : null;
          return { id, node: node?.title, relationship: edge?.relationship };
        });
      }

      if (path.length > maxDepth) continue;
      visited.add(current);

      const edges = this.adjacencyList.get(current) || [];
      for (const edge of edges) {
        if (!visited.has(edge.target)) {
          queue.push([...path, edge.target]);
        }
      }
    }

    return [];
  }

  /**
   * Find an edge between two nodes
   */
  findEdge(sourceId, targetId) {
    return this.edges.find((e) => e.source === sourceId && e.target === targetId);
  }

  /**
   * Get graph statistics
   */
  async getStats() {
    const nodeTypes = {};
    const edgeTypes = {};

    for (const [, node] of this.nodes) {
      const type = node.type || 'unknown';
      nodeTypes[type] = (nodeTypes[type] || 0) + 1;
    }

    for (const edge of this.edges) {
      edgeTypes[edge.relationship] = (edgeTypes[edge.relationship] || 0) + 1;
    }

    return {
      totalNodes: this.nodes.size,
      totalEdges: this.edges.length,
      nodeTypes,
      edgeTypes,
      indexedKeywords: this.nodeIndex.size,
    };
  }

  /**
   * Load graph from disk
   */
  async loadGraph() {
    try {
      const graphPath = path.join(this.config.dataDir || 'data', 'knowledge-graph.json');
      if (fs.existsSync(graphPath)) {
        const data = JSON.parse(fs.readFileSync(graphPath, 'utf8'));
        if (data.nodes) {
          for (const node of data.nodes) {
            this.nodes.set(node.id, node);
            if (node.keywords) {
              for (const kw of node.keywords) {
                const key = kw.toLowerCase();
                if (!this.nodeIndex.has(key)) this.nodeIndex.set(key, new Set());
                this.nodeIndex.get(key).add(node.id);
              }
            }
          }
        }
        if (data.edges) {
          this.edges = data.edges;
          for (const edge of data.edges) {
            if (!this.adjacencyList.has(edge.source)) this.adjacencyList.set(edge.source, []);
            this.adjacencyList.get(edge.source).push(edge);
          }
        }
      }
    } catch (err) {
      // Ignore - will use defaults
    }
  }

  /**
   * Save graph to disk
   */
  async save() {
    try {
      const graphPath = path.join(this.config.dataDir || 'data', 'knowledge-graph.json');
      const data = {
        version: '2.0.0',
        lastUpdated: new Date().toISOString(),
        nodes: Array.from(this.nodes.values()),
        edges: this.edges,
      };
      fs.writeFileSync(graphPath, JSON.stringify(data, null, 2));
    } catch (err) {
      // Ignore
    }
  }
}

module.exports = LegalKnowledgeGraph;
