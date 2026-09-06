const fs = require('fs');
const path = require('path');
const db = require('../database/db');

const DATA_DIR = path.join(__dirname, '..', 'database');

const COLLECTIONS = [
  'users',
  'conversations',
  'bookmarks',
  'documents',
  'searchHistory',
  'feedback',
  'analytics',
  'settings',
  'shares',
  'workspaces',
  'requests'
];

function migrate() {
  console.log('=== LawLens Database Migration ===');
  console.log('Migrating from JSON files to SQLite...\n');

  let totalRows = 0;

  for (const collection of COLLECTIONS) {
    const jsonFile = path.join(DATA_DIR, `${collection}.json`);

    if (!fs.existsSync(jsonFile)) {
      console.log(`  ${collection}: no JSON file found, skipping`);
      continue;
    }

    try {
      const raw = fs.readFileSync(jsonFile, 'utf-8');
      const items = JSON.parse(raw);

      if (!Array.isArray(items) || items.length === 0) {
        console.log(`  ${collection}: empty, skipping`);
        continue;
      }

      for (const item of items) {
        db.insertOne(collection, item);
      }

      console.log(`  ${collection}: ${items.length} rows migrated`);
      totalRows += items.length;
    } catch (err) {
      console.error(`  ${collection}: ERROR - ${err.message}`);
    }
  }

  console.log(`\nMigration complete. Total rows: ${totalRows}`);
  console.log(`SQLite database: ${path.join(DATA_DIR, 'lawlens.db')}`);

  // Verify
  console.log('\nVerification:');
  for (const collection of COLLECTIONS) {
    const count = db.count(collection);
    if (count > 0) {
      console.log(`  ${collection}: ${count} rows`);
    }
  }

  db.close();
}

migrate();
