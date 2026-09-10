const { isFirebaseAdminInitialized, initFirebaseAdmin, getFirebaseMode } = require('../utils/firebaseAdmin');

/**
 * Database engine selection.
 *
 * - Firestore (async) is used when Firebase Admin credentials are configured.
 * - JSON file store (sync) is the zero-config fallback for local dev.
 *
 * Both engines expose the same interface. JSON methods return plain values;
 * Firestore methods return Promises. Controllers `await` every call, which is
 * safe for both.
 */
function selectEngine() {
  if (process.env.DB_ENGINE === 'json') {
    return { engine: 'json', db: require('./json') };
  }

  if (!isFirebaseAdminInitialized()) {
    try {
      initFirebaseAdmin();
    } catch (err) {
      console.warn(`[DB] Firebase Admin init failed (${err.message})`);
    }
  }

  if (isFirebaseAdminInitialized()) {
    try {
      const FirestoreDatabase = require('./firestore');
      return { engine: 'firestore', db: new FirestoreDatabase() };
    } catch (err) {
      console.warn(`[DB] Firestore unavailable (${err.message}), falling back to JSON`);
    }
  }

  return { engine: 'json', db: require('./json') };
}

const { engine, db } = selectEngine();
console.log(`[DB] Using ${engine} engine`);

module.exports = db;
module.exports.engine = engine;