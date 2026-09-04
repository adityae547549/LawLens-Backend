# LawLens Backend

**AI-Powered Legal Research API**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)
[![Render](https://img.shields.io/badge/Render-Deploy-purple.svg)](https://render.com/)

RESTful API backend for the LawLens legal research platform. Uses RAG (Retrieval-Augmented Generation) with Groq AI to provide accurate, sourced answers from Indian legal documents.

**Part of [LawLens](https://github.com/adityae547549/LawLens)**

---

## Features

- **RAG Pipeline** — Embeddings, retrieval, reranking, and generation
- **AI Chat** — Natural language legal Q&A with source citations
- **Knowledge Graph** — Cross-referencing and relationship mapping
- **Document Processing** — PDF, DOCX, TXT, JSON, Markdown parsing
- **Vector Store** — TF-IDF style semantic search
- **JWT Auth** — Secure authentication with bcrypt
- **Admin API** — User management, prompts, datasets, metrics
- **Self-Healing** — Automatic data consistency and corruption repair
- **Legal Sync** — Automated legal document synchronization

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Node.js 18+ |
| Framework | Express.js |
| AI | Groq API (Llama 3.3 70B) |
| Auth | JWT + bcrypt |
| Search | Custom TF-IDF vector store |
| Storage | JSON file-based |
| Container | Docker (Alpine) |
| Deployment | Render (Docker) |

## Project Structure

```
backend/
├── server.js                 # Express entry point
├── package.json              # Dependencies
├── .env.example              # Environment template
├── routes/                   # API route definitions
│   ├── auth.js               # Authentication
│   ├── chat.js               # AI chat
│   ├── search.js             # Document search
│   ├── articles.js           # Article viewer
│   ├── bookmarks.js          # User bookmarks
│   ├── history.js            # Activity history
│   ├── admin.js              # Admin endpoints
│   ├── upload.js             # File upload
│   ├── studio.js             # Studio features
│   └── ...
├── controllers/              # Route handlers
│   ├── authController.js
│   ├── chatController.js
│   ├── searchController.js
│   ├── adminController.js
│   └── ...
├── middleware/                # Express middleware
│   ├── auth.js               # JWT verification
│   ├── googleAuth.js         # Google OAuth
│   ├── upload.js             # Multer config
│   ├── rateLimiter.js        # Rate limiting
│   └── validate.js           # Input validation
├── rag/                      # RAG pipeline
│   ├── embeddings.js         # Text embedding
│   ├── vectorStore.js        # Vector database
│   ├── retriever.js          # Document retrieval
│   ├── generator.js          # Groq AI integration
│   ├── reranker.js           # Result reranking
│   ├── promptEditor.js       # System prompt
│   └── aiProvider/           # AI provider abstraction
├── knowledge/                # Legal knowledge OS
│   ├── legalKnowledgeOS.js   # Core knowledge engine
│   ├── knowledgeGraphV2.js   # Graph relationships
│   ├── legalTimeMachine.js   # Temporal legal data
│   └── ...
├── data/                     # Legal documents
│   ├── *.json                # Legal act data
│   ├── *.pdf                 # Source PDFs
│   └── hierarchy/            # Corpus hierarchy
├── scripts/                  # Utility scripts
│   ├── rebuildVector.js      # Rebuild vector DB
│   └── seedData.js           # Seed initial data
├── tests/                    # Test suites
└── utils/                    # Shared utilities
    ├── logger.js             # Winston logger
    ├── auditLog.js           # Audit trail
    └── AppError.js           # Error classes
```

## Quick Start

### Prerequisites

- Node.js 18+
- Groq API key — [Get one here](https://console.groq.com)

### Setup

```bash
git clone https://github.com/adityae547549/LawLens-Backend.git
cd LawLens-Backend

cp .env.example .env
# Edit .env and set GROQ_API_KEY and JWT_SECRET

npm install
npm run rebuild-vector   # Build vector DB from legal docs
npm start                # http://localhost:3000
```

### Docker

```bash
docker build -t lawlens-backend .
docker run -p 3000:3000 --env-file .env lawlens-backend
```

### Deploy to Render

1. Push to GitHub
2. [render.com](https://render.com) → New Web Service → Docker
3. Add env vars: `GROQ_API_KEY`, `JWT_SECRET`
4. Deploy

## API Reference

### Health Check

```
GET /health
→ { "status": "ok", "uptime": 123.456, "timestamp": "..." }
```

### Authentication

```
POST /api/auth/register    { name, email, password }
POST /api/auth/login       { email, password }       → { token, user }
GET  /api/auth/profile                                    → user
PUT  /api/auth/profile     { name, email, preferences }
```

### Chat

```
POST /api/chat             { message, conversationId? }
GET  /api/chat/conversations
GET  /api/chat/conversations/:id
DELETE /api/chat/conversations/:id
```

### Search

```
POST /api/search           { query, mode? }
GET  /api/search/suggestions?query=
GET  /api/search/recent
DELETE /api/search/clear
```

### Articles

```
GET /api/articles/:id
GET /api/articles/:id/related
GET /api/articles/:id/explain
```

### Bookmarks

```
GET    /api/bookmarks
POST   /api/bookmarks      { articleId, title, url }
DELETE /api/bookmarks/:id
```

### Admin (requires admin role)

```
GET  /api/admin/dashboard
GET  /api/admin/users
DELETE /api/admin/users/:id
POST /api/admin/rebuild-vector
GET  /api/admin/prompt
PUT  /api/admin/prompt     { prompt }
POST /api/admin/prompt/reset
POST /api/admin/upload-dataset
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GROQ_API_KEY` | Yes | — | Groq API key |
| `JWT_SECRET` | Yes | — | JWT signing secret |
| `NODE_ENV` | No | `development` | Environment |
| `PORT` | No | `3000` | Server port |
| `CORS_ORIGIN` | No | `*` | Allowed origins |
| `DB_PATH` | No | `./database` | Data directory |
| `UPLOAD_DIR` | No | `./uploads` | Upload directory |
| `VECTOR_DB_PATH` | No | `./vector/index.json` | Vector index |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` | Rate limit window |
| `RATE_LIMIT_MAX` | No | `100` | Max requests/window |
| `RENDER_EXTERNAL_URL` | Auto | — | Set by Render |

## Key Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check + uptime |
| `POST /api/chat` | AI legal Q&A |
| `POST /api/search` | Semantic document search |
| `GET /api/articles/:id` | Legal article viewer |
| `POST /api/admin/rebuild-vector` | Rebuild search index |

## Security

- bcrypt password hashing (12 rounds)
- JWT with configurable expiration
- Rate limiting on all API endpoints
- File upload validation (type + size)
- Helmet security headers
- CORS origin whitelist
- Path traversal protection
- Admin role-based access control

## License

MIT © Aditya Parmar
