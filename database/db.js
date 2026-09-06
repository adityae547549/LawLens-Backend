let sqliteDb = null;
let jsonDb = null;

const USE_SQLITE = process.env.DB_ENGINE !== 'json';

if (USE_SQLITE) {
  try {
    sqliteDb = require('./sqlite');
    console.log('[DB] Using SQLite');
  } catch (err) {
    console.warn(`[DB] SQLite unavailable (${err.message}), falling back to JSON`);
    jsonDb = require('./json');
  }
} else {
  jsonDb = require('./json');
  console.log('[DB] Using JSON (DB_ENGINE=json)');
}

module.exports = sqliteDb || jsonDb;
