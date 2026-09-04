const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { chatLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');
const { chatSchema } = require('../validators');

router.post('/', chatLimiter, optionalAuth, validate(chatSchema), chatController.chat);
router.post('/stream', chatLimiter, optionalAuth, validate(chatSchema), chatController.chatStream);
router.get('/conversations', authenticate, chatController.getConversations);
router.get('/conversations/:id', authenticate, chatController.getConversation);
router.delete('/conversations/:id', authenticate, chatController.deleteConversation);

module.exports = router;
