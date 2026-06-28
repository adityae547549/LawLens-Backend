const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const passport = require('../middleware/googleAuth');
const db = require('../database/db');

const hasGoogleOAuth = process.env.GOOGLE_CLIENT_ID
  && process.env.GOOGLE_CLIENT_SECRET
  && process.env.GOOGLE_CLIENT_ID !== 'your-google-client-id-here';

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/profile', authenticate, authController.profile);
router.put('/profile', authenticate, authController.updateProfile);

router.post('/google', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: 'Firebase ID token is required' });
    }

    let payload;
    try {
      const parts = idToken.split('.');
      if (parts.length !== 3) throw new Error('Invalid token format');
      payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    } catch (e) {
      return res.status(401).json({ error: 'Invalid Firebase token' });
    }

    const email = payload.email;
    const name = payload.name || payload.email.split('@')[0];
    const avatar = payload.picture || null;
    const googleId = payload.sub;

    if (!email) {
      return res.status(401).json({ error: 'No email found in Firebase token' });
    }

    let user = db.findOne('users', { email });

    if (!user) {
      user = db.insertOne('users', {
        name,
        email,
        password: null,
        googleId,
        avatar,
        role: 'user',
        preferences: { theme: 'dark', notifications: true }
      });
    } else {
      const updates = {};
      if (!user.googleId) updates.googleId = googleId;
      if (avatar && !user.avatar) updates.avatar = avatar;
      if (Object.keys(updates).length > 0) {
        user = db.updateOne('users', { id: user.id }, updates) || user;
      }
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
    console.error('Google auth error:', error);
    res.status(500).json({ error: 'Google authentication failed' });
  }
});

if (hasGoogleOAuth) {
  router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

  router.get('/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: '/login.html?error=google_failed' }),
    (req, res) => {
      const user = req.user;
      const token = jwt.sign(
        { id: user.id, email: user.email, name: user.name, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      const html = `<!DOCTYPE html><html><head><title>Authenticating...</title></head><body>
        <script>
          window.opener.postMessage({
            type: 'google_auth_success',
            token: '${token}',
            user: ${JSON.stringify({ id: user.id, name: user.name, email: user.email, role: user.role })}
          }, window.location.origin);
          window.close();
        </script>
        <p>Signing in... You may close this window.</p>
      </body></html>`;
      res.send(html);
    }
  );
}

module.exports = router;
