const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { uploadLimiter } = require('../middleware/rateLimiter');
const upload = require('../middleware/upload');
const validate = require('../middleware/validate');
const { updateDocumentSchema, searchInDocumentQuerySchema } = require('../validators');

router.post('/', optionalAuth, uploadLimiter, upload.single('document'), uploadController.uploadDocument);
router.get('/library', optionalAuth, uploadController.getLibrary);
router.delete('/:id', authenticate, uploadController.deleteDocument);
router.put('/:id', authenticate, validate(updateDocumentSchema), uploadController.updateDocument);
router.get('/search', optionalAuth, validate(searchInDocumentQuerySchema, 'query'), uploadController.searchInDocument);

module.exports = router;
