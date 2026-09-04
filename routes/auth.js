const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const passport = require('../middleware/googleAuth');
const db = require('../database/db');

const validate = require('../middleware/validate');
const { registerSchema, loginSchema, profileUpdateSchema, googleAuthSchema } = require('../validators');

const hasGoogleOAuth = process.env.GOOGLE_CLIENT_ID
  && process.env.GOOGLE_CLIENT_SECRET
  && process.env.GOOGLE_CLIENT_ID !== 'your-google-client-id-here';

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.get('/profile', authenticate, authController.profile);
router.put('/profile', authenticate, validate(profileUpdateSchema), authController.updateProfile);

router.post('/google', validate(googleAuthSchema), async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: 'Firebase ID token is required' });
    }

    // SECURITY: Verify the token with Google's public endpoint rather than
    // base64-decoding the payload locally. Google's endpoint validates the
    // cryptographic signature, preventing forged-token attacks.
    let payload;
    try {
      const response = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
      );
      if (!response.ok) {
        return res.status(401).json({ error: 'Invalid or expired Firebase token' });
      }
      payload = await response.json();
    } catch (e) {
      return res.status(401).json({ error: 'Could not verify Firebase token' });
    }

    const email = payload.email;
    const name = payload.name || (email ? email.split('@')[0] : 'User');
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
