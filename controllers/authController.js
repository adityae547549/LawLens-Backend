const { admin, isFirebaseAdminInitialized } = require('../utils/firebaseAdmin');
const db = require('../database/db');
const logger = require('../utils/logger');

function publicUser(user) {
  if (!user) return null;
  return { id: user.id, name: user.name, email: user.email, avatar: user.avatar || null, role: user.role };
}

function upsertUser(decoded) {
  return db.insertOne('users', {
    firebaseUid: decoded.uid,
    name: decoded.name || (decoded.email ? decoded.email.split('@')[0] : 'User'),
    email: decoded.email,
    avatar: decoded.picture || null,
    role: 'user',
    preferences: { theme: 'dark', notifications: true },
  });
}

function resolveUser({ registerAsNew = false } = {}) {
  return async (req, res) => {
    try {
      const { idToken } = req.body || {};
      if (!idToken) {
        return res.status(400).json({ error: 'Firebase ID token is required', code: 'MISSING_TOKEN' });
      }
      if (!isFirebaseAdminInitialized()) {
        return res.status(500).json({ error: 'Auth provider not configured', code: 'AUTH_UNAVAILABLE' });
      }

      const decoded = await admin.auth().verifyIdToken(idToken);
      let user = await db.findOne('users', { firebaseUid: decoded.uid });

      if (!user) {
        if (registerAsNew) {
          user = await upsertUser(decoded);
          logger.info('New user registered', { firebaseUid: decoded.uid, email: decoded.email });
          return res.status(201).json({ user: publicUser(user) });
        }
        user = await upsertUser(decoded);
        logger.info('New user auto-created on login', { firebaseUid: decoded.uid });
      } else if (registerAsNew) {
        return res.json({ user: publicUser(user) });
      }

      res.json({ user: publicUser(user) });
    } catch (error) {
      logger.error('Auth error', { message: error.message });
      if (error.code && error.code.startsWith('auth/')) {
        return res.status(401).json({ error: 'Invalid or expired token', code: 'INVALID_TOKEN' });
      }
      res.status(500).json({ error: 'Authentication failed', code: 'AUTH_FAILED' });
    }
  };
}

exports.register = resolveUser({ registerAsNew: true });
exports.login = resolveUser();

exports.googleAuth = async (req, res) => {
  try {
    const { idToken } = req.body || {};
    if (!idToken) {
      return res.status(400).json({ error: 'Firebase ID token is required', code: 'MISSING_TOKEN' });
    }
    if (!isFirebaseAdminInitialized()) {
      return res.status(500).json({ error: 'Auth provider not configured', code: 'AUTH_UNAVAILABLE' });
    }

    const decoded = await admin.auth().verifyIdToken(idToken);
    let user = await db.findOne('users', { firebaseUid: decoded.uid });

    if (!user) {
      user = await upsertUser(decoded);
      logger.info('New user created via Google auth', { firebaseUid: decoded.uid });
    } else {
      const updates = {};
      if (decoded.picture && !user.avatar) updates.avatar = decoded.picture;
      if (decoded.name && decoded.name !== user.name) updates.name = decoded.name;
      if (Object.keys(updates).length > 0) {
        user = (await db.updateOne('users', { id: user.id }, updates)) || user;
      }
    }

    res.json({ user: publicUser(user) });
  } catch (error) {
    logger.error('Google auth error', { message: error.message });
    if (error.code && error.code.startsWith('auth/')) {
      return res.status(401).json({ error: 'Invalid or expired token', code: 'INVALID_TOKEN' });
    }
    res.status(500).json({ error: 'Google authentication failed', code: 'GOOGLE_AUTH_FAILED' });
  }
};

exports.profile = async (req, res) => {
  try {
    const user = await db.findOne('users', { firebaseUid: req.user.id });
    if (!user) {
      return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
    }
    res.json({ user: publicUser(user) });
  } catch (error) {
    logger.error('Profile error', { message: error.message });
    res.status(500).json({ error: 'Failed to get profile', code: 'PROFILE_ERROR' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, preferences } = req.body || {};
    const updates = {};
    if (name && typeof name === 'string' && name.trim()) updates.name = name.trim();
    if (preferences && typeof preferences === 'object') updates.preferences = preferences;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid updates provided', code: 'NO_UPDATES' });
    }

    const user = await db.updateOne('users', { firebaseUid: req.user.id }, updates);
    if (!user) {
      return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
    }
    res.json({ user: publicUser(user) });
  } catch (error) {
    logger.error('Update profile error', { message: error.message });
    res.status(500).json({ error: 'Failed to update profile', code: 'PROFILE_UPDATE_FAILED' });
  }
};