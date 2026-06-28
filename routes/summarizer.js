const express = require('express');
const router = express.Router();
const summarizerController = require('../controllers/summarizerController');
const { optionalAuth } = require('../middleware/auth');

router.post('/summarize', optionalAuth, summarizerController.summarize);
router.post('/document', optionalAuth, summarizerController.summarizeDocument);
router.post('/compare', optionalAuth, summarizerController.compareDocuments);

module.exports = router;
