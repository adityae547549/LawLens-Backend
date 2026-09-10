const db = require('../database/db');
const logger = require('../utils/logger');

const fields = { id: 1, title: 1, description: 1, createdBy: 1, documents: 1, annotations: 1, updatedAt: 1, createdAt: 1 };

async function getUserWorkspaces(req, res) {
  try {
    const allWorkspaces = await db.findAll('workspaces');
    const workspaces = (allWorkspaces || []).filter(w => w.createdBy === req.user.id);
    res.json({ workspaces });
  } catch (error) {
    logger.error('List workspaces error', { message: error.message });
    res.status(500).json({ error: 'Failed to get workspaces', code: 'WORKSPACE_LIST_FAILED' });
  }
}

exports.listWorkspaces = getUserWorkspaces;

exports.createWorkspace = async (req, res, next) => {
  try {
    const { title, description } = req.body || {};
    const workspaceName = title || (req.body && req.body.name);
    if (!workspaceName || !workspaceName.trim()) {
      return res.status(400).json({ error: 'Workspace title is required', code: 'TITLE_REQUIRED' });
    }
    const workspace = await db.insertOne('workspaces', {
      title: workspaceName.trim(),
      description: description ? description.trim() : '',
      createdBy: req.user.id,
      documents: [],
      annotations: [],
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
    res.status(201).json({ workspace });
  } catch (error) {
    logger.error('Create workspace error', { message: error.message });
    next(error);
  }
};

exports.getWorkspace = async (req, res, next) => {
  try {
    const workspace = await db.findById('workspaces', req.params.id);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found', code: 'WORKSPACE_NOT_FOUND' });
    }
    if (workspace.createdBy !== req.user.id) {
      return res.status(403).json({ error: 'Access denied', code: 'WORKSPACE_ACCESS_DENIED' });
    }
    res.json({ workspace });
  } catch (error) {
    logger.error('Get workspace error', { message: error.message });
    next(error);
  }
};

exports.updateWorkspace = async (req, res, next) => {
  try {
    const workspace = await db.findById('workspaces', req.params.id);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found', code: 'WORKSPACE_NOT_FOUND' });
    }
    if (workspace.createdBy !== req.user.id) {
      return res.status(403).json({ error: 'Access denied', code: 'WORKSPACE_ACCESS_DENIED' });
    }
    const allowed = ['title', 'description'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update', code: 'NO_UPDATES' });
    }
    updates.updatedAt = new Date().toISOString();
    const updated = await db.updateOne('workspaces', { id: req.params.id }, updates);
    res.json({ workspace: updated });
  } catch (error) {
    logger.error('Update workspace error', { message: error.message });
    next(error);
  }
};

exports.deleteWorkspace = async (req, res, next) => {
  try {
    const workspace = await db.findById('workspaces', req.params.id);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found', code: 'WORKSPACE_NOT_FOUND' });
    }
    if (workspace.createdBy !== req.user.id) {
      return res.status(403).json({ error: 'Access denied', code: 'WORKSPACE_ACCESS_DENIED' });
    }
    await db.deleteOne('workspaces', { id: req.params.id });
    res.json({ success: true });
  } catch (error) {
    logger.error('Delete workspace error', { message: error.message });
    next(error);
  }
};

exports.addDocument = async (req, res, next) => {
  try {
    const workspace = await db.findById('workspaces', req.params.id);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found', code: 'WORKSPACE_NOT_FOUND' });
    }
    if (workspace.createdBy !== req.user.id) {
      return res.status(403).json({ error: 'Access denied', code: 'WORKSPACE_ACCESS_DENIED' });
    }
    const { documentId } = req.body || {};
    if (!documentId) {
      return res.status(400).json({ error: 'documentId is required', code: 'DOCUMENT_ID_REQUIRED' });
    }
    const docs = Array.isArray(workspace.documents) ? workspace.documents : [];
    if (!docs.includes(documentId)) {
      docs.push(documentId);
      await db.updateOne('workspaces', { id: req.params.id }, { documents: docs, updatedAt: new Date().toISOString() });
    }
    res.json({ workspace: { ...workspace, documents: docs } });
  } catch (error) {
    logger.error('Add document to workspace error', { message: error.message });
    next(error);
  }
};

exports.removeDocument = async (req, res, next) => {
  try {
    const workspace = await db.findById('workspaces', req.params.id);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found', code: 'WORKSPACE_NOT_FOUND' });
    }
    if (workspace.createdBy !== req.user.id) {
      return res.status(403).json({ error: 'Access denied', code: 'WORKSPACE_ACCESS_DENIED' });
    }
    const docs = Array.isArray(workspace.documents) ? workspace.documents : [];
    const updatedDocs = docs.filter(id => id !== req.params.documentId);
    await db.updateOne('workspaces', { id: req.params.id }, { documents: updatedDocs, updatedAt: new Date().toISOString() });
    res.json({ success: true });
  } catch (error) {
    logger.error('Remove document from workspace error', { message: error.message });
    next(error);
  }
};

exports.addAnnotation = async (req, res, next) => {
  try {
    const workspace = await db.findById('workspaces', req.params.id);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found', code: 'WORKSPACE_NOT_FOUND' });
    }
    if (workspace.createdBy !== req.user.id) {
      return res.status(403).json({ error: 'Access denied', code: 'WORKSPACE_ACCESS_DENIED' });
    }
    const annotations = req.body.annotations;
    if (!Array.isArray(annotations)) {
      return res.status(400).json({ error: 'annotations must be an array', code: 'INVALID_ANNOTATIONS' });
    }
    await db.updateOne('workspaces', { id: req.params.id }, { annotations, updatedAt: new Date().toISOString() });
    res.json({ success: true, annotations });
  } catch (error) {
    logger.error('Save annotations error', { message: error.message });
    next(error);
  }
};