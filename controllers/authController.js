const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
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
    const existing = db.findOne('users', { email });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = db.insertOne('users', {
      name,
      email,
      password: hashedPassword,
      role: 'user',
      preferences: { theme: 'dark', notifications: true }
    });
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const user = db.findOne('users', { email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (!user.password) {
      return res.status(401).json({ error: 'This account uses Google Sign-In. Please use "Continue with Google" to login.' });
    }
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

exports.profile = async (req, res) => {
  try {
    const user = db.findById('users', req.user.id);
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
    const user = db.updateOne('users', { id: req.user.id }, updates);
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
