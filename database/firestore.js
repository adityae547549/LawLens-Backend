const { v4: uuidv4 } = require('uuid');
const { admin, isFirebaseAdminInitialized } = require('../utils/firebaseAdmin');

/**
 * Firestore-backed repository adapter.
 *
 * Implements the same interface as database/json.js so that the rest of the
 * backend can switch storage engines without changing controller code.
 *
 * Identity:
 * - users   -> document id = Firebase UID (stable cross-provider identity)
 * - others  -> document id = generated UUID, scoped by a userId/firebaseUid field
 *
 * All reads are scoped through the most discriminating single field first and
 * then filtered in memory, which avoids requiring Firestore composite indexes
 * for the small, user-scoped collections LawLens works with.
 */
class FirestoreDatabase {
  constructor() {
    if (!isFirebaseAdminInitialized()) {
      throw new Error('Firestore adapter requires Firebase Admin to be initialized');
    }
    this.db = admin.firestore();
  }

  _col(collection) {
    return this.db.collection(collection);
  }

  _toDoc(ref, snap) {
    if (!snap.exists) return null;
    return { id: snap.id, ...snap.data() };
  }

  async _queryDocs(collection, query) {
    const ref = this._col(collection);
    const keys = Object.keys(query);

    if (keys.length === 0) {
      const snap = await ref.get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    let firstWhere = ref.where(keys[0], '==', query[keys[0]]);
    const snap = await firstWhere.get();
    const candidates = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (keys.length === 1) return candidates;

    return candidates.filter(item => keys.every(k => item[k] === query[k]));
  }

  async findAll(collection, query = {}) {
    return this._queryDocs(collection, query);
  }

  async findById(collection, id) {
    const snap = await this._col(collection).doc(id).get();
    return this._toDoc(collection, snap);
  }

  async findOne(collection, query) {
    const keys = Object.keys(query);
    if (keys.length === 0) {
      const snap = await this._col(collection).limit(1).get();
      return snap.docs.length ? this._toDoc(collection, snap.docs[0]) : null;
    }
    if (keys.includes('id')) {
      const doc = await this.findById(collection, query.id);
      if (!doc) return null;
      const match = keys.every(k => k === 'id' || doc[k] === query[k]);
      return match ? doc : null;
    }
    const matches = await this._queryDocs(collection, query);
    return matches.length ? matches[0] : null;
  }

  async insertOne(collection, doc) {
    const now = new Date().toISOString();
    const isUser = collection === 'users';
    const id = isUser && doc.firebaseUid ? doc.firebaseUid : (doc.id || uuidv4());
    const fullDoc = { id, createdAt: now, ...doc, updatedAt: now };
    delete fullDoc.id;
    if (isUser && !fullDoc.firebaseUid) fullDoc.firebaseUid = id;
    await this._col(collection).doc(id).set(fullDoc);
    return { id, ...fullDoc };
  }

  async updateOne(collection, query, updates) {
    const existing = await this.findOne(collection, query);
    if (!existing) return null;
    const merged = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    delete merged.id;
    await this._col(collection).doc(existing.id).set(merged, { merge: true });
    return { id: existing.id, ...merged };
  }

  async deleteOne(collection, query) {
    const existing = await this.findOne(collection, query);
    if (!existing) return false;
    await this._col(collection).doc(existing.id).delete();
    return true;
  }

  async deleteAll(collection) {
    const snap = await this._col(collection).get();
    const batch = this.db.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    if (snap.size) await batch.commit();
  }

  async count(collection, query = {}) {
    if (Object.keys(query).length === 0) {
      const snap = await this._col(collection).get();
      return snap.size;
    }
    return (await this._queryDocs(collection, query)).length;
  }

  async close() {}
}

module.exports = FirestoreDatabase;