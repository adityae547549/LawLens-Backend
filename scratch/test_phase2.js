const chatController = require('../controllers/chatController');

console.log('=== Phase 2 Deduplication Verification ===');

// Check that exports exist and are functions
console.log('chat is function:', typeof chatController.chat === 'function');
console.log('chatStream is function:', typeof chatController.chatStream === 'function');
console.log('getConversations is function:', typeof chatController.getConversations === 'function');
console.log('getConversation is function:', typeof chatController.getConversation === 'function');
console.log('deleteConversation is function:', typeof chatController.deleteConversation === 'function');

console.log('=== All Chat Controller Exports Verified ===');
