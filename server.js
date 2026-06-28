const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const https = require('https');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const fs = require('fs');
const passport = require('./middleware/googleAuth');

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
  contentSecurityPolicy: false
}));
app.use(cors({
  origin: (origin, callback) => {
    const allowed = (process.env.CORS_ORIGIN || '*').split(',').map(s => s.trim());
    if (!origin || allowed.includes('*') || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS: origin not allowed'));
    }
  },
  credentials: true
}));
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(passport.initialize());

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

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

const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
const hasFrontend = fs.existsSync(FRONTEND_DIR);

if (hasFrontend) {
  app.use(express.static(FRONTEND_DIR, {
    maxAge: process.env.NODE_ENV === 'production' ? '7d' : 0,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
      if (filePath.endsWith('.js') || filePath.endsWith('.css')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000');
      }
      if (filePath.endsWith('.json') && filePath.includes('manifest')) {
        res.setHeader('Content-Type', 'application/manifest+json');
      }
    }
  }));

  app.get('/sw.js', (req, res) => {
    res.sendFile(path.join(FRONTEND_DIR, 'sw.js'), {
      headers: { 'Content-Type': 'application/javascript', 'Cache-Control': 'no-cache' }
    });
  });

  app.get('/manifest.json', (req, res) => {
    res.sendFile(path.join(FRONTEND_DIR, 'manifest.json'), {
      headers: { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'public, max-age=3600' }
    });
  });

  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint not found' });
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
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.json({ message: 'LawLens API is running. Frontend is hosted separately on Firebase.' });
  });
}

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', message: process.env.NODE_ENV === 'development' ? err.message : undefined });
});

function selfPing() {
  const url = SELF_URL + '/health';
  https.get(url, (res) => {
    console.log(`[KeepAlive] Ping ${res.statusCode}`);
  }).on('error', (err) => {
    console.error(`[KeepAlive] Ping failed: ${err.message}`);
  });
}

const server = app.listen(PORT, () => {
  console.log(`LawLens server running on port ${PORT}`);

  if (process.env.NODE_ENV === 'production' && SELF_URL && !SELF_URL.includes('localhost')) {
    selfPing();
    setInterval(selfPing, 10 * 60 * 1000);
    console.log(`[KeepAlive] Self-ping active every 10 minutes → ${SELF_URL}`);
  }
});

server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;
