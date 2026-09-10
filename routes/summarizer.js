const express = require('express');
const router = express.Router();
const summarizerController = require('../controllers/summarizerController');
const { optionalAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { summarizeTextSchema, summarizeDocSchema, compareDocsSchema } = require('../validators');
const rateLimit = require('express-rate-limit');

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'AI request limit reached. Please wait before trying again.', code: 'AI_RATE_LIMITED' },
});

router.post('/summarize', optionalAuth, aiLimiter, validate(summarizeTextSchema), summarizerController.summarize);
router.post('/document', optionalAuth, aiLimiter, validate(summarizeDocSchema), summarizerController.summarizeDocument);
router.post('/compare', optionalAuth, aiLimiter, validate(compareDocsSchema), summarizerController.compareDocuments);

module.exports = router;
