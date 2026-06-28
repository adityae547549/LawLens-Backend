const express = require('express');
const router = express.Router();
const bookmarksController = require('../controllers/bookmarksController');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, bookmarksController.getBookmarks);
router.post('/', authenticate, bookmarksController.addBookmark);
router.put('/:id', authenticate, bookmarksController.updateBookmark);
router.delete('/:id', authenticate, bookmarksController.deleteBookmark);

module.exports = router;
