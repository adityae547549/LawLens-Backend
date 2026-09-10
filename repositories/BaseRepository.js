const db = require('../database/db');

class BaseRepository {
  constructor(collectionName) {
    this.collection = collectionName;
    this.db = db;
  }

  async findAll(query = {}) {
    return this.db.findAll(this.collection, query);
  }

  async findById(id) {
    return this.db.findById(this.collection, id);
  }

  async findOne(query) {
    return this.db.findOne(this.collection, query);
  }

  async insertOne(doc) {
    return this.db.insertOne(this.collection, doc);
  }

  async updateOne(query, updates) {
    return this.db.updateOne(this.collection, query, updates);
  }

  async deleteOne(query) {
    return this.db.deleteOne(this.collection, query);
  }

  async deleteAll() {
    return this.db.deleteAll(this.collection);
  }

  async count(query = {}) {
    return this.db.count(this.collection, query);
  }
}

module.exports = BaseRepository;