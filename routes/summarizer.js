const express = require('express');
const router = express.Router();
const summarizerController = require('../controllers/summarizerController');
const { optionalAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { summarizeTextSchema, summarizeDocSchema, compareDocsSchema } = require('../validators');

router.post('/summarize', optionalAuth, validate(summarizeTextSchema), summarizerController.summarize);
router.post('/document', optionalAuth, validate(summarizeDocSchema), summarizerController.summarizeDocument);
router.post('/compare', optionalAuth, validate(compareDocsSchema), summarizerController.compareDocuments);

module.exports = router;
