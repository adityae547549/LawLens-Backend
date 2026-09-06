const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const https = require('https');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const fs = require('fs');
const logger = require('./utils/logger');
const multer = require('multer');
const { initFirebaseAdmin } = require('./utils/firebaseAdmin');

initFirebaseAdmin();

const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const searchRoutes = require('./routes/search');
const uploadRoutes = require('./routes/upload');
const articlesRoutes = require('./routes/articles');
const bookmarksRoutes = require('./routes/bookmarks');
const historyRoutes = require('./routes/history');
const adminRoutes = require('./routes/admin');
const analyticsRoutes = require('./routes/analytics');
const shareRoutes = require('./routes/share');
const constitutionRoutes = require('./routes/constitution');
const aiRoutes = require('./routes/ai');
const summarizerRoutes = require('./routes/summarizer');
const workspaceRoutes = require('./routes/workspace');
const feedbackRoutes = require('./routes/feedback');
const configRoutes = require('./routes/config');
const knowledgeRoutes = require('./routes/knowledge');
const studioRoutes = require('./routes/studio');

const app = express();
const PORT = process.env.PORT || 3000;
const SELF_URL = process.env.RENDER_EXTERNAL_URL || process.env.SELF_URL || `http://localhost:${PORT}`;

app.set('trust proxy', 1);

const uploadDir = path.resolve(__dirname, process.env.UPLOAD_DIR || './uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));

app.use(compression());
app.use(logger.requestMiddleware);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.', code: 'RATE_LIMITED' },
});
app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many authentication attempts, please try again later.', code: 'AUTH_RATE_LIMITED' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'AI request limit reached. Please wait before trying again.', code: 'AI_RATE_LIMITED' },
});
app.use('/api/chat', aiLimiter);
app.use('/api/ai', aiLimiter);

const healthCheck = (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    firebase: require('./utils/firebaseAdmin').isFirebaseAdminInitialized() ? 'configured' : 'not_configured',
  });
};
app.get('/health', healthCheck);
app.get('/api/health', healthCheck);

app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/articles', articlesRoutes);
app.use('/api/bookmarks', bookmarksRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/share', shareRoutes);
app.use('/api/constitution', constitutionRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/summarizer', summarizerRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/config', configRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/studio', studioRoutes);

const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
const hasFrontend = fs.existsSync(FRONTEND_DIR);

if (hasFrontend) {
  app.use(express.static(FRONTEND_DIR, {
    maxAge: process.env.NODE_ENV === 'production' ? '7d' : 0,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    }
  }));

  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint not found', code: 'NOT_FOUND' });
    }
    const cleanPath = req.path.split('?')[0];
    const fileName = cleanPath === '/' ? 'index.html' : `${cleanPath.slice(1)}.html`;
    const filePath = path.join(FRONTEND_DIR, fileName);
    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath);
    }
    res.sendFile(path.join(FRONTEND_DIR, '404.html'));
  });
} else {
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint not found', code: 'NOT_FOUND' });
    }
    res.json({ message: 'LawLens API is running. Frontend is hosted separately on Firebase.' });
  });
}

app.use((err, req, res, next) => {
  logger.error(err.message || 'Unhandled server error', { stack: err.stack, path: req.path, method: req.method });

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File too large. Maximum size is 10MB.', code: 'FILE_TOO_LARGE' });
    }
    return res.status(400).json({ error: `Upload error: ${err.message}`, code: 'UPLOAD_ERROR' });
  }

  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({ error: 'CORS: origin not allowed', code: 'CORS_BLOCKED' });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON in request body', code: 'INVALID_JSON' });
  }

  res.status(500).json({
    error: 'Internal server error',
    code: 'SERVER_ERROR',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

function selfPing() {
  const url = SELF_URL + '/health';
  https.get(url, (res) => {
    logger.info(`[KeepAlive] Ping ${res.statusCode}`);
  }).on('error', (err) => {
    logger.error(`[KeepAlive] Ping failed: ${err.message}`);
  });
}

const server = app.listen(PORT, () => {
  logger.info(`LawLens server running on port ${PORT}`);

  if (process.env.NODE_ENV === 'production' && SELF_URL && !SELF_URL.includes('localhost')) {
    selfPing();
    setInterval(selfPing, 1 * 60 * 1000);
    logger.info(`[KeepAlive] Self-ping active every 1 minute`);
  }
});

server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

function gracefulShutdown(signal) {
  logger.info(`Received ${signal}. Shutting down HTTP server gracefully...`);
  server.close(() => {
    logger.info('HTTP server closed cleanly.');
    try { require('./database/db').close(); } catch {}
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', { message: err.message, stack: err.stack });
  gracefulShutdown('uncaughtException');
});
