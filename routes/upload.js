const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { uploadLimiter } = require('../middleware/rateLimiter');
const upload = require('../middleware/upload');

router.post('/', optionalAuth, uploadLimiter, upload.single('document'), uploadController.uploadDocument);
router.get('/library', optionalAuth, uploadController.getLibrary);
router.delete('/:id', optionalAuth, uploadController.deleteDocument);
router.put('/:id', optionalAuth, uploadController.updateDocument);
router.get('/search', optionalAuth, uploadController.searchInDocument);

module.exports = router;
