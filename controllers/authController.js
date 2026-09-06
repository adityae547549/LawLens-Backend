const { admin, isFirebaseAdminInitialized } = require('../utils/firebaseAdmin');
const db = require('../database/db');
const logger = require('../utils/logger');

exports.register = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: 'Firebase ID token is required', code: 'MISSING_TOKEN' });
    }
    if (!isFirebaseAdminInitialized()) {
      return res.status(500).json({ error: 'Auth provider not configured', code: 'AUTH_UNAVAILABLE' });
    }

    const decoded = await admin.auth().verifyIdToken(idToken);
    let user = db.findOne('users', { firebaseUid: decoded.uid });

    if (user) {
      return res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    }

    user = db.insertOne('users', {
      firebaseUid: decoded.uid,
      name: decoded.name || (decoded.email ? decoded.email.split('@')[0] : 'User'),
      email: decoded.email,
      avatar: decoded.picture || null,
      role: 'user',
      preferences: { theme: 'dark', notifications: true },
    });

    logger.info('New user registered', { firebaseUid: decoded.uid, email: decoded.email });
    res.status(201).json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    logger.error('Register error', { message: error.message });
    if (error.code && error.code.startsWith('auth/')) {
      return res.status(401).json({ error: 'Invalid or expired token', code: 'INVALID_TOKEN' });
    }
    res.status(500).json({ error: 'Registration failed', code: 'REGISTRATION_FAILED' });
  }
};

exports.login = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: 'Firebase ID token is required', code: 'MISSING_TOKEN' });
    }
    if (!isFirebaseAdminInitialized()) {
      return res.status(500).json({ error: 'Auth provider not configured', code: 'AUTH_UNAVAILABLE' });
    }

    const decoded = await admin.auth().verifyIdToken(idToken);
    let user = db.findOne('users', { firebaseUid: decoded.uid });

    if (!user) {
      user = db.insertOne('users', {
        firebaseUid: decoded.uid,
        name: decoded.name || (decoded.email ? decoded.email.split('@')[0] : 'User'),
        email: decoded.email,
        avatar: decoded.picture || null,
        role: 'user',
        preferences: { theme: 'dark', notifications: true },
      });
      logger.info('New user auto-created on login', { firebaseUid: decoded.uid });
    }

    res.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    logger.error('Login error', { message: error.message });
    if (error.code && error.code.startsWith('auth/')) {
      return res.status(401).json({ error: 'Invalid or expired token', code: 'INVALID_TOKEN' });
    }
    res.status(500).json({ error: 'Login failed', code: 'LOGIN_FAILED' });
  }
};

exports.googleAuth = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: 'Firebase ID token is required', code: 'MISSING_TOKEN' });
    }
    if (!isFirebaseAdminInitialized()) {
      return res.status(500).json({ error: 'Auth provider not configured', code: 'AUTH_UNAVAILABLE' });
    }

    const decoded = await admin.auth().verifyIdToken(idToken);
    let user = db.findOne('users', { firebaseUid: decoded.uid });

    if (!user) {
      user = db.insertOne('users', {
        firebaseUid: decoded.uid,
        name: decoded.name || (decoded.email ? decoded.email.split('@')[0] : 'User'),
        email: decoded.email,
        avatar: decoded.picture || null,
        role: 'user',
        preferences: { theme: 'dark', notifications: true },
      });
      logger.info('New user created via Google auth', { firebaseUid: decoded.uid });
    } else {
      const updates = {};
      if (decoded.picture && !user.avatar) updates.avatar = decoded.picture;
      if (decoded.name && decoded.name !== user.name) updates.name = decoded.name;
      if (Object.keys(updates).length > 0) {
        user = db.updateOne('users', { id: user.id }, updates) || user;
      }
    }

    res.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
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
    let user = null;
    if (req.user.firebaseUid) {
      user = db.findOne('users', { firebaseUid: req.user.firebaseUid });
    } else if (req.user.id) {
      user = db.findById('users', req.user.id);
    }
    if (!user) {
      return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
    }
    const { password, ...userData } = user;
    res.json({ user: userData });
  } catch (error) {
    logger.error('Profile error', { message: error.message });
    res.status(500).json({ error: 'Failed to get profile', code: 'PROFILE_ERROR' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, preferences } = req.body;
    const updates = {};
    if (name && typeof name === 'string' && name.trim()) updates.name = name.trim();
    if (preferences && typeof preferences === 'object') updates.preferences = preferences;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid updates provided', code: 'NO_UPDATES' });
    }

    let user = null;
    if (req.user.firebaseUid) {
      user = db.updateOne('users', { firebaseUid: req.user.firebaseUid }, updates);
    } else if (req.user.id) {
      user = db.updateOne('users', { id: req.user.id }, updates);
    }
    if (!user) {
      return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
    }
    const { password, ...userData } = user;
    res.json({ user: userData });
  } catch (error) {
    logger.error('Update profile error', { message: error.message });
    res.status(500).json({ error: 'Failed to update profile', code: 'PROFILE_UPDATE_FAILED' });
  }
};
