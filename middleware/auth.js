const { admin, isFirebaseAdminInitialized } = require('../utils/firebaseAdmin');
const db = require('../database/db');

async function loadUser(decoded) {
  let user = null;
  try {
    user = await db.findOne('users', { firebaseUid: decoded.uid });
  } catch (err) {
    user = null;
  }
  return {
    id: decoded.uid,
    firebaseUid: decoded.uid,
    email: decoded.email || null,
    name: decoded.name || (decoded.email ? decoded.email.split('@')[0] : null),
    avatar: decoded.picture || null,
    role: user ? user.role : 'user',
  };
}

function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  return null;
}

async function authenticate(req, res, next) {
  const idToken = extractToken(req);
  if (!idToken) {
    return res.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
  }

  if (!isFirebaseAdminInitialized()) {
    return res.status(500).json({ error: 'Auth provider not configured', code: 'AUTH_UNAVAILABLE' });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    req.user = await loadUser(decoded);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token', code: 'INVALID_TOKEN' });
  }
}

async function optionalAuth(req, res, next) {
  const idToken = extractToken(req);
  if (idToken) {
    try {
      if (isFirebaseAdminInitialized()) {
        const decoded = await admin.auth().verifyIdToken(idToken);
        req.user = await loadUser(decoded);
      }
    } catch {
      req.user = null;
    }
  }
  next();
}

function adminOnly(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required', code: 'ADMIN_REQUIRED' });
  }
  next();
}

const authenticateSSE = authenticate;

module.exports = { authenticate, optionalAuth, adminOnly, authenticateSSE };