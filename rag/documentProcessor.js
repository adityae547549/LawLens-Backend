const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const Tesseract = require('tesseract.js');

const SUPPORTED_EXTENSIONS = ['.pdf', '.txt', '.docx', '.json', '.md', '.png', '.jpg', '.jpeg', '.webp', '.tiff', '.bmp'];

class DocumentProcessor {
  constructor() {
    this.chunkSize = 1000;
    this.chunkOverlap = 200;
  }

  async extractText(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case '.pdf':
        return await this._extractPdf(filePath);
      case '.docx':
        return await this._extractDocx(filePath);
      case '.json':
        return await this._extractJson(filePath);
      case '.md':
      case '.txt':
        return await this._extractText(filePath);
      case '.png':
      case '.jpg':
      case '.jpeg':
      case '.webp':
      case '.tiff':
      case '.bmp':
        return await this._extractImage(filePath);
      default:
        throw new Error(`Unsupported file format: ${ext}`);
    }
  }

  async _extractPdf(filePath) {
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return data.text;
  }

  async _extractDocx(filePath) {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }

  _extractText(filePath) {
    return fs.readFileSync(filePath, 'utf-8');
  }

  async _extractImage(filePath) {
    const result = await Tesseract.recognize(filePath, 'eng', {
      logger: () => {}
    });
    return result.data.text || '';
  }

  _extractJson(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    const fileName = path.basename(filePath, '.json');
    if (Array.isArray(data)) {
      return data.map(item => {
        if (item.sections) {
          const header = `Chapter ${item.chapter || ''}: ${item.title || ''}`;
          return header + '\n' + item.sections.map(s => {
            const parts = [`Section ${s.num || ''}:`, s.text || ''];
            if (s.key_offenses || s.key_topics) {
              parts.push(`[Keywords: ${(s.key_offenses || s.key_topics || []).join(', ')}]`);
            }
            return parts.join(' ');
          }).join('\n');
        }
        if (item.case) {
          return `Case: ${item.case} (${item.year || ''})\nCitation: ${item.citation || ''}\nCourt: ${item.court || ''}\nPrinciple: ${item.principle || ''}\nSummary: ${item.summary || ''}\nArticles: ${(item.articles || []).join(', ')}\nTopics: ${(item.topics || []).join(', ')}`;
        }
        if (item.maxim) {
          return `Maxim: ${item.maxim}\nMeaning: ${item.meaning || ''}\nExplanation: ${item.explanation || ''}\nCategory: ${item.category || ''}\nUsage: ${item.usage || ''}`;
        }
        if (item.part && item.sections) {
          return `Part ${item.part}: ${item.title || ''}\n` + item.sections.map(s => {
            const parts = [`Section ${s.num || ''}:`, s.text || ''];
            if (s.key_topics) parts.push(`[Keywords: ${s.key_topics.join(', ')}]`);
            return parts.join(' ');
          }).join('\n');
        }
        return this._jsonToText(item);
      }).join('\n\n');
    }
    return this._jsonToText(data);
  }

  _jsonToText(data, depth = 0) {
    if (depth > 5) return '';
    if (typeof data === 'string') return data + ' ';
    if (typeof data === 'number' || typeof data === 'boolean') return String(data) + ' ';
    if (Array.isArray(data)) return data.map(item => this._jsonToText(item, depth + 1)).join(' ');
    if (typeof data === 'object' && data !== null) {
      return Object.entries(data)
        .map(([key, value]) => `${key}: ${this._jsonToText(value, depth + 1)}`)
        .join(' ');
    }
    return '';
  }

  chunkText(text, metadata = {}) {
    const chunks = [];
    const sentences = text.match(/[^.!?\n]+[.!?\n]*/g) || [text];
    let currentChunk = '';
    let chunkIndex = 0;

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > this.chunkSize && currentChunk.length > 0) {
        chunks.push({
          id: `chunk_${metadata.fileId || 'doc'}_${chunkIndex}`,
          text: currentChunk.trim(),
          metadata: { ...metadata, chunkIndex }
        });
        chunkIndex++;
        const overlap = currentChunk.slice(-this.chunkOverlap);
        currentChunk = overlap + sentence;
      } else {
        currentChunk += sentence;
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push({
        id: `chunk_${metadata.fileId || 'doc'}_${chunkIndex}`,
        text: currentChunk.trim(),
        metadata: { ...metadata, chunkIndex }
      });
    }

    return chunks;
  }

  async processFile(filePath, fileId) {
    const ext = path.extname(filePath).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      throw new Error(`Unsupported file extension: ${ext}`);
    }

    const text = await this.extractText(filePath);
    const fileName = path.basename(filePath);
    const metadata = {
      fileId,
      fileName,
      fileType: ext.slice(1),
      filePath,
      processedAt: new Date().toISOString()
    };

    return this.chunkText(text, metadata);
  }

  async processDirectory(dirPath) {
    const files = fs.readdirSync(dirPath);
    const allChunks = [];
    const errors = [];

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);
      if (stat.isFile()) {
        try {
          const chunks = await this.processFile(filePath, file);
          allChunks.push(...chunks);
          console.log(`Processed: ${file} -> ${chunks.length} chunks`);
        } catch (err) {
          errors.push({ file, error: err.message });
          console.error(`Error processing ${file}: ${err.message}`);
        }
      }
    }

    return { chunks: allChunks, errors };
  }
}

module.exports = new DocumentProcessor();
