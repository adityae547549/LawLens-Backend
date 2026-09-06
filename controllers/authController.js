const { admin, isFirebaseAdminInitialized } = require('../utils/firebaseAdmin');
const db = require('../database/db');

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    if (!isFirebaseAdminInitialized()) {
      return res.status(500).json({ error: 'Auth provider not configured' });
    }

    let firebaseUser;
    try {
      firebaseUser = await admin.auth().createUser({
        email,
        password,
        displayName: name,
      });
    } catch (e) {
      if (e.code === 'auth/email-already-exists') {
        return res.status(409).json({ error: 'Email already registered' });
      }
      throw e;
    }

    const user = db.insertOne('users', {
      firebaseUid: firebaseUser.uid,
      name,
      email,
      role: 'user',
      preferences: { theme: 'dark', notifications: true },
    });

    res.status(201).json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

exports.login = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: 'Firebase ID token is required' });
    }

    if (!isFirebaseAdminInitialized()) {
      return res.status(500).json({ error: 'Auth provider not configured' });
    }

    const decoded = await admin.auth().verifyIdToken(idToken);
    let user = db.findOne('users', { firebaseUid: decoded.uid });

    if (!user) {
      user = db.insertOne('users', {
        firebaseUid: decoded.uid,
        name: decoded.name || (decoded.email ? decoded.email.split('@')[0] : 'User'),
        email: decoded.email,
        role: 'user',
        preferences: { theme: 'dark', notifications: true },
      });
    }

    res.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ error: 'Login failed' });
  }
};

exports.googleAuth = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: 'Firebase ID token is required' });
    }

    if (!isFirebaseAdminInitialized()) {
      return res.status(500).json({ error: 'Auth provider not configured' });
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
    } else {
      const updates = {};
      if (decoded.picture && !user.avatar) updates.avatar = decoded.picture;
      if (Object.keys(updates).length > 0) {
        user = db.updateOne('users', { id: user.id }, updates) || user;
      }
    }

    res.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ error: 'Google authentication failed' });
  }
};

exports.profile = async (req, res) => {
  try {
    let user = null;
    if (req.user.id) {
      user = db.findById('users', req.user.id);
    } else if (req.user.firebaseUid) {
      user = db.findOne('users', { firebaseUid: req.user.firebaseUid });
    }
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const { password, ...userData } = user;
    res.json({ user: userData });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, preferences } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (preferences) updates.preferences = preferences;

    let user = null;
    if (req.user.id) {
      user = db.updateOne('users', { id: req.user.id }, updates);
    } else if (req.user.firebaseUid) {
      user = db.updateOne('users', { firebaseUid: req.user.firebaseUid }, updates);
    }
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const { password, ...userData } = user;
    res.json({ user: userData });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};
