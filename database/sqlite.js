let Database;
try {
  Database = require('better-sqlite3');
} catch (e) {
  throw new Error('better-sqlite3 not available: ' + e.message);
}
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const BACKEND_DIR = path.resolve(__dirname, '..');
const DB_FILE = process.env.DB_PATH
  ? (path.isAbsolute(process.env.DB_PATH)
      ? path.join(process.env.DB_PATH, 'lawlens.db')
      : path.resolve(BACKEND_DIR, process.env.DB_PATH, 'lawlens.db'))
  : path.join(BACKEND_DIR, 'database', 'lawlens.db');

class SQLiteDatabase {
  constructor() {
    this.db = new Database(DB_FILE);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('busy_timeout = 5000');
    this.db.pragma('synchronous = NORMAL');
    this._initTables();
  }

  _initTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY, name TEXT, email TEXT UNIQUE,
        password TEXT, googleId TEXT, avatar TEXT, role TEXT DEFAULT 'user',
        preferences TEXT DEFAULT '{}', createdAt TEXT, updatedAt TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_googleId ON users(googleId);

      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY, userId TEXT, title TEXT,
        messages TEXT DEFAULT '[]', messageCount INTEGER DEFAULT 0,
        archivedCount INTEGER DEFAULT 0, level TEXT DEFAULT 'general',
        useWebSearch INTEGER DEFAULT 0, createdAt TEXT, updatedAt TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_conversations_userId ON conversations(userId);

      CREATE TABLE IF NOT EXISTS bookmarks (
        id TEXT PRIMARY KEY, userId TEXT, articleId TEXT,
        title TEXT, url TEXT, notes TEXT, createdAt TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_bookmarks_userId ON bookmarks(userId);

      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY, userId TEXT, filename TEXT,
        originalName TEXT, mimeType TEXT, size INTEGER,
        status TEXT DEFAULT 'uploaded', chunks INTEGER DEFAULT 0, createdAt TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_documents_userId ON documents(userId);

      CREATE TABLE IF NOT EXISTS searchHistory (
        id TEXT PRIMARY KEY, userId TEXT, query TEXT,
        resultsCount INTEGER, mode TEXT, createdAt TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_searchHistory_userId ON searchHistory(userId);

      CREATE TABLE IF NOT EXISTS feedback (
        id TEXT PRIMARY KEY, userId TEXT, messageId TEXT,
        type TEXT, reason TEXT, createdAt TEXT
      );

      CREATE TABLE IF NOT EXISTS analytics (
        id TEXT PRIMARY KEY, event TEXT, userId TEXT, query TEXT,
        resultCount INTEGER, confidence REAL, useWebSearch INTEGER, timestamp TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_analytics_event ON analytics(event);

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY, value TEXT, updatedAt TEXT
      );

      CREATE TABLE IF NOT EXISTS shares (
        id TEXT PRIMARY KEY, userId TEXT, conversationId TEXT,
        token TEXT UNIQUE, createdAt TEXT, expiresAt TEXT
      );

      CREATE TABLE IF NOT EXISTS workspaces (
        id TEXT PRIMARY KEY, userId TEXT, title TEXT, description TEXT,
        sources TEXT DEFAULT '[]', createdAt TEXT, updatedAt TEXT
      );

      CREATE TABLE IF NOT EXISTS requests (
        id TEXT PRIMARY KEY, method TEXT, path TEXT, statusCode INTEGER,
        responseTime INTEGER, ip TEXT, userId TEXT, timestamp TEXT
      );
    `);
  }

  _rowToDoc(row) {
    if (!row) return null;
    const doc = { ...row };
    if (doc.messages && typeof doc.messages === 'string') {
      try { doc.messages = JSON.parse(doc.messages); } catch { doc.messages = []; }
    }
    if (doc.preferences && typeof doc.preferences === 'string') {
      try { doc.preferences = JSON.parse(doc.preferences); } catch { doc.preferences = {}; }
    }
    if (doc.sources && typeof doc.sources === 'string') {
      try { doc.sources = JSON.parse(doc.sources); } catch { doc.sources = []; }
    }
    return doc;
  }

  _docToRow(doc) {
    const row = { ...doc };
    if (Array.isArray(row.messages)) row.messages = JSON.stringify(row.messages);
    if (typeof row.preferences === 'object' && row.preferences !== null) row.preferences = JSON.stringify(row.preferences);
    if (Array.isArray(row.sources)) row.sources = JSON.stringify(row.sources);
    return row;
  }

  findAll(collection, query = {}) {
    const keys = Object.keys(query);
    if (keys.length === 0) {
      return this.db.prepare(`SELECT * FROM "${collection}"`).all().map(r => this._rowToDoc(r));
    }
    const conditions = keys.map(k => `"${k}" = ?`).join(' AND ');
    const values = keys.map(k => typeof query[k] === 'boolean' ? (query[k] ? 1 : 0) : query[k]);
    return this.db.prepare(`SELECT * FROM "${collection}" WHERE ${conditions}`).all(...values).map(r => this._rowToDoc(r));
  }

  findById(collection, id) {
    return this._rowToDoc(this.db.prepare(`SELECT * FROM "${collection}" WHERE id = ?`).get(id));
  }

  findOne(collection, query) {
    const keys = Object.keys(query);
    if (keys.length === 0) {
      return this._rowToDoc(this.db.prepare(`SELECT * FROM "${collection}" LIMIT 1`).get());
    }
    const conditions = keys.map(k => `"${k}" = ?`).join(' AND ');
    const values = keys.map(k => typeof query[k] === 'boolean' ? (query[k] ? 1 : 0) : query[k]);
    return this._rowToDoc(this.db.prepare(`SELECT * FROM "${collection}" WHERE ${conditions} LIMIT 1`).get(...values));
  }

  insertOne(collection, doc) {
    const id = doc.id || uuidv4();
    const now = new Date().toISOString();
    const fullDoc = { id, createdAt: now, ...doc };
    const row = this._docToRow(fullDoc);
    const cols = Object.keys(row);
    this.db.prepare(`INSERT INTO "${collection}" (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`).run(...Object.values(row));
    return fullDoc;
  }

  updateOne(collection, query, updates) {
    const existing = this.findOne(collection, query);
    if (!existing) return null;
    const merged = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    const row = this._docToRow(merged);
    const setCols = Object.keys(row).filter(k => k !== 'id');
    this.db.prepare(`UPDATE "${collection}" SET ${setCols.map(k => `"${k}" = ?`).join(', ')} WHERE id = ?`).run(...setCols.map(k => row[k]), row.id);
    return this._rowToDoc(row);
  }

  deleteOne(collection, query) {
    const existing = this.findOne(collection, query);
    if (!existing) return false;
    this.db.prepare(`DELETE FROM "${collection}" WHERE id = ?`).run(existing.id);
    return true;
  }

  deleteAll(collection) {
    this.db.prepare(`DELETE FROM "${collection}"`).run();
  }

  count(collection, query = {}) {
    const keys = Object.keys(query);
    if (keys.length === 0) {
      return this.db.prepare(`SELECT COUNT(*) as cnt FROM "${collection}"`).get().cnt;
    }
    const conditions = keys.map(k => `"${k}" = ?`).join(' AND ');
    const values = keys.map(k => typeof query[k] === 'boolean' ? (query[k] ? 1 : 0) : query[k]);
    return this.db.prepare(`SELECT COUNT(*) as cnt FROM "${collection}" WHERE ${conditions}`).get(...values).cnt;
  }

  close() {
    this.db.close();
  }
}

module.exports = new SQLiteDatabase();
