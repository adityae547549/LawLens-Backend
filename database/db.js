const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'database');

class Database {
  constructor() {
    this.collections = {};
    this.dbPath = DB_PATH;
    if (!fs.existsSync(this.dbPath)) {
      fs.mkdirSync(this.dbPath, { recursive: true });
    }
  }

  _getFilePath(collection) {
    return path.join(this.dbPath, `${collection}.json`);
  }

  _readCollection(collection) {
    const filePath = this._getFilePath(collection);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify([]));
      return [];
    }
    try {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  _writeCollection(collection, data) {
    const filePath = this._getFilePath(collection);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  findAll(collection, query = {}) {
    const items = this._readCollection(collection);
    if (Object.keys(query).length === 0) return items;
    return items.filter(item =>
      Object.entries(query).every(([key, value]) => item[key] === value)
    );
  }

  findById(collection, id) {
    const items = this._readCollection(collection);
    return items.find(item => item.id === id) || null;
  }

  findOne(collection, query) {
    const items = this._readCollection(collection);
    return items.find(item =>
      Object.entries(query).every(([key, value]) => item[key] === value)
    ) || null;
  }

  insertOne(collection, doc) {
    const items = this._readCollection(collection);
    const newDoc = { id: uuidv4(), createdAt: new Date().toISOString(), ...doc };
    items.push(newDoc);
    this._writeCollection(collection, items);
    return newDoc;
  }

  updateOne(collection, query, updates) {
    const items = this._readCollection(collection);
    const index = items.findIndex(item =>
      Object.entries(query).every(([key, value]) => item[key] === value)
    );
    if (index === -1) return null;
    items[index] = { ...items[index], ...updates, updatedAt: new Date().toISOString() };
    this._writeCollection(collection, items);
    return items[index];
  }

  deleteOne(collection, query) {
    const items = this._readCollection(collection);
    const index = items.findIndex(item =>
      Object.entries(query).every(([key, value]) => item[key] === value)
    );
    if (index === -1) return false;
    items.splice(index, 1);
    this._writeCollection(collection, items);
    return true;
  }

  deleteAll(collection) {
    this._writeCollection(collection, []);
  }

  count(collection, query = {}) {
    return this.findAll(collection, query).length;
  }
}

module.exports = new Database();
