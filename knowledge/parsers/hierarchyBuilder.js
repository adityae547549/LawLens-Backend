/**
 * Hierarchy Builder - Preserves legal hierarchy exactly
 * Act → Part → Chapter → Section → Subsection → Clause → Explanation → Illustration → Exception → Schedule
 */

class HierarchyBuilder {
  constructor(config = {}) {
    this.config = config;
  }

  /**
   * Build hierarchy from parsed document
   */
  async build(parsed) {
    if (!parsed || !parsed.sections) {
      return { ...parsed, hierarchy: [], flatSections: [] };
    }

    const hierarchy = this.buildHierarchy(parsed.sections, parsed.type);
    const flatSections = this.flattenHierarchy(hierarchy);

    // Add metadata about the hierarchy
    const stats = this.computeStats(hierarchy);

    return {
      ...parsed,
      hierarchy,
      flatSections,
      hierarchyStats: stats,
    };
  }

  /**
   * Build hierarchical tree from flat section list
   */
  buildHierarchy(sections, docType = 'act') {
    if (!sections || !sections.length) return [];

    const root = { type: 'document', children: [] };
    let currentPart = null;
    let currentChapter = null;
    let currentSection = null;

    for (const section of sections) {
      const node = this.createNode(section, docType);

      // Determine nesting level
      if (this.isPart(section)) {
        currentPart = node;
        root.children.push(node);
        currentChapter = null;
        currentSection = null;
      } else if (this.isChapter(section)) {
        currentChapter = node;
        if (currentPart) {
          currentPart.children = currentPart.children || [];
          currentPart.children.push(node);
        } else {
          root.children.push(node);
        }
        currentSection = null;
      } else if (this.isSection(section)) {
        currentSection = node;
        if (currentChapter) {
          currentChapter.children = currentChapter.children || [];
          currentChapter.children.push(node);
        } else if (currentPart) {
          currentPart.children = currentPart.children || [];
          currentPart.children.push(node);
        } else {
          root.children.push(node);
        }
      } else if (this.isSubSection(section)) {
        if (currentSection) {
          currentSection.children = currentSection.children || [];
          currentSection.children.push(node);
        }
      } else if (this.isClause(section)) {
        const parent = this.findCurrentSectionParent(currentSection, currentPart);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(node);
        }
      } else if (this.isExplanation(section)) {
        if (currentSection) {
          currentSection.explanations = currentSection.explanations || [];
          currentSection.explanations.push(node);
        }
      } else if (this.isIllustration(section)) {
        if (currentSection) {
          currentSection.illustrations = currentSection.illustrations || [];
          currentSection.illustrations.push(node);
        }
      } else {
        // Default: add to current level
        if (currentSection) {
          currentSection.children = currentSection.children || [];
          currentSection.children.push(node);
        } else if (currentChapter) {
          currentChapter.children = currentChapter.children || [];
          currentChapter.children.push(node);
        } else if (currentPart) {
          currentPart.children = currentPart.children || [];
          currentPart.children.push(node);
        } else {
          root.children.push(node);
        }
      }
    }

    return root.children;
  }

  /**
   * Create a hierarchy node from a section
   */
  createNode(section, docType) {
    return {
      id: this.generateId(section),
      type: this.determineType(section),
      number: section.number || section.id || null,
      title: section.title || section.heading || '',
      content: section.content || section.text || '',
      metadata: {
        originalType: section.type || 'unknown',
        actTitle: section.actTitle || null,
        chapterNumber: section.chapterNumber || null,
        chapterTitle: section.chapterTitle || null,
        partNumber: section.partNumber || null,
        partTitle: section.partTitle || null,
      },
      children: [],
      explanations: section.explanations || [],
      illustrations: section.illustrations || [],
      exceptions: section.exceptions || [],
      clauses: section.clauses || [],
    };
  }

  /**
   * Flatten hierarchy into ordered list
   */
  flattenHierarchy(hierarchy, parentPath = '') {
    const result = [];

    for (const node of hierarchy) {
      const path = parentPath ? `${parentPath} > ${node.title || node.number}` : (node.title || node.number || 'Root');

      result.push({
        id: node.id,
        type: node.type,
        number: node.number,
        title: node.title,
        content: node.content,
        path,
        depth: parentPath ? parentPath.split(' > ').length : 0,
        metadata: node.metadata,
      });

      // Flatten children
      if (node.children && node.children.length) {
        result.push(...this.flattenHierarchy(node.children, path));
      }
    }

    return result;
  }

  /**
   * Compute hierarchy statistics
   */
  computeStats(hierarchy) {
    const stats = {
      totalNodes: 0,
      parts: 0,
      chapters: 0,
      sections: 0,
      subsections: 0,
      clauses: 0,
      explanations: 0,
      illustrations: 0,
      exceptions: 0,
      maxDepth: 0,
    };

    const traverse = (nodes, depth = 0) => {
      for (const node of nodes) {
        stats.totalNodes++;
        stats.maxDepth = Math.max(stats.maxDepth, depth);

        switch (node.type) {
          case 'part': stats.parts++; break;
          case 'chapter': stats.chapters++; break;
          case 'section': stats.sections++; break;
          case 'subsection': stats.subsections++; break;
          case 'clause': stats.clauses++; break;
          case 'explanation': stats.explanations++; break;
          case 'illustration': stats.illustrations++; break;
          case 'exception': stats.exceptions++; break;
        }

        if (node.children && node.children.length) {
          traverse(node.children, depth + 1);
        }
      }
    };

    traverse(hierarchy);
    return stats;
  }

  // Type detection helpers
  isPart(section) {
    const title = (section.title || '').toLowerCase();
    const num = String(section.number || '').toLowerCase();
    return title.startsWith('part') || /^part\s+[ivx\d]/i.test(title) || /^part\s+\d/i.test(num);
  }

  isChapter(section) {
    const title = (section.title || '').toLowerCase();
    const num = String(section.number || '').toLowerCase();
    return title.startsWith('chapter') || /^chapter\s+[ivx\d]/i.test(title) || /^chapter\s+\d/i.test(num);
  }

  isSection(section) {
    const title = (section.title || '').toLowerCase();
    const num = String(section.number || '');
    return title.startsWith('section') || /^section\s+\d/i.test(title) || /^\d+[A-Za-z]?$/.test(num);
  }

  isSubSection(section) {
    const num = String(section.number || '');
    return /^\(\d+[A-Za-z]?\)$/.test(num) || /^\d+\(\d+\)$/.test(num);
  }

  isClause(section) {
    const num = String(section.number || '');
    return /^\([a-z]\)$/i.test(num) || /^[a-z]\)$/i.test(num);
  }

  isExplanation(section) {
    const title = (section.title || '').toLowerCase();
    return title.startsWith('explanation') || title.startsWith('explanatory');
  }

  isIllustration(section) {
    const title = (section.title || '').toLowerCase();
    return title.startsWith('illustration');
  }

  determineType(section) {
    if (this.isPart(section)) return 'part';
    if (this.isChapter(section)) return 'chapter';
    if (this.isSection(section)) return 'section';
    if (this.isSubSection(section)) return 'subsection';
    if (this.isClause(section)) return 'clause';
    if (this.isExplanation(section)) return 'explanation';
    if (this.isIllustration(section)) return 'illustration';
    return 'section';
  }

  generateId(section) {
    const num = section.number || section.id || '';
    const title = (section.title || '').slice(0, 50).replace(/\s+/g, '-').toLowerCase();
    return `node-${num}-${title}`.replace(/[^a-z0-9-]/gi, '').slice(0, 100);
  }

  findCurrentSectionParent(currentSection, currentPart) {
    return currentSection || currentPart;
  }
}

module.exports = HierarchyBuilder;
