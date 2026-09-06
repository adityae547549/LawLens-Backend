const { admin, isFirebaseAdminInitialized } = require('../utils/firebaseAdmin');
const db = require('../database/db');

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const idToken = authHeader.split(' ')[1];

  if (!isFirebaseAdminInitialized()) {
    return res.status(500).json({ error: 'Auth provider not configured' });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const user = db.findOne('users', { firebaseUid: decoded.uid });
    req.user = {
      id: user ? user.id : null,
      firebaseUid: decoded.uid,
      email: decoded.email || null,
      name: decoded.name || (decoded.email ? decoded.email.split('@')[0] : null),
      avatar: decoded.picture || null,
      role: user ? user.role : 'user',
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const idToken = authHeader.split(' ')[1];
      if (isFirebaseAdminInitialized()) {
        const decoded = await admin.auth().verifyIdToken(idToken);
        const user = db.findOne('users', { firebaseUid: decoded.uid });
        req.user = {
          id: user ? user.id : null,
          firebaseUid: decoded.uid,
          email: decoded.email || null,
          name: decoded.name || (decoded.email ? decoded.email.split('@')[0] : null),
          avatar: decoded.picture || null,
          role: user ? user.role : 'user',
        };
      }
    } catch {
      req.user = null;
    }
  }
  next();
}

function adminOnly(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

async function authenticateSSE(req, res, next) {
  const authHeader = req.headers.authorization;
  let idToken;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    idToken = authHeader.split(' ')[1];
  } else if (req.query && req.query.token) {
    idToken = req.query.token;
  }
  if (!idToken) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!isFirebaseAdminInitialized()) {
    return res.status(500).json({ error: 'Auth provider not configured' });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const user = db.findOne('users', { firebaseUid: decoded.uid });
    req.user = {
      id: user ? user.id : null,
      firebaseUid: decoded.uid,
      email: decoded.email || null,
      name: decoded.name || (decoded.email ? decoded.email.split('@')[0] : null),
      avatar: decoded.picture || null,
      role: user ? user.role : 'user',
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { authenticate, optionalAuth, adminOnly, authenticateSSE };
