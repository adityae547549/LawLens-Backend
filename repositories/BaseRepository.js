const db = require('../database/db');

class BaseRepository {
  constructor(collectionName) {
    this.collection = collectionName;
    this.db = db;
  }

  findAll(query = {}) {
    return this.db.findAll(this.collection, query);
  }

  findById(id) {
    return this.db.findById(this.collection, id);
  }

  findOne(query) {
    return this.db.findOne(this.collection, query);
  }

  insertOne(doc) {
    return this.db.insertOne(this.collection, doc);
  }

  updateOne(query, updates) {
    return this.db.updateOne(this.collection, query, updates);
  }

  deleteOne(query) {
    return this.db.deleteOne(this.collection, query);
  }

  deleteAll() {
    return this.db.deleteAll(this.collection);
  }

  count(query = {}) {
    return this.db.count(this.collection, query);
  }
}

module.exports = BaseRepository;
