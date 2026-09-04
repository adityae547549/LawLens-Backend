/**
 * Metadata Extractor - Rich metadata extraction for every legal provision
 * Extracts: Act, Year, Part, Chapter, Section, Clause, Title, Definitions,
 * Keywords, Legal Topics, Related Acts, Amendment History, Effective Date,
 * Source URL, Citation ID, Cross References
 */

class MetadataExtractor {
  constructor(config = {}) {
    this.config = config;

    // Legal topic keywords for classification
    this.topicKeywords = {
      'criminal-law': ['murder', 'theft', 'robbery', 'fraud', 'assault', 'kidnapping', 'culpable homicide', 'cheating', 'criminal', 'offence', 'punishment', 'bail', 'fir', 'cognizable', 'non-cognizable', 'arrest', 'bns', 'ipc', 'bnss', 'bsa'],
      'constitutional-law': ['fundamental rights', 'directive principles', 'constitution', 'amendment', 'article', 'part iii', 'part iv', 'writ', 'habeas corpus', 'mandamus', 'prohibition', 'certiorari', 'quo warranto', 'basic structure'],
      'contract-law': ['agreement', 'consideration', 'contract', 'void', 'voidable', 'breach', 'damages', 'specific performance', 'indemnity', 'guarantee', 'agency', 'partnership'],
      'property-law': ['transfer', 'sale', 'mortgage', 'lease', 'gift', 'easement', 'property', 'immovable', 'registration', 'conveyance', 'title', 'possession', 'ownership'],
      'family-law': ['marriage', 'divorce', 'maintenance', 'custody', 'adoption', 'succession', 'partition', 'guardian', 'minor', 'hindu', 'muslim', 'christian', 'parsi', 'dowry', 'domestic violence'],
      'labour-law': ['employment', 'worker', 'employer', 'wages', 'strike', 'lockout', 'industrial dispute', 'epf', 'esi', 'gratuity', 'bonus', 'contract labour', 'factory'],
      'tax-law': ['income tax', 'gst', 'customs', 'excise', 'service tax', 'assessment', 'return', 'deduction', 'exemption', 'penalty', 'appeal', 'tribunal'],
      'environment-law': ['pollution', 'environment', 'forest', 'wildlife', 'conservation', 'emission', 'effluent', 'hazardous', 'waste', 'green tribunal', 'eia'],
      'consumer-law': ['consumer', 'complaint', 'deficiency', 'unfair trade', 'price', 'defect', 'goods', 'services', 'commission', 'district forum', 'national commission'],
      'cyber-law': ['electronic', 'digital', 'cyber', 'computer', 'data', 'privacy', 'hacking', 'phishing', 'identity theft', 'electronic signature', 'data protection'],
      'corporate-law': ['company', 'director', 'shareholder', 'board', 'annual return', 'accounts', 'audit', 'winding up', 'merger', 'amalgamation', 'incorporation', 'mca'],
      'rti': ['information', 'public authority', 'disclosure', 'transparency', 'rti', 'second appeals', 'cic', 'sicc'],
      'evidence-law': ['evidence', 'admissibility', 'proof', 'witness', 'examination', 'cross-examination', 'document', 'expert', 'electronic evidence', 'presumption'],
      'procedural-law': ['jurisdiction', 'procedure', 'appeal', 'revision', 'review', 'limitation', 'pleading', 'trial', 'summons', 'warrant', 'execution', 'decree', 'order'],
    };

    // Common legal abbreviations
    this.abbreviations = {
      'sc': 'Supreme Court',
      'hc': 'High Court',
      'dlhc': 'Delhi High Court',
      'bomhc': 'Bombay High Court',
      'calhc': 'Calcutta High Court',
      'mahec': 'Madras High Court',
      'karnhc': 'Karnataka High Court',
      'sc': 'Supreme Court',
      'cji': 'Chief Justice of India',
      'art': 'Article',
      'sec': 'Section',
      'cl': 'Clause',
      'sub-cl': 'Sub-clause',
      'proviso': 'Proviso',
      'sch': 'Schedule',
      'pts': 'Part',
      'chap': 'Chapter',
    };
  }

  /**
   * Extract metadata from parsed and hierarchy-built document
   */
  async extract(hierarchyDoc, source) {
    const doc = { ...hierarchyDoc };

    // Base metadata from source
    doc.metadata = doc.metadata || {};
    doc.metadata.sourceId = source.id;
    doc.metadata.sourceName = source.name;
    doc.metadata.authority = source.authority;
    doc.metadata.documentType = source.documentType;
    doc.metadata.sourceUrl = source.sourceUrl;
    doc.metadata.effectiveDate = source.effectiveDate;
    doc.metadata.tags = source.tags || [];

    // Extract from document title
    if (doc.title) {
      doc.metadata.actTitle = doc.title;
      doc.metadata.year = doc.year || this.extractYear(doc.title);
      doc.metadata.shortTitle = this.extractShortTitle(doc.title);
    }

    // Extract keywords and topics
    doc.metadata.keywords = this.extractKeywords(doc);
    doc.metadata.legalTopics = this.classifyTopics(doc);

    // Extract definitions if present
    doc.metadata.definitions = this.extractDefinitions(doc);

    // Extract cross-references to other acts
    doc.metadata.crossReferences = this.extractCrossReferences(doc);

    // Extract amendment history
    doc.metadata.amendmentHistory = this.extractAmendmentHistory(doc);

    // Generate citation ID
    doc.metadata.citationId = this.generateCitationId(doc, source);

    // Enrich each section with metadata
    if (doc.flatSections) {
      doc.flatSections = doc.flatSections.map((section) => ({
        ...section,
        metadata: {
          ...section.metadata,
          ...this.extractSectionMetadata(section, doc),
        },
      }));
    }

    // Enrich hierarchy nodes
    if (doc.hierarchy) {
      doc.hierarchy = this.enrichHierarchyMetadata(doc.hierarchy, doc);
    }

    return doc;
  }

  /**
   * Extract keywords from document content
   */
  extractKeywords(doc) {
    const allText = this.getAllText(doc).toLowerCase();
    const keywords = new Set();

    // Extract legal terms
    const legalTerms = allText.match(/\b(?:section|article|clause|proviso|schedule|part|chapter|sub-section|sub-clause|explanation|illustration|exception|definition|amendment|repeal|substitution|insertion|omission|deemed)\b/gi) || [];
    legalTerms.forEach((t) => keywords.add(t.toLowerCase()));

    // Extract act references
    const actRefs = allText.match(/\b(?:act|rules|regulations|notification|circular|order|ordinance|bill)\s*(?:\d{4})?\b/gi) || [];
    actRefs.forEach((a) => keywords.add(a.trim().toLowerCase()));

    // Extract section references
    const secRefs = allText.match(/section\s+\d+[a-z]?/gi) || [];
    secRefs.forEach((s) => keywords.add(s.toLowerCase()));

    // Extract article references
    const artRefs = allText.match(/article\s+\d+[a-z]?/gi) || [];
    artRefs.forEach((a) => keywords.add(a.toLowerCase()));

    return Array.from(keywords).slice(0, 50);
  }

  /**
   * Classify document into legal topics
   */
  classifyTopics(doc) {
    const allText = this.getAllText(doc).toLowerCase();
    const scores = {};

    for (const [topic, keywords] of Object.entries(this.topicKeywords)) {
      let score = 0;
      for (const kw of keywords) {
        const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        const matches = allText.match(regex);
        if (matches) score += matches.length;
      }
      if (score > 0) scores[topic] = score;
    }

    // Sort by score and return top topics
    return Object.entries(scores)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([topic]) => topic);
  }

  /**
   * Extract definitions from document
   */
  extractDefinitions(doc) {
    const definitions = [];
    const allText = this.getAllText(doc);

    // Pattern: "X means..." or "X includes..." or "X shall mean..."
    const defPatterns = [
      /(?:^|\n)\s*(?:["""]?)([^"""]+)(?:["""]?)\s*(?:means|shall mean|includes|includes, without limitation|means and includes)\s*([^.]+\.)/gi,
      /(?:^|\n)\s*(?:\d+[A-Za-z]?\.\s*)?["""]?([^"""]+)["""]?\s*(?:means|shall mean)\s*([^.]+\.)/gi,
    ];

    for (const pattern of defPatterns) {
      let match;
      while ((match = pattern.exec(allText)) !== null) {
        definitions.push({
          term: match[1].trim(),
          definition: match[2].trim(),
        });
      }
    }

    // Also check flat sections for definitions
    if (doc.flatSections) {
      for (const section of doc.flatSections) {
        if (section.type === 'section' || section.type === 'clause') {
          const title = (section.title || '').toLowerCase();
          if (title.includes('definition') || title.includes('interpretation')) {
            // Extract inline definitions
            const text = section.content || '';
            const inlineDefs = text.match(/["""]([^"""]+)["""]\s*(?:means|shall mean)\s*([^.]+\.)/gi) || [];
            for (const d of inlineDefs) {
              const parts = d.match(/["""]([^"""]+)["""]\s*(?:means|shall mean)\s*(.+)/i);
              if (parts) {
                definitions.push({
                  term: parts[1].trim(),
                  definition: parts[2].trim(),
                  source: `Section ${section.number}`,
                });
              }
            }
          }
        }
      }
    }

    return definitions;
  }

  /**
   * Extract cross-references to other acts/provisions
   */
  extractCrossReferences(doc) {
    const allText = this.getAllText(doc);
    const refs = new Set();

    // Pattern: "under Section X of the Y Act"
    const patterns = [
      /(?:under|as per|in accordance with|pursuant to|subject to)\s+(?:Section\s+(\d+[A-Za-z]?)\s+of\s+(?:the\s+)?([A-Z][^.]+?Act[,]?\s*\d{4}))/gi,
      /(?:Section\s+(\d+[A-Za-z]?)\s+of\s+(?:the\s+)?([A-Z][^.]+?Act[,]?\s*\d{4}))/gi,
      /(?:Article\s+(\d+[A-Za-z]?)\s+(?:of|under)\s+(?:the\s+)?(?:Constitution))/gi,
      /(?:clause\s+\(\d+\)\s+of\s+section\s+(\d+[A-Za-z]?)\s+of\s+(?:the\s+)?([A-Z][^.]+?Act[,]?\s*\d{4}))/gi,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(allText)) !== null) {
        refs.add({
          reference: match[0].trim(),
          section: match[1] || null,
          act: match[2] || null,
          type: match[0].startsWith('Article') ? 'constitutional' : 'statutory',
        });
      }
    }

    return Array.from(refs);
  }

  /**
   * Extract amendment history
   */
  extractAmendmentHistory(doc) {
    const amendments = [];
    const allText = this.getAllText(doc);

    // Pattern: "Amended by..." or "Substituted by..." or "Inserted by..."
    const patterns = [
      /(?:amended|substituted|inserted|omitted|repealed|re-enacted)\s+by\s+([^.\n]+(?:Act[,]?\s*\d{4}|Ordinance[,]\s*\d{4}|Notification))/gi,
      /(?:w\.e\.f\.|with effect from)\s+(\d{1,2}[.\-/]\d{1,2}[.\-/]\d{4}|\d{4})/gi,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(allText)) !== null) {
        amendments.push({
          text: match[0].trim(),
          action: match[1]?.trim() || null,
        });
      }
    }

    return amendments;
  }

  /**
   * Generate a unique citation ID
   */
  generateCitationId(doc, source) {
    const year = doc.year || new Date().getFullYear();
    const title = doc.title || source.name;
    const shortTitle = this.extractShortTitle(title);
    return `${shortTitle} ${year}`.replace(/\s+/g, ' ').trim();
  }

  /**
   * Extract short title from full title
   */
  extractShortTitle(title) {
    if (!title) return 'Untitled';
    // Remove year in parentheses
    let short = title.replace(/\s*[\(,]?\s*\d{4}\s*[\),]?\s*$/, '').trim();
    // Remove common prefixes
    short = short.replace(/^(?:The\s+)/i, '');
    // Remove "Act" suffix for short title
    short = short.replace(/\s+Act\s*$/i, '');
    return short.trim();
  }

  /**
   * Extract year from title or text
   */
  extractYear(text) {
    if (!text) return null;
    const yearMatch = text.match(/\b(1[89]\d{2}|20[0-2]\d)\b/);
    return yearMatch ? parseInt(yearMatch[1]) : null;
  }

  /**
   * Extract metadata for a single section
   */
  extractSectionMetadata(section, doc) {
    const metadata = {
      actTitle: doc.metadata?.actTitle || doc.title,
      year: doc.year,
      citationId: doc.metadata?.citationId,
      sourceUrl: doc.metadata?.sourceUrl,
    };

    // Extract section-level keywords
    const text = (section.content || '').toLowerCase();
    const keywords = [];
    for (const [topic, kws] of Object.entries(this.topicKeywords)) {
      for (const kw of kws) {
        if (text.includes(kw)) keywords.push(kw);
      }
    }
    metadata.keywords = keywords.slice(0, 20);

    // Extract section-level definitions
    metadata.hasDefinitions = /(?:means|shall mean|includes)/i.test(section.content || '');

    // Extract section-level cross-references
    metadata.hasCrossReferences = /(?:under|as per|Section\s+\d+\s+of)/i.test(section.content || '');

    return metadata;
  }

  /**
   * Enrich hierarchy nodes with metadata
   */
  enrichHierarchyMetadata(nodes, doc) {
    return nodes.map((node) => ({
      ...node,
      metadata: {
        ...node.metadata,
        actTitle: doc.metadata?.actTitle || doc.title,
        year: doc.year,
        citationId: doc.metadata?.citationId,
      },
      children: node.children ? this.enrichHierarchyMetadata(node.children, doc) : [],
    }));
  }

  /**
   * Get all text from document for analysis
   */
  getAllText(doc) {
    const parts = [];
    if (doc.title) parts.push(doc.title);
    if (doc.content) parts.push(doc.content);
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
}

module.exports = MetadataExtractor;
