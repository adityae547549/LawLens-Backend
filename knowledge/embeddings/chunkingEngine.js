/**
 * Chunking Engine - Hierarchical, context-aware chunking for legal documents
 * Preserves legal structure while creating optimal chunks for retrieval
 */

const fs = require('fs');
const path = require('path');

class ChunkingEngine {
  constructor(config = {}) {
    this.config = config;
    this.chunkSize = config.chunkSize || 1000;
    this.chunkOverlap = config.chunkOverlap || 200;
    this.minChunkSize = config.minChunkSize || 100;
    this.maxChunkSize = config.maxChunkSize || 1500;
    this.chunksPath = path.join(config.dataDir || 'data', 'chunks-index.json');
    this.chunks = new Map();
  }

  async initialize() {
    try {
      if (fs.existsSync(this.chunksPath)) {
        const data = JSON.parse(fs.readFileSync(this.chunksPath, 'utf8'));
        for (const chunk of data.chunks || []) {
          this.chunks.set(chunk.id, chunk);
        }
      }
    } catch (err) {
      // Initialize empty
    }
  }

  /**
   * Chunk a hierarchy-built document
   */
  async chunk(doc) {
    const allChunks = [];

    if (doc.hierarchy && doc.hierarchy.length > 0) {
      // Hierarchical chunking - best for legal documents
      const hierarchyChunks = this.chunkHierarchy(doc.hierarchy, doc);
      allChunks.push(...hierarchyChunks);
    } else if (doc.flatSections && doc.flatSections.length > 0) {
      // Flat section chunking
      for (const section of doc.flatSections) {
        const sectionChunks = this.chunkSection(section, doc);
        allChunks.push(...sectionChunks);
      }
    } else if (doc.raw || doc.content) {
      // Fallback: plain text chunking
      const text = typeof doc.raw === 'string' ? doc.raw : (doc.content || JSON.stringify(doc.raw));
      const textChunks = this.chunkText(text, {
        docId: doc.metadata?.citationId || doc.sourceId || 'unknown',
        actTitle: doc.title,
      });
      allChunks.push(...textChunks);
    }

    // Index chunks
    for (const chunk of allChunks) {
      this.chunks.set(chunk.id, chunk);
    }

    return allChunks;
  }

  /**
   * Chunk using hierarchy - preserves legal structure
   */
  chunkHierarchy(nodes, doc, parentPath = '', depth = 0) {
    const chunks = [];

    for (const node of nodes) {
      const path = parentPath ? `${parentPath} > ${node.title || node.number || ''}` : (node.title || node.number || 'Root');

      // If node has content, create a chunk
      if (node.content && node.content.length >= this.minChunkSize) {
        const chunkText = this.buildChunkText(node, path, doc);

        if (chunkText.length <= this.maxChunkSize) {
          chunks.push(this.createChunk(chunkText, {
            docId: doc.metadata?.citationId || doc.sourceId || 'unknown',
            nodeId: node.id,
            nodeType: node.type,
            number: node.number,
            title: node.title,
            path,
            depth,
            actTitle: doc.title,
            authority: doc.authority,
            year: doc.year,
            legalTopics: doc.metadata?.legalTopics || [],
            keywords: node.metadata?.keywords || [],
          }));
        } else {
          // Split large chunks while preserving structure
          const splitChunks = this.splitLargeChunk(chunkText, {
            docId: doc.metadata?.citationId || doc.sourceId || 'unknown',
            nodeId: node.id,
            nodeType: node.type,
            number: node.number,
            title: node.title,
            path,
            depth,
            actTitle: doc.title,
            authority: doc.authority,
            year: doc.year,
            legalTopics: doc.metadata?.legalTopics || [],
          });
          chunks.push(...splitChunks);
        }
      }

      // Process children
      if (node.children && node.children.length > 0) {
        const childChunks = this.chunkHierarchy(node.children, doc, path, depth + 1);
        chunks.push(...childChunks);
      }

      // Process explanations, illustrations, exceptions
      for (const explanation of node.explanations || []) {
        if (explanation.content && explanation.content.length >= this.minChunkSize) {
          chunks.push(this.createChunk(
            `Explanation to ${node.title || node.number}:\n${explanation.content}`,
            {
              docId: doc.metadata?.citationId || doc.sourceId || 'unknown',
              nodeId: `${node.id}-exp-${explanation.number || ''}`,
              nodeType: 'explanation',
              number: explanation.number,
              title: `Explanation to ${node.title || node.number}`,
              path: `${path} > Explanation ${explanation.number || ''}`,
              depth: depth + 1,
              actTitle: doc.title,
              authority: doc.authority,
              year: doc.year,
            }
          ));
        }
      }

      for (const illustration of node.illustrations || []) {
        if (illustration.content && illustration.content.length >= this.minChunkSize) {
          chunks.push(this.createChunk(
            `Illustration to ${node.title || node.number}:\n${illustration.content}`,
            {
              docId: doc.metadata?.citationId || doc.sourceId || 'unknown',
              nodeId: `${node.id}-ill-${illustration.number || ''}`,
              nodeType: 'illustration',
              number: illustration.number,
              title: `Illustration to ${node.title || node.number}`,
              path: `${path} > Illustration ${illustration.number || ''}`,
              depth: depth + 1,
              actTitle: doc.title,
              authority: doc.authority,
              year: doc.year,
            }
          ));
        }
      }
    }

    return chunks;
  }

  /**
   * Build chunk text with context
   */
  buildChunkText(node, path, doc) {
    const parts = [];

    // Add path context
    parts.push(`[${path}]`);

    // Add node title
    if (node.title) {
      parts.push(`${node.type === 'section' ? 'Section' : ''} ${node.number || ''}: ${node.title}`);
    }

    // Add content
    parts.push(node.content);

    return parts.join('\n');
  }

  /**
   * Chunk a single section
   */
  chunkSection(section, doc) {
    const text = section.content || '';
    if (text.length < this.minChunkSize) return [];

    const metadata = {
      docId: doc.metadata?.citationId || doc.sourceId || 'unknown',
      sectionId: section.id,
      sectionNumber: section.number,
      sectionTitle: section.title,
      path: section.path,
      actTitle: doc.title,
      authority: doc.authority,
      year: doc.year,
      legalTopics: doc.metadata?.legalTopics || [],
    };

    if (text.length <= this.maxChunkSize) {
      return [this.createChunk(text, metadata)];
    }

    return this.splitLargeChunk(text, metadata);
  }

  /**
   * Split large text into chunks with overlap
   */
  splitLargeChunk(text, metadata) {
    const chunks = [];
    const sentences = text.match(/[^.!?\n]+[.!?\n]*/g) || [text];
    let currentChunk = '';
    let chunkIndex = 0;

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > this.chunkSize && currentChunk.length > 0) {
        chunks.push(this.createChunk(currentChunk.trim(), {
          ...metadata,
          chunkIndex,
          chunkPart: `${chunkIndex + 1}`,
        }));
        chunkIndex++;
        const overlap = currentChunk.slice(-this.chunkOverlap);
        currentChunk = overlap + sentence;
      } else {
        currentChunk += sentence;
      }
    }

    if (currentChunk.trim().length >= this.minChunkSize) {
      chunks.push(this.createChunk(currentChunk.trim(), {
        ...metadata,
        chunkIndex,
        chunkPart: `${chunkIndex + 1}`,
      }));
    }

    return chunks;
  }

  /**
   * Plain text chunking (fallback)
   */
  chunkText(text, metadata) {
    if (!text || text.length < this.minChunkSize) return [];
    return this.splitLargeChunk(text, metadata);
  }

  /**
   * Create a chunk object with unique ID
   */
  createChunk(text, metadata) {
    const id = `chunk-${metadata.docId}-${metadata.nodeId || metadata.sectionId || ''}-${metadata.chunkIndex || 0}-${Date.now().toString(36)}`;

    return {
      id,
      text: text.trim(),
      metadata: {
        ...metadata,
        createdAt: new Date().toISOString(),
        textLength: text.trim().length,
      },
    };
  }

  /**
   * Get chunk by ID
   */
  getChunk(id) {
    return this.chunks.get(id) || null;
  }

  /**
   * Get all chunks for a document
   */
  getChunksByDoc(docId) {
    return Array.from(this.chunks.values()).filter(
      (c) => c.metadata?.docId === docId
    );
  }

  /**
   * Get statistics
   */
  async getStats() {
    const chunks = Array.from(this.chunks.values());
    const byDoc = {};
    const byType = {};
    let totalLength = 0;

    for (const c of chunks) {
      const docId = c.metadata?.docId || 'unknown';
      byDoc[docId] = (byDoc[docId] || 0) + 1;
      const type = c.metadata?.nodeType || c.metadata?.sectionNumber ? 'section' : 'text';
      byType[type] = (byType[type] || 0) + 1;
      totalLength += c.text.length;
    }

    return {
      totalChunks: chunks.length,
      totalTextLength: totalLength,
      averageChunkLength: chunks.length > 0 ? Math.round(totalLength / chunks.length) : 0,
      byDocument: byDoc,
      byType,
    };
  }

  /**
   * Save chunks index to disk
   */
  async save() {
    try {
      const data = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        chunks: Array.from(this.chunks.values()),
      };
      fs.writeFileSync(this.chunksPath, JSON.stringify(data, null, 2));
    } catch (err) {
      // Ignore
    }
  }
}

module.exports = ChunkingEngine;
