const db = require('../database/db');
const { v4: uuidv4 } = require('uuid');

exports.listWorkspaces = async (req, res) => {
  try {
    const userId = req.user?.id;
    const allWorkspaces = db.findAll('workspaces');
    const workspaces = allWorkspaces.filter(w =>
      w.ownerId === userId || (w.members || []).includes(userId)
    );
    res.json({ workspaces });
  } catch (error) {
    console.error('List workspaces error:', error);
    res.status(500).json({ error: 'Failed to list workspaces' });
  }
};

exports.createWorkspace = async (req, res) => {
  try {
    const { name, description, members = [] } = req.body;
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Workspace name is required' });
    }

    const workspace = db.insertOne('workspaces', {
      name: name.trim(),
      description: description || '',
      ownerId: req.user.id,
      members: [...new Set([req.user.id, ...members])],
      documents: [],
      annotations: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    res.json({ workspace });
  } catch (error) {
    console.error('Create workspace error:', error);
    res.status(500).json({ error: 'Failed to create workspace' });
  }
};

exports.getWorkspace = async (req, res) => {
  try {
    const workspace = db.findById('workspaces', req.params.id);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }
    const userId = req.user?.id;
    if (workspace.ownerId !== userId && !(workspace.members || []).includes(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.json({ workspace });
  } catch (error) {
    console.error('Get workspace error:', error);
    res.status(500).json({ error: 'Failed to get workspace' });
  }
};

exports.updateWorkspace = async (req, res) => {
  try {
    const { name, description, members } = req.body;
    const workspace = db.findById('workspaces', req.params.id);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }
    if (workspace.ownerId !== req.user?.id) {
      return res.status(403).json({ error: 'Only the owner can update the workspace' });
    }

    const updates = { updatedAt: new Date().toISOString() };
    if (name) updates.name = name.trim();
    if (description !== undefined) updates.description = description;
    if (members) updates.members = [...new Set([req.user.id, ...members])];

    const updated = db.updateOne('workspaces', { id: req.params.id }, updates);
    res.json({ workspace: updated });
  } catch (error) {
    console.error('Update workspace error:', error);
    res.status(500).json({ error: 'Failed to update workspace' });
  }
};

exports.deleteWorkspace = async (req, res) => {
  try {
    const workspace = db.findById('workspaces', req.params.id);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }
    if (workspace.ownerId !== req.user?.id) {
      return res.status(403).json({ error: 'Only the owner can delete the workspace' });
    }
    db.deleteOne('workspaces', { id: req.params.id });
    res.json({ message: 'Workspace deleted' });
  } catch (error) {
    console.error('Delete workspace error:', error);
    res.status(500).json({ error: 'Failed to delete workspace' });
  }
};

exports.addDocument = async (req, res) => {
  try {
    const { documentId, name } = req.body;
    const workspace = db.findById('workspaces', req.params.id);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }
    const userId = req.user?.id;
    if (workspace.ownerId !== userId && !(workspace.members || []).includes(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const docs = workspace.documents || [];
    if (docs.find(d => d.id === documentId)) {
      return res.status(400).json({ error: 'Document already in workspace' });
    }

    docs.push({ id: documentId, name: name || documentId, addedAt: new Date().toISOString(), addedBy: userId });
    const updated = db.updateOne('workspaces', { id: req.params.id }, { documents: docs, updatedAt: new Date().toISOString() });
    res.json({ workspace: updated });
  } catch (error) {
    console.error('Add document error:', error);
    res.status(500).json({ error: 'Failed to add document' });
  }
};

exports.addAnnotation = async (req, res) => {
  try {
    const { documentId, text, highlight } = req.body;
    if (!documentId || !text) {
      return res.status(400).json({ error: 'documentId and text are required' });
    }

    const workspace = db.findById('workspaces', req.params.id);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }
    const userId = req.user?.id;
    if (workspace.ownerId !== userId && !(workspace.members || []).includes(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const annotation = {
      id: uuidv4(),
      documentId,
      text,
      highlight: highlight || '',
      userId,
      userName: req.user?.name || 'Anonymous',
      createdAt: new Date().toISOString()
    };

    const annotations = [...(workspace.annotations || []), annotation];
    const updated = db.updateOne('workspaces', { id: req.params.id }, { annotations, updatedAt: new Date().toISOString() });
    res.json({ workspace: updated, annotation });
  } catch (error) {
    console.error('Add annotation error:', error);
    res.status(500).json({ error: 'Failed to add annotation' });
  }
};
