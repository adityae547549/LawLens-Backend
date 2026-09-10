const { admin, isFirebaseAdminInitialized } = require('../utils/firebaseAdmin');

const EXEMPT_PREFIXES = ['/config', '/feedback', '/health'];
const ENFORCE = process.env.APP_CHECK_ENFORCE === 'true';

let warnedMissing = false;

module.exports = function appCheck(req, res, next) {
  if (req.method === 'OPTIONS') return next();

  const path = req.path || req.originalUrl || '';
  if (EXEMPT_PREFIXES.some((p) => path.startsWith(p))) return next();

  const token = req.headers['x-firebase-appcheck'];

  if (!token) {
    if (ENFORCE) {
      return res.status(401).json({ error: 'App Check token missing', code: 'APP_CHECK_REQUIRED' });
    }
    if (!warnedMissing) {
      console.warn('[AppCheck] Monitoring mode: request without App Check token allowed (set APP_CHECK_ENFORCE=true to require).');
      warnedMissing = true;
    }
    return next();
  }

  if (!isFirebaseAdminInitialized()) {
    return next();
  }

  admin.appCheck()
    .verifyToken(token)
    .then((decoded) => {
      req.appCheck = decoded;
      next();
    })
    .catch((err) => {
      if (ENFORCE) {
        return res.status(401).json({ error: 'Invalid App Check token', code: 'APP_CHECK_INVALID' });
      }
      console.warn(`[AppCheck] Monitoring mode: invalid token ignored: ${err.message}`);
      next();
    });
};