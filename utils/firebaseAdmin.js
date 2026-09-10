const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

let initialized = false;
let mode = 'none';

function initFirebaseAdmin() {
  if (initialized) return;

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const projectId = process.env.FIREBASE_PROJECT_ID;

  if (serviceAccountPath) {
    try {
      const resolved = path.resolve(serviceAccountPath);
      if (fs.existsSync(resolved)) {
        const parsed = JSON.parse(fs.readFileSync(resolved, 'utf8'));
        admin.initializeApp({ credential: admin.credential.cert(parsed) });
        initialized = true;
        mode = 'service_account';
        console.log('[Firebase] Admin initialized with service account file');
        return;
      }
      console.error(`[Firebase] FIREBASE_SERVICE_ACCOUNT_PATH does not exist: ${resolved}`);
    } catch (e) {
      console.error('[Firebase] Failed to parse FIREBASE_SERVICE_ACCOUNT_PATH:', e.message);
    }
  }

  if (serviceAccount) {
    try {
      const parsed = typeof serviceAccount === 'string' ? JSON.parse(serviceAccount) : serviceAccount;
      admin.initializeApp({
        credential: admin.credential.cert(parsed),
      });
      initialized = true;
      mode = 'service_account';
      console.log('[Firebase] Admin initialized with service account');
      return;
    } catch (e) {
      console.error(
        `[Firebase] FIREBASE_SERVICE_ACCOUNT failed to parse (value length ${serviceAccount.length}, ` +
        `starts with "${serviceAccount.slice(0, 24)}"): ${e.message}`
      );
      console.error('[Firebase] Expects a single-line JSON object, e.g. {"type":"service_account",...} — not a file name.');
    }
  }

  if (projectId) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId,
    });
    initialized = true;
    mode = 'application_default';
    console.log('[Firebase] Admin initialized with application default credentials');
    console.warn('[Firebase] Application default credentials only work on Google Cloud or with GOOGLE_APPLICATION_CREDENTIALS set.');
    return;
  }

  console.warn('[Firebase] Admin not initialized — no credentials found. Google auth will not work.');
}

function isFirebaseAdminInitialized() {
  return initialized;
}

function getFirebaseMode() {
  return mode;
}

module.exports = { initFirebaseAdmin, isFirebaseAdminInitialized, getFirebaseMode, admin };
