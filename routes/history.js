const express = require('express');
const router = express.Router();
const historyController = require('../controllers/historyController');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, historyController.getHistory);
router.delete('/conversations/:id', authenticate, historyController.deleteConversation);
router.get('/export', authenticate, historyController.exportData);
router.delete('/clear', authenticate, historyController.clearHistory);

module.exports = router;
