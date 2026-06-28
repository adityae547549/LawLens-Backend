const express = require('express');
const router = express.Router();
const shareController = require('../controllers/shareController');
const { optionalAuth } = require('../middleware/auth');

router.post('/generate', optionalAuth, shareController.generateShare);
router.get('/:token', shareController.getShared);

module.exports = router;
