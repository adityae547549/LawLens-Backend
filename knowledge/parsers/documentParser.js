/**
 * Document Parser - Hierarchy-preserving parser for legal documents
 * Supports multiple source types: IndiaCode, SCI, eGazette, RBI, SEBI, etc.
 * Never flattens legal hierarchy
 */

const fs = require('fs');
const path = require('path');

class DocumentParser {
  constructor(config = {}) {
    this.config = config;
    this.parsers = {
      indiacode: new IndiaCodeParser(config),
      sci: new SCIParser(config),
      egazette: new EGazetteParser(config),
      rbi: new RBIParser(config),
      sebi: new SEBIParser(config),
      mca: new MCAParser(config),
      cbic: new CBICParser(config),
      cbdt: new CBDTParser(config),
    };
  }

  /**
   * Parse a document based on its source type
   */
  async parse(document, source) {
    const parserName = source.parser || 'indiacode';
    const parser = this.parsers[parserName];

    if (!parser) {
      throw new Error(`No parser available for type: ${parserName}`);
    }

    // If document is already structured JSON from local file
    if (document && typeof document === 'object' && !Buffer.isBuffer(document)) {
      return parser.parseStructured(document, source);
    }

    // If document is raw buffer/content
    return parser.parseRaw(document, source);
  }
}

/**
 * Parser for India Code (indiacode.nic.in) documents
 */
class IndiaCodeParser {
  constructor(config) {
    this.config = config;
  }

  async parseStructured(data, source) {
    // Handle structured JSON from our local data files
    // Data can be: single object with sections, array of chapters, or object with chapters array
    const result = {
      type: 'act',
      sourceId: source.id,
      title: data.name || data.title || source.name || data.act,
      authority: source.authority,
      year: data.year || this.extractYear(data.name || source.name || data.act),
      effectiveDate: source.effectiveDate,
      sections: [],
      metadata: {},
      raw: data,
    };

    // Detect data format and parse accordingly
    if (Array.isArray(data)) {
      // Check if it's landmark cases format
      if (data.length > 0 && data[0].case && data[0].citation) {
        result.type = 'judgment';
        result.sections = this.parseLandmarkCases(data, source);
      }
      // Check if it's legal maxims format
      else if (data.length > 0 && data[0].maxim && data[0].meaning) {
        result.type = 'legal_principle';
        result.sections = this.parseLegalMaxims(data, source);
      }
      // Check if it's constitutional amendments format
      else if (data.length > 0 && data[0].num && data[0].title && data[0].summary) {
        result.type = 'amendment';
        result.sections = this.parseConstitutionalAmendments(data, source);
      }
      // Otherwise treat as chapter array
      else {
        result.sections = this.parseChapterArray(data, source);
      }
    } else if (Array.isArray(data.sections)) {
      result.sections = data.sections.map((s) => this.parseSection(s, source));
    } else if (data.provisions) {
      result.sections = this.parseProvisions(data.provisions, source);
    } else if (data.chapters) {
      result.sections = this.parseChapters(data.chapters, source);
    }

    // Extract preamble if present
    if (data.preamble) {
      result.metadata.preamble = data.preamble;
    }

    // Extract definitions section
    if (data.definitions) {
      result.metadata.definitions = data.definitions;
    }

    // Extract schedules
    if (data.schedules) {
      result.schedules = data.schedules.map((s) => ({
        number: s.number || s.id,
        title: s.title,
        content: s.content,
      }));
    }

    return result;
  }

  async parseRaw(buffer, source) {
    let text;
    if (Buffer.isBuffer(buffer)) {
      text = buffer.toString('utf8');
    } else {
      text = String(buffer);
    }

    // Try to parse as JSON first
    try {
      const data = JSON.parse(text);
      return this.parseStructured(data, source);
    } catch {
      // Parse as plain text
      return this.parsePlainText(text, source);
    }
  }

  parsePlainText(text, source) {
    const result = {
      type: 'act',
      sourceId: source.id,
      title: source.name,
      authority: source.authority,
      year: this.extractYear(source.name),
      effectiveDate: source.effectiveDate,
      sections: [],
      metadata: {},
    };

    // Split by section patterns
    const sectionPattern = /\n\s*(?:Section\s+)?(\d+[A-Za-z]?)\.\s+(.+)/gi;
    const lines = text.split('\n');
    let currentSection = null;
    let currentContent = [];

    for (const line of lines) {
      const sectionMatch = line.match(sectionPattern);
      if (sectionMatch) {
        if (currentSection) {
          currentSection.content = currentContent.join('\n').trim();
          result.sections.push(currentSection);
        }
        currentSection = {
          number: sectionMatch[1],
          title: sectionMatch[2].trim(),
          content: '',
          subsections: [],
        };
        currentContent = [];
      } else if (currentSection) {
        currentContent.push(line);
      }
    }

    if (currentSection) {
      currentSection.content = currentContent.join('\n').trim();
      result.sections.push(currentSection);
    }

    return result;
  }

  parseSection(sectionData, source) {
    const section = {
      number: sectionData.number || sectionData.num || sectionData.id || sectionData.section_number,
      title: sectionData.title || sectionData.heading || sectionData.short_title || '',
      content: sectionData.content || sectionData.text || sectionData.body || '',
      keywords: sectionData.keywords || sectionData.key_topics || sectionData.key_offenses || [],
      previousEquivalent: sectionData.previousEquivalent || sectionData.previous_equivalent || null,
      subsections: [],
      clauses: [],
      explanations: [],
      illustrations: [],
      exceptions: [],
    };

    // Parse subsections
    if (sectionData.subsections || sectionData.sub_sections) {
      const subs = sectionData.subsections || sectionData.sub_sections;
      section.subsections = Array.isArray(subs)
        ? subs.map((s) => ({
            number: s.number || s.id,
            content: s.content || s.text || s.body || '',
          }))
        : [];
    }

    // Parse clauses
    if (sectionData.clauses) {
      section.clauses = Array.isArray(sectionData.clauses)
        ? sectionData.clauses.map((c) => ({
            letter: c.letter || c.id,
            content: c.content || c.text || '',
          }))
        : [];
    }

    // Parse explanations
    if (sectionData.explanations) {
      section.explanations = Array.isArray(sectionData.explanations)
        ? sectionData.explanations.map((e) => ({
            number: e.number,
            content: e.content || e.text || '',
          }))
        : [];
    }

    // Parse illustrations
    if (sectionData.illustrations) {
      section.illustrations = Array.isArray(sectionData.illustrations)
        ? sectionData.illustrations.map((i) => ({
            number: i.number,
            content: i.content || i.text || '',
          }))
        : [];
    }

    // Parse exceptions
    if (sectionData.exceptions) {
      section.exceptions = Array.isArray(sectionData.exceptions)
        ? sectionData.exceptions.map((e) => ({
            content: e.content || e.text || '',
          }))
        : [];
    }

    return section;
  }

  parseProvisions(provisions, source) {
    return provisions.map((p) => this.parseSection(p, source));
  }

  /**
   * Parse landmark cases format
   * Format: [{ case, citation, court, year, facts, issues, decision, ratioDecidendi, articles, topics, quotations }]
   */
  parseLandmarkCases(cases, source) {
    return cases.map((c) => {
      // Build a comprehensive text from all case fields
      const parts = [];
      if (c.case) parts.push(`Case: ${c.case}`);
      if (c.citation) parts.push(`Citation: ${c.citation}`);
      if (c.court) parts.push(`Court: ${c.court}`);
      if (c.bench) parts.push(`Bench: ${c.bench}`);
      if (c.year) parts.push(`Year: ${c.year}`);
      if (c.facts) parts.push(`Facts: ${c.facts}`);
      if (c.issues) parts.push(`Issues: ${Array.isArray(c.issues) ? c.issues.join('; ') : c.issues}`);
      if (c.decision) parts.push(`Decision: ${c.decision}`);
      if (c.ratioDecidendi) parts.push(`Ratio Decidendi: ${c.ratioDecidendi}`);
      if (c.quotations) parts.push(`Key Quotation: ${Array.isArray(c.quotations) ? c.quotations.join(' ') : c.quotations}`);

      return {
        number: c.case?.split('(')[0]?.trim() || c.citation || 'Unknown',
        title: c.case || 'Landmark Case',
        content: parts.join('\n\n'),
        keywords: [...(c.topics || []), ...(c.articles || []).map(a => `Article ${a}`)],
        chapterTitle: 'Landmark Judgments',
        actTitle: source.name,
        year: c.year,
        metadata: {
          citation: c.citation,
          court: c.court,
          bench: c.bench,
          date: c.date,
          facts: c.facts,
          issues: c.issues,
          decision: c.decision,
          ratioDecidendi: c.ratioDecidendi,
          articles: c.articles,
          topics: c.topics,
          quotations: c.quotations,
        },
      };
    });
  }

  /**
   * Parse legal maxims format
   * Format: [{ maxim, meaning, explanation, category, usage }]
   */
  parseLegalMaxims(maxims, source) {
    return maxims.map((m) => {
      const parts = [];
      if (m.maxim) parts.push(`Legal Maxim: ${m.maxim}`);
      if (m.meaning) parts.push(`Meaning: ${m.meaning}`);
      if (m.explanation) parts.push(`Explanation: ${m.explanation}`);
      if (m.usage) parts.push(`Usage: ${m.usage}`);

      return {
        number: m.maxim?.slice(0, 50) || 'Unknown Maxim',
        title: m.maxim || 'Legal Maxim',
        content: parts.join('\n\n'),
        keywords: [m.category, m.meaning?.split(' ').slice(0, 5).join(' ')].filter(Boolean),
        chapterTitle: 'Legal Maxims & Principles',
        actTitle: source.name,
        metadata: {
          maxim: m.maxim,
          meaning: m.meaning,
          explanation: m.explanation,
          category: m.category,
          usage: m.usage,
        },
      };
    });
  }

  /**
   * Parse constitutional amendments format
   * Format: [{ num, year, title, summary, category, articles_affected }]
   */
  parseConstitutionalAmendments(amendments, source) {
    return amendments.map((a) => {
      const parts = [];
      if (a.title) parts.push(`Amendment: ${a.title}`);
      if (a.year) parts.push(`Year: ${a.year}`);
      if (a.summary) parts.push(`Summary: ${a.summary}`);
      if (a.articles_affected && a.articles_affected.length > 0) {
        parts.push(`Articles Affected: ${a.articles_affected.join(', ')}`);
      }

      return {
        number: a.title || `Amendment ${a.num}`,
        title: a.title || `Amendment ${a.num}`,
        content: parts.join('\n\n'),
        keywords: [...(a.articles_affected || []).map(art => `Article ${art}`), 'constitutional amendment', `amendment ${a.num}`],
        chapterTitle: 'Constitutional Amendments',
        actTitle: source.name,
        year: a.year,
        metadata: {
          amendmentNumber: a.num,
          year: a.year,
          title: a.title,
          summary: a.summary,
          category: a.category,
          articlesAffected: a.articles_affected,
        },
      };
    });
  }

  /**
   * Parse array of chapters (each chapter has sections array)
   * Format: [{ act, chapter, title, sections: [{ num, title, text, ... }] }]
   */
  parseChapterArray(chapters, source) {
    const sections = [];
    for (const chapter of chapters) {
      const chapterTitle = chapter.chapter || chapter.title || '';
      const chapterName = chapter.title || '';

      // Extract sections from this chapter
      const chapterSections = chapter.sections || [];
      for (const s of chapterSections) {
        const section = this.parseSection(s, source);
        // Add chapter context
        section.chapterNumber = chapter.chapter || null;
        section.chapterTitle = chapterName || null;
        section.actTitle = chapter.act || source.name || null;
        section.year = chapter.year || source.effectiveDate?.split('-')[0] || null;
        sections.push(section);
      }
    }
    return sections;
  }

  parseChapters(chapters, source) {
    const sections = [];
    for (const chapter of chapters) {
      const chapterSections = chapter.sections || chapter.provisions || [];
      for (const s of chapterSections) {
        const section = this.parseSection(s, source);
        section.chapter = chapter.title || chapter.name;
        section.chapterNumber = chapter.number || chapter.id;
        sections.push(section);
      }
    }
    return sections;
  }

  extractYear(name) {
    const yearMatch = name?.match(/(\d{4})/);
    return yearMatch ? parseInt(yearMatch[1]) : null;
  }
}

/**
 * Parser for Supreme Court of India documents
 */
class SCIParser {
  constructor(config) {
    this.config = config;
  }

  async parseStructured(data, source) {
    return {
      type: 'judgment',
      sourceId: source.id,
      title: data.title || data.caseName || 'Untitled Judgment',
      authority: source.authority,
      year: data.year || data.decisionDate?.split('-')[0],
      court: 'Supreme Court of India',
      bench: data.bench || [],
      citations: data.citations || [],
      sections: data.paragraphs || [],
      metadata: {
        caseNumber: data.caseNumber,
        decisionDate: data.decisionDate,
        petitioner: data.petitioner,
        respondent: data.respondent,
        judge: data.judge,
        bench: data.bench,
        citedBy: data.citedBy,
        overruledBy: data.overruledBy,
        distinguishedBy: data.distinguishedBy,
      },
      raw: data,
    };
  }

  async parseRaw(buffer, source) {
    let text;
    if (Buffer.isBuffer(buffer)) {
      text = buffer.toString('utf8');
    } else {
      text = String(buffer);
    }
    return this.parseStructured({ raw: text }, source);
  }
}

/**
 * Parser for eGazette documents
 */
class EGazetteParser {
  constructor(config) {
    this.config = config;
  }

  async parseStructured(data, source) {
    return {
      type: 'notification',
      sourceId: source.id,
      title: data.title || data.subject || 'Gazette Notification',
      authority: source.authority,
      year: data.year || new Date().getFullYear(),
      notificationNumber: data.notificationNumber,
      effectiveDate: data.effectiveDate,
      sections: data.clauses || [],
      metadata: {
        ministry: data.ministry,
        department: data.department,
        gazetteDate: data.gazetteDate,
        publishDate: data.publishDate,
        notificationType: data.notificationType,
      },
      raw: data,
    };
  }

  async parseRaw(buffer, source) {
    let text;
    if (Buffer.isBuffer(buffer)) {
      text = buffer.toString('utf8');
    } else {
      text = String(buffer);
    }
    try {
      const data = JSON.parse(text);
      return this.parseStructured(data, source);
    } catch {
      return this.parseStructured({ raw: text }, source);
    }
  }
}

/**
 * Parser for RBI documents
 */
class RBIParser {
  constructor(config) {
    this.config = config;
  }

  async parseStructured(data, source) {
    return {
      type: 'circular',
      sourceId: source.id,
      title: data.title || data.subject || 'RBI Circular',
      authority: source.authority,
      year: data.year || new Date().getFullYear(),
      sections: data.clauses || [],
      metadata: {
        circularNumber: data.circularNumber,
        date: data.date,
        category: data.category,
        effectiveFrom: data.effectiveFrom,
        referenceNumber: data.referenceNumber,
      },
      raw: data,
    };
  }

  async parseRaw(buffer, source) {
    let text;
    if (Buffer.isBuffer(buffer)) {
      text = buffer.toString('utf8');
    } else {
      text = String(buffer);
    }
    try {
      const data = JSON.parse(text);
      return this.parseStructured(data, source);
    } catch {
      return this.parseStructured({ raw: text }, source);
    }
  }
}

/**
 * Parser for SEBI documents
 */
class SEBIParser {
  constructor(config) {
    this.config = config;
  }

  async parseStructured(data, source) {
    return {
      type: 'regulation',
      sourceId: source.id,
      title: data.title || 'SEBI Regulation',
      authority: source.authority,
      year: data.year || new Date().getFullYear(),
      sections: data.clauses || [],
      metadata: {
        regulationNumber: data.regulationNumber,
        date: data.date,
        category: data.category,
      },
      raw: data,
    };
  }

  async parseRaw(buffer, source) {
    let text;
    if (Buffer.isBuffer(buffer)) {
      text = buffer.toString('utf8');
    } else {
      text = String(buffer);
    }
    try {
      const data = JSON.parse(text);
      return this.parseStructured(data, source);
    } catch {
      return this.parseStructured({ raw: text }, source);
    }
  }
}

/**
 * Parser for MCA documents
 */
class MCAParser {
  constructor(config) {
    this.config = config;
  }

  async parseStructured(data, source) {
    return {
      type: 'notification',
      sourceId: source.id,
      title: data.title || 'MCA Notification',
      authority: source.authority,
      year: data.year || new Date().getFullYear(),
      sections: data.clauses || [],
      metadata: {
        notificationNumber: data.notificationNumber,
        date: data.date,
        category: data.category,
      },
      raw: data,
    };
  }

  async parseRaw(buffer, source) {
    let text;
    if (Buffer.isBuffer(buffer)) {
      text = buffer.toString('utf8');
    } else {
      text = String(buffer);
    }
    try {
      const data = JSON.parse(text);
      return this.parseStructured(data, source);
    } catch {
      return this.parseStructured({ raw: text }, source);
    }
  }
}

/**
 * Parser for CBIC documents
 */
class CBICParser {
  constructor(config) {
    this.config = config;
  }

  async parseStructured(data, source) {
    return {
      type: 'circular',
      sourceId: source.id,
      title: data.title || 'CBIC Circular',
      authority: source.authority,
      year: data.year || new Date().getFullYear(),
      sections: data.clauses || [],
      metadata: {
        circularNumber: data.circularNumber,
        date: data.date,
        category: data.category,
      },
      raw: data,
    };
  }

  async parseRaw(buffer, source) {
    let text;
    if (Buffer.isBuffer(buffer)) {
      text = buffer.toString('utf8');
    } else {
      text = String(buffer);
    }
    try {
      const data = JSON.parse(text);
      return this.parseStructured(data, source);
    } catch {
      return this.parseStructured({ raw: text }, source);
    }
  }
}

/**
 * Parser for CBDT documents
 */
class CBDTParser {
  constructor(config) {
    this.config = config;
  }

  async parseStructured(data, source) {
    return {
      type: 'circular',
      sourceId: source.id,
      title: data.title || 'CBDT Circular',
      authority: source.authority,
      year: data.year || new Date().getFullYear(),
      sections: data.clauses || [],
      metadata: {
        circularNumber: data.circularNumber,
        date: data.date,
        category: data.category,
      },
      raw: data,
    };
  }

  async parseRaw(buffer, source) {
    let text;
    if (Buffer.isBuffer(buffer)) {
      text = buffer.toString('utf8');
    } else {
      text = String(buffer);
    }
    try {
      const data = JSON.parse(text);
      return this.parseStructured(data, source);
    } catch {
      return this.parseStructured({ raw: text }, source);
    }
  }
}

module.exports = DocumentParser;
