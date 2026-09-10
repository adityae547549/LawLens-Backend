const fs = require('fs');
const path = require('path');

const BACKEND_DIR = path.resolve(__dirname, '..');
const COLLECTIONS = ['users', 'conversations', 'bookmarks', 'searchHistory', 'documents', 'workspaces', 'shares', 'feedback', 'analytics', 'settings'];

const { isFirebaseAdminInitialized } = require('../utils/firebaseAdmin');

async function main() {
  if (!isFirebaseAdminInitialized()) {
    console.error('Firebase Admin is not initialized. Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT in backend/.env');
    process.exit(1);
  }

  const FirestoreDatabase = require('../database/firestore');
  const store = new FirestoreDatabase();

  const legacyDir = path.join(BACKEND_DIR, 'database');
  const isEmptyDir = !fs.existsSync(legacyDir) || fs.readdirSync(legacyDir).length === 0;
  if (isEmptyDir) {
    console.log('No legacy JSON data found. Nothing to migrate.');
    process.exit(0);
  }

  for (const collection of COLLECTIONS) {
    const file = path.join(legacyDir, `${collection}.json`);
    if (!fs.existsSync(file)) continue;

    const items = JSON.parse(fs.readFileSync(file, 'utf-8'));
    if (!Array.isArray(items) || items.length === 0) continue;

    let migrated = 0;
    for (const item of items) {
      await store.insertOne(collection, item);
      migrated++;
    }
    console.log(`Migrated ${collection}: ${migrated} docs`);
  }

  console.log('Migration complete.');
  process.exit(0);
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});