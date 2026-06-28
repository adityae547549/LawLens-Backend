const fs = require('fs');
const path = require('path');
const db = require('../database/db');
const vectorStore = require('../rag/vectorStore');
const documentProcessor = require('../rag/documentProcessor');
const promptEditor = require('../rag/promptEditor');

exports.getDashboard = async (req, res) => {
  try {
    const users = db.count('users');
    const conversations = db.count('conversations');
    const bookmarks = db.count('bookmarks');
    const documents = vectorStore.count();
    const searches = db.count('searchHistory');

    res.json({
      stats: { users, conversations, bookmarks, documents, searches },
      uptime: process.uptime()
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ error: 'Failed to get admin dashboard data' });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const users = db.findAll('users').map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt
    }));
    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const deleted = db.deleteOne('users', { id: req.params.id });
    if (!deleted) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'User deleted' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

exports.rebuildVectorDB = async (req, res) => {
  try {
    await vectorStore.clear();
    const dataDir = path.resolve(__dirname, '..', 'data');
    const { chunks, errors } = await documentProcessor.processDirectory(dataDir);
    if (chunks.length > 0) {
      await vectorStore.addDocuments(chunks);
    }
    res.json({
      message: 'Vector database rebuilt successfully',
      chunks: chunks.length,
      errors: errors.length
    });
  } catch (error) {
    console.error('Rebuild vector DB error:', error);
    res.status(500).json({ error: 'Failed to rebuild vector database' });
  }
};

exports.getLogs = async (req, res) => {
  try {
    const logsDir = path.resolve(__dirname, '..', 'logs');
    const logs = [];
    if (fs.existsSync(logsDir)) {
      const files = fs.readdirSync(logsDir).slice(-10);
      for (const file of files) {
        const content = fs.readFileSync(path.join(logsDir, file), 'utf-8').split('\n').slice(-100).join('\n');
        logs.push({ file, content });
      }
    }
    if (logs.length === 0) {
      logs.push({ file: 'No log files found', content: 'Server logs are not available.' });
    }
    res.json({ logs });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ error: 'Failed to get logs' });
  }
};

exports.getApiMetrics = async (req, res) => {
  try {
    res.json({
      metrics: {
        totalRequests: db.count('requests') || 0,
        activeUsers: db.count('users'),
        totalConversations: db.count('conversations'),
        vectorStoreSize: vectorStore.count()
      }
    });
  } catch (error) {
    console.error('Get API metrics error:', error);
    res.status(500).json({ error: 'Failed to get API metrics' });
  }
};

exports.getPrompt = async (req, res) => {
  try {
    const prompt = promptEditor.getPrompt();
    res.json({ prompt });
  } catch (error) {
    console.error('Get prompt error:', error);
    res.status(500).json({ error: 'Failed to get prompt' });
  }
};

exports.updatePrompt = async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    promptEditor.setPrompt(prompt);
    res.json({ message: 'Prompt updated', prompt });
  } catch (error) {
    console.error('Update prompt error:', error);
    res.status(500).json({ error: 'Failed to update prompt' });
  }
};

exports.resetPrompt = async (req, res) => {
  try {
    const prompt = promptEditor.resetPrompt();
    res.json({ message: 'Prompt reset to default', prompt });
  } catch (error) {
    console.error('Reset prompt error:', error);
    res.status(500).json({ error: 'Failed to reset prompt' });
  }
};

exports.uploadDataset = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const dataDir = path.resolve(__dirname, '..', 'data');
    const destPath = path.join(dataDir, req.file.originalname);
    fs.copyFileSync(req.file.path, destPath);
    fs.unlinkSync(req.file.path);

    const chunks = await documentProcessor.processFile(destPath, req.file.originalname);
    await vectorStore.addDocuments(chunks);

    res.json({
      message: 'Dataset uploaded and processed',
      fileName: req.file.originalname,
      chunks: chunks.length
    });
  } catch (error) {
    console.error('Upload dataset error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload dataset' });
  }
};

exports.getDatasets = async (req, res) => {
  try {
    const dataDir = path.resolve(__dirname, '..', 'data');
    const files = fs.readdirSync(dataDir).filter(f => {
      const ext = path.extname(f).toLowerCase();
      return ['.pdf', '.txt', '.docx', '.json', '.md'].includes(ext);
    });

    const datasets = files.map(f => {
      const filePath = path.join(dataDir, f);
      const stat = fs.statSync(filePath);
      const vectorStats = vectorStore.getStats();
      const fileInfo = vectorStats.files.find(vf => vf.fileName === f);
      return {
        name: f,
        size: stat.size,
        sizeFormatted: stat.size > 1024 * 1024
          ? (stat.size / (1024 * 1024)).toFixed(1) + ' MB'
          : (stat.size / 1024).toFixed(1) + ' KB',
        lastModified: stat.mtime,
        chunks: fileInfo ? fileInfo.chunks : 0,
        indexed: !!fileInfo
      };
    });

    res.json({ datasets, vectorStats: vectorStore.getStats() });
  } catch (error) {
    console.error('Get datasets error:', error);
    res.status(500).json({ error: 'Failed to list datasets' });
  }
};

exports.deleteDataset = async (req, res) => {
  try {
    const { fileName } = req.params;
    const dataDir = path.resolve(__dirname, '..', 'data');
    const filePath = path.join(dataDir, fileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    fs.unlinkSync(filePath);
    await vectorStore.deleteByFileId(fileName);

    res.json({ message: 'Dataset deleted', fileName });
  } catch (error) {
    console.error('Delete dataset error:', error);
    res.status(500).json({ error: 'Failed to delete dataset' });
  }
};

exports.getDatasetPreview = async (req, res) => {
  try {
    const { fileName } = req.params;
    const dataDir = path.resolve(__dirname, '..', 'data');
    const filePath = path.join(dataDir, fileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const ext = path.extname(fileName).toLowerCase();
    let preview = '';

    if (ext === '.json') {
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      preview = JSON.stringify(Array.isArray(parsed) ? parsed.slice(0, 5) : parsed, null, 2);
    } else if (ext === '.txt' || ext === '.md') {
      preview = fs.readFileSync(filePath, 'utf-8').slice(0, 2000);
    } else if (ext === '.pdf' || ext === '.docx') {
      const chunks = await vectorStore.searchByMetadata({ fileName }, 3);
      preview = chunks.map(c => c.text).join('\n\n').slice(0, 2000);
    }

    res.json({ fileName, preview });
  } catch (error) {
    console.error('Dataset preview error:', error);
    res.status(500).json({ error: 'Failed to preview dataset' });
  }
};
