const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, adminOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/dashboard', authenticate, adminOnly, adminController.getDashboard);
router.get('/users', authenticate, adminOnly, adminController.getUsers);
router.delete('/users/:id', authenticate, adminOnly, adminController.deleteUser);
router.post('/rebuild-vector', authenticate, adminOnly, adminController.rebuildVectorDB);
router.get('/logs', authenticate, adminOnly, adminController.getLogs);
router.get('/metrics', authenticate, adminOnly, adminController.getApiMetrics);
router.get('/prompt', authenticate, adminOnly, adminController.getPrompt);
router.put('/prompt', authenticate, adminOnly, adminController.updatePrompt);
router.post('/prompt/reset', authenticate, adminOnly, adminController.resetPrompt);
router.post('/upload-dataset', authenticate, adminOnly, upload.single('dataset'), adminController.uploadDataset);
router.get('/datasets', authenticate, adminOnly, adminController.getDatasets);
router.delete('/datasets/:fileName', authenticate, adminOnly, adminController.deleteDataset);
router.get('/datasets/:fileName/preview', authenticate, adminOnly, adminController.getDatasetPreview);

module.exports = router;
