const express = require('express');
const router = express.Router();
const workspaceController = require('../controllers/workspaceController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  addWorkspaceDocSchema,
  addAnnotationSchema
} = require('../validators');

router.get('/', authenticate, workspaceController.listWorkspaces);
router.post('/', authenticate, validate(createWorkspaceSchema), workspaceController.createWorkspace);
router.get('/:id', authenticate, workspaceController.getWorkspace);
router.put('/:id', authenticate, validate(updateWorkspaceSchema), workspaceController.updateWorkspace);
router.delete('/:id', authenticate, workspaceController.deleteWorkspace);
router.post('/:id/documents', authenticate, validate(addWorkspaceDocSchema), workspaceController.addDocument);
router.post('/:id/annotations', authenticate, validate(addAnnotationSchema), workspaceController.addAnnotation);

module.exports = router;
