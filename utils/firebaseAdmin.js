const admin = require('firebase-admin');

let initialized = false;

function initFirebaseAdmin() {
  if (initialized) return;

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  const projectId = process.env.FIREBASE_PROJECT_ID;

  if (serviceAccount) {
    try {
      const parsed = typeof serviceAccount === 'string' ? JSON.parse(serviceAccount) : serviceAccount;
      admin.initializeApp({
        credential: admin.credential.cert(parsed),
      });
      initialized = true;
      console.log('[Firebase] Admin initialized with service account');
      return;
    } catch (e) {
      console.error('[Firebase] Failed to parse FIREBASE_SERVICE_ACCOUNT:', e.message);
    }
  }

  if (projectId) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId,
    });
    initialized = true;
    console.log('[Firebase] Admin initialized with application default credentials');
    return;
  }

  console.warn('[Firebase] Admin not initialized — no credentials found. Google auth will not work.');
}

function isFirebaseAdminInitialized() {
  return initialized;
}

module.exports = { initFirebaseAdmin, isFirebaseAdminInitialized, admin };
