const express = require('express');
const router = express.Router();
const shareController = require('../controllers/shareController');
const { optionalAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { generateShareSchema } = require('../validators');

router.post('/generate', optionalAuth, validate(generateShareSchema), shareController.generateShare);
router.get('/:token', shareController.getShared);

module.exports = router;
