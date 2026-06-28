const express = require('express');
const router = express.Router();
const workspaceController = require('../controllers/workspaceController');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, workspaceController.listWorkspaces);
router.post('/', authenticate, workspaceController.createWorkspace);
router.get('/:id', authenticate, workspaceController.getWorkspace);
router.put('/:id', authenticate, workspaceController.updateWorkspace);
router.delete('/:id', authenticate, workspaceController.deleteWorkspace);
router.post('/:id/documents', authenticate, workspaceController.addDocument);
router.post('/:id/annotations', authenticate, workspaceController.addAnnotation);

module.exports = router;
