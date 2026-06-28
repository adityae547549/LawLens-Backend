const passport = require('passport');
const db = require('../database/db');

const hasGoogleOAuth = process.env.GOOGLE_CLIENT_ID
  && process.env.GOOGLE_CLIENT_SECRET
  && process.env.GOOGLE_CLIENT_ID !== 'your-google-client-id-here';

if (hasGoogleOAuth) {
  const GoogleStrategy = require('passport-google-oauth20').Strategy;

  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
    scope: ['profile', 'email']
  }, (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
      if (!email) {
        return done(new Error('No email found from Google account'), null);
      }

      let user = db.findOne('users', { email });

      if (!user) {
        user = db.insertOne('users', {
          name: profile.displayName || email.split('@')[0],
          email,
          password: null,
          googleId: profile.id,
          avatar: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
          role: 'user',
          preferences: { theme: 'dark', notifications: true }
        });
      } else if (!user.googleId) {
        db.updateOne('users', { id: user.id }, { googleId: profile.id });
      }

      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }));

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser((id, done) => {
    const user = db.findById('users', id);
    done(null, user);
  });
}

module.exports = passport;
