const express = require('express');
const router = express.Router();
const bookmarksController = require('../controllers/bookmarksController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { addBookmarkSchema, updateBookmarkSchema } = require('../validators');

router.get('/', authenticate, bookmarksController.getBookmarks);
router.post('/', authenticate, validate(addBookmarkSchema), bookmarksController.addBookmark);
router.put('/:id', authenticate, validate(updateBookmarkSchema), bookmarksController.updateBookmark);
router.delete('/:id', authenticate, bookmarksController.deleteBookmark);

module.exports = router;
