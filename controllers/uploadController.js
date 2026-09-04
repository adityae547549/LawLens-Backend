const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const documentProcessor = require('../rag/documentProcessor');
const vectorStore = require('../rag/vectorStore');
const db = require('../database/db');

const UPLOADS_DIR = path.resolve(__dirname, '..', 'uploads');

exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = req.user?.id || 'anonymous';
    const filePath = req.file.path;
    const fileId = req.file.filename;
    const originalName = req.file.originalname;

    // Process and chunk the document
    const chunks = await documentProcessor.processFile(filePath, fileId);

    // Add to vector store with user info
    chunks.forEach(c => {
      c.metadata.userId = userId;
      c.metadata.originalName = originalName;
      c.metadata.temporary = req.body.temporary === 'true';
    });

    await vectorStore.addDocuments(chunks);

    // Save document record to library
    const docRecord = db.insertOne('documents', {
      userId,
      fileId,
      originalName,
      fileType: path.extname(originalName).slice(1),
      fileSize: req.file.size,
      chunkCount: chunks.length,
      temporary: req.body.temporary === 'true',
      tags: [],
      status: 'ready'
    });

    res.json({
      message: 'Document uploaded and indexed successfully',
      document: {
        id: docRecord.id,
        fileId,
        originalName,
        fileType: docRecord.fileType,
        fileSize: req.file.size,
        chunkCount: chunks.length,
        temporary: docRecord.temporary,
        status: 'ready',
        createdAt: docRecord.createdAt
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message || 'Upload failed' });
  }
};

exports.getLibrary = async (req, res) => {
  try {
    const userId = req.user?.id || 'anonymous';
    const documents = db.findAll('documents', { userId });

    res.json({
      documents: documents.map(d => ({
        id: d.id,
        fileId: d.fileId,
        originalName: d.originalName,
        fileType: d.fileType,
        fileSize: d.fileSize,
        chunkCount: d.chunkCount,
        temporary: d.temporary,
        tags: d.tags || [],
        status: d.status,
        createdAt: d.createdAt
      })),
      total: documents.length
    });
  } catch (error) {
    console.error('Get library error:', error);
    res.status(500).json({ error: 'Failed to get library' });
  }
};

exports.deleteDocument = async (req, res) => {
  try {
    const userId = req.user?.id || 'anonymous';
    const { id } = req.params;

    const doc = db.findById('documents', id);
    if (!doc || doc.userId !== userId) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Remove chunks from vector store
    vectorStore.documents = vectorStore.documents.filter(
      d => d.metadata.fileId !== doc.fileId
    );
    await vectorStore.save();

    // Delete physical file
    const filePath = path.join(UPLOADS_DIR, doc.fileId);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete from database
    db.deleteOne('documents', { id });

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
};

exports.updateDocument = async (req, res) => {
  try {
    const userId = req.user?.id || 'anonymous';
    const { id } = req.params;
    const { tags, temporary } = req.body;

    const doc = db.findById('documents', id);
    if (!doc || doc.userId !== userId) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const updates = {};
    if (tags !== undefined) updates.tags = tags;
    if (temporary !== undefined) updates.temporary = temporary;

    const updated = db.updateOne('documents', { id }, updates);

    res.json({ message: 'Document updated', document: updated });
  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({ error: 'Failed to update document' });
  }
};

exports.searchInDocument = async (req, res) => {
  try {
    const { fileId, query } = req.query;
    if (!query) return res.status(400).json({ error: 'Query required' });

    let results = await vectorStore.hybridSearch(query, 10);

    if (fileId) {
      results = results.filter(r => r.metadata.fileId === fileId);
    }

    res.json({
      results: results.map(r => ({
        text: r.text,
        score: r.rerankScore || r.score,
        fileName: r.metadata.originalName || r.metadata.fileName,
        chunkIndex: r.metadata.chunkIndex
      })),
      total: results.length
    });
  } catch (error) {
    console.error('Search in document error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
};
