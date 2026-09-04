/**
 * Cross Reference Engine - Automatically discovers and enriches cross-references
 * between legal provisions, acts, sections, judgments, and legal principles
 */

const fs = require('fs');
const path = require('path');

class CrossReferenceEngine {
  constructor(config = {}) {
    this.config = config;
    this.referenceIndex = new Map(); // nodeId -> [references]
    this.reverseIndex = new Map();   // referencedBy -> [nodes]
    this.referenceTypes = {
      REPLACES: 'replaced_by',
      REPLACED_BY: 'replaces',
      AMENDS: 'amended_by',
      AMENDED_BY: 'amends',
      REFERENCED_IN: 'references',
      REFERENCES: 'referenced_by',
      DERIVES_FROM: 'derived_from',
      DERIVED_BY: 'derives',
      OVERRULES: 'overruled_by',
      OVERRULED_BY: 'overrules',
      DISTINGUISHES: 'distinguished_by',
      DISTINGUISHED_BY: 'distinguishes',
      FOLLOWS: 'followed_by',
      FOLLOWED_BY: 'follows',
      CONTRADICTS: 'contradicted_by',
      CONTRADICTED_BY: 'contradicts',
      INTERPRETS: 'interpreted_by',
      INTERPRETED_BY: 'interprets',
      APPLIES_TO: 'applied_by',
      APPLIED_BY: 'applies_to',
      PROCEDURE_FOR: 'procedure_of',
      PROCEDURE_OF: 'procedure_for',
      EVIDENCE_FOR: 'evidence_of',
      EVIDENCE_OF: 'evidence_for',
      EXCEPTION_TO: 'exception_of',
      EXCEPTION_OF: 'exception_for',
    };

    // Well-known cross-reference patterns
    this.knownReplacements = {
      'IPC Section 302': 'BNS Section 103',
      'IPC Section 304': 'BNS Section 105',
      'IPC Section 376': 'BNS Section 63',
      'IPC Section 379': 'BNS Section 303',
      'IPC Section 420': 'BNS Section 318',
      'IPC Section 498A': 'BNS Section 85',
      'CrPC Section 154': 'BNSS Section 173',
      'CrPC Section 438': 'BNSS Section 482',
      'CrPC Section 302': 'BNSS Section 335',
      'CrPC Section 437': 'BNSS Section 480',
      'Evidence Act Section 65B': 'BSA Section 61',
      'Evidence Act Section 32': 'BSA Section 26',
      'Evidence Act Section 14': 'BSA Section 12',
    };

    // Constitutional provisions linked to landmark cases
    this.constitutionalLinks = {
      'Article 14': ['Maneka Gandhi (1978)', 'E.P. Royappa (1974)', 'Navnit Kumar (1954)'],
      'Article 19': ['Shreya Singhal (2015)', 'S. Rangarajan (1989)', 'Indian Express (1978)'],
      'Article 21': ['Maneka Gandhi (1978)', 'Puttaswamy (2017)', 'Gopalan (1950)', 'Olga Tellis (1985)'],
      'Article 32': ['Kesavananda Bharati (1973)', 'Minerva Mills (1980)'],
      'Article 136': ['S.P. Gupta (1982)'],
      'Article 226': ['Tata Cellular (1994)'],
      'Article 21A': ['Unni Krishnan (1993)'],
      'Article 25': ['Shirur Mutt (1954)'],
      'Article 26': ['S.P. Gupta (1961)'],
      'Article 30': ['St. Stephen\'s College (1992)'],
      'Article 370': ['In Re Article 370 (2023)'],
      'Article 372': ['Venkataramana (1951)'],
      'Article 395': ['Kesavananda Bharati (1973)'],
      'Article 142': ['Supreme Court Bar Association (1998)'],
      'Article 72': ['Kehar Singh (1988)'],
      'Article 137': ['Parsa Devi (2000)'],
    };
  }

  /**
   * Enrich a document with cross-references
   */
  async enrich(doc) {
    const enrichedDoc = { ...doc };

    // 1. Detect statutory cross-references from text
    const textRefs = this.detectTextReferences(doc);
    enrichedDoc.metadata.crossReferencesDetected = textRefs;

    // 2. Add known replacement mappings
    enrichedDoc.metadata.replacementReferences = this.findReplacements(doc);

    // 3. Add constitutional links if this is a constitutional provision
    enrichedDoc.metadata.constitutionalLinks = this.findConstitutionalLinks(doc);

    // 4. Add inter-act references
    enrichedDoc.metadata.interActReferences = this.findInterActReferences(doc);

    // 5. Index this document for future lookups
    this.indexDocument(doc);

    return enrichedDoc;
  }

  /**
   * Detect cross-references from text content
   */
  detectTextReferences(doc) {
    const allText = this.getAllText(doc);
    const refs = [];

    // Pattern: "Section X of the Y Act, Z"
    const secPatterns = [
      /(?:under|as per|in accordance with|pursuant to|subject to|notwithstanding)\s+(?:Section\s+(\d+[A-Za-z]?)\s+of\s+(?:the\s+)?([A-Z][^.]+?Act[,]?\s*(?:\d{4})?))/gi,
      /(?:Section\s+(\d+[A-Za-z]?)\s+(?:of|under)\s+(?:the\s+)?([A-Z][^.]+?Act[,]?\s*(?:\d{4})?))/gi,
    ];

    for (const pattern of secPatterns) {
      let match;
      while ((match = pattern.exec(allText)) !== null) {
        refs.push({
          type: 'statutory',
          reference: match[0].trim(),
          section: match[1],
          act: match[2]?.trim(),
          confidence: 0.9,
        });
      }
    }

    // Pattern: "Article X of the Constitution"
    const artPattern = /(?:Article|Art\.?)\s+(\d+[A-Za-z]?)\s+(?:of|under)\s+(?:the\s+)?(?:Constitution)/gi;
    let artMatch;
    while ((artMatch = artPattern.exec(allText)) !== null) {
      refs.push({
        type: 'constitutional',
        reference: artMatch[0].trim(),
        article: artMatch[1],
        confidence: 0.95,
      });
    }

    // Pattern: Case citations - "AIR YYYY SC/ZH ..."
    const casePattern = /(?:AIR|SCR|[(]\d{4}[)])\s*\d+\s*(?:SC|HC|Del|Bom|Cal|Mad|Karn)/gi;
    let caseMatch;
    while ((caseMatch = casePattern.exec(allText)) !== null) {
      refs.push({
        type: 'case_citation',
        reference: caseMatch[0].trim(),
        confidence: 0.85,
      });
    }

    // Pattern: Rule references
    const rulePattern = /(?:Rule|Regulation)\s+(\d+[A-Za-z]?)\s+(?:of|under)\s+(?:the\s+)?([A-Z][^.]+?(?:Rules|Regulations)[^,]*(?:\d{4})?)/gi;
    let ruleMatch;
    while ((ruleMatch = rulePattern.exec(allText)) !== null) {
      refs.push({
        type: 'regulatory',
        reference: ruleMatch[0].trim(),
        rule: ruleMatch[1],
        regulation: ruleMatch[2]?.trim(),
        confidence: 0.85,
      });
    }

    return refs;
  }

  /**
   * Find replacement references (old law → new law)
   */
  findReplacements(doc) {
    const replacements = [];
    const allText = this.getAllText(doc);

    for (const [old, replacement] of Object.entries(this.knownReplacements)) {
      if (allText.toLowerCase().includes(old.toLowerCase()) || allText.toLowerCase().includes(replacement.toLowerCase())) {
        replacements.push({
          oldProvision: old,
          newProvision: replacement,
          type: 'replacement',
          confidence: 1.0,
        });
      }
    }

    return replacements;
  }

  /**
   * Find constitutional links
   */
  findConstitutionalLinks(doc) {
    const links = [];
    const allText = this.getAllText(doc);

    for (const [article, cases] of Object.entries(this.constitutionalLinks)) {
      if (allText.includes(article)) {
        links.push({
          article,
          landmarkCases: cases,
          type: 'constitutional_interpretation',
          confidence: 0.9,
        });
      }
    }

    return links;
  }

  /**
   * Find inter-act references
   */
  findInterActReferences(doc) {
    const refs = [];
    const allText = this.getAllText(doc);

    const acts = [
      'Indian Contract Act', 'Transfer of Property Act', 'Specific Relief Act',
      'Limitation Act', 'Arbitration Act', 'Civil Procedure Code',
      'Code of Criminal Procedure', 'Code of Civil Procedure',
      'Indian Penal Code', 'Indian Evidence Act', 'Information Technology Act',
      'Consumer Protection Act', 'Motor Vehicles Act', 'Right to Information Act',
      'Bharatiya Nyaya Sanhita', 'Bharatiya Nagarik Suraksha Sanhita',
      'Bharatiya Sakshya Adhiniyam', 'Companies Act', 'Income Tax Act',
      'Environment Protection Act', 'Hindu Marriage Act', 'Muslim Personal Law',
    ];

    for (const act of acts) {
      if (allText.includes(act)) {
        refs.push({
          act,
          type: 'inter_act_reference',
          confidence: 0.8,
        });
      }
    }

    return refs;
  }

  /**
   * Index a document for future lookups
   */
  indexDocument(doc) {
    const nodeId = doc.metadata?.citationId || doc.title || 'unknown';
    const refs = doc.metadata?.crossReferencesDetected || [];

    if (refs.length > 0) {
      this.referenceIndex.set(nodeId, refs);

      // Build reverse index
      for (const ref of refs) {
        const key = ref.act || ref.article || ref.reference;
        if (key) {
          if (!this.reverseIndex.has(key)) {
            this.reverseIndex.set(key, []);
          }
          this.reverseIndex.get(key).push(nodeId);
        }
      }
    }
  }

  /**
   * Find all documents that reference a given node
   */
  findReferencedBy(nodeId) {
    return this.reverseIndex.get(nodeId) || [];
  }

  /**
   * Find all references from a given node
   */
  findReferences(nodeId) {
    return this.referenceIndex.get(nodeId) || [];
  }

  /**
   * Find path between two provisions
   */
  findPath(fromNode, toNode) {
    // Direct reference
    const refs = this.referenceIndex.get(fromNode) || [];
    for (const ref of refs) {
      const target = ref.act || ref.article || ref.reference;
      if (target && target.includes(toNode)) {
        return [{ from: fromNode, to: toNode, type: 'direct', ref }];
      }
    }

    // 2-hop via reverse index
    const reverseRefs = this.reverseIndex.get(fromNode) || [];
    for (const intermediate of reverseRefs) {
      const forwardRefs = this.referenceIndex.get(intermediate) || [];
      for (const ref of forwardRefs) {
        const target = ref.act || ref.article || ref.reference;
        if (target && target.includes(toNode)) {
          return [
            { from: fromNode, to: intermediate, type: 'referenced_by' },
            { from: intermediate, to: toNode, type: 'references', ref },
          ];
        }
      }
    }

    return [];
  }

  /**
   * Get all text from document
   */
  getAllText(doc) {
    const parts = [];
    if (doc.title) parts.push(doc.title);
    if (doc.content) parts.push(doc.content);
    if (doc.metadata?.actTitle) parts.push(doc.metadata.actTitle);
    if (doc.flatSections) {
      for (const s of doc.flatSections) {
        if (s.title) parts.push(s.title);
        if (s.content) parts.push(s.content);
      }
    }
    if (doc.hierarchy) {
      const extractFromNodes = (nodes) => {
        for (const n of nodes) {
          if (n.title) parts.push(n.title);
          if (n.content) parts.push(n.content);
          if (n.children) extractFromNodes(n.children);
        }
      };
      extractFromNodes(doc.hierarchy);
    }
    return parts.join(' ');
  }

  /**
   * Export cross-reference statistics
   */
  getStats() {
    return {
      indexedNodes: this.referenceIndex.size,
      totalReferences: Array.from(this.referenceIndex.values()).reduce((sum, refs) => sum + refs.length, 0),
      reverseIndexEntries: this.reverseIndex.size,
      knownReplacements: Object.keys(this.knownReplacements).length,
      constitutionalLinks: Object.keys(this.constitutionalLinks).length,
    };
  }
}

module.exports = CrossReferenceEngine;
