const { z } = require('zod');

// Auth Validators
const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name too long'),
  email: z.string().trim().email('Invalid email address').toLowerCase(),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128, 'Password too long')
});

const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required').max(128)
});

const profileUpdateSchema = z.object({
  name: z.string().trim().min(1, 'Name cannot be empty').max(100).optional(),
  preferences: z.object({
    theme: z.enum(['dark', 'light']).optional(),
    notifications: z.boolean().optional()
  }).optional()
});

const googleAuthSchema = z.object({
  idToken: z.string().trim().min(1, 'Firebase ID token is required')
});

// Chat Validators
const chatSchema = z.object({
  message: z.string().trim().min(1, 'Message is required').max(10000, 'Message is too long'),
  conversationId: z.string().trim().max(100).nullish(),
  mode: z.enum(['legal', 'web', 'hybrid', 'general']).optional().default('legal'),
  level: z.enum(['child', 'student', 'upsc', 'lawyer', 'judge', 'general']).optional().default('general'),
  language: z.string().trim().max(20).optional().default('auto'),
  fileId: z.string().trim().max(200).nullish(),
  useMemory: z.boolean().optional().default(false)
});

// Search Validators
const searchSchema = z.object({
  query: z.string().trim().min(1, 'Search query is required').max(500, 'Query too long'),
  mode: z.enum(['strict', 'extended', 'general', 'legal', 'web', 'hybrid']).optional().default('hybrid'),
  filters: z.record(z.any()).optional().default({}),
  useWebSearch: z.boolean().optional().default(false)
});

const suggestionsQuerySchema = z.object({
  query: z.string().trim().min(1, 'Search query is required').max(500)
});

// Upload Validators
const updateDocumentSchema = z.object({
  tags: z.array(z.string().trim()).optional(),
  temporary: z.boolean().optional()
});

const searchInDocumentQuerySchema = z.object({
  fileId: z.string().trim().optional(),
  query: z.string().trim().min(1, 'Query is required').max(500)
});

// AI Direct Validators
const aiGenerateSchema = z.object({
  prompt: z.string().trim().min(1, 'Prompt is required').max(10000, 'Prompt too long'),
  mode: z.string().trim().optional(),
  useWebSearch: z.boolean().optional().default(false),
  searchMode: z.string().trim().optional().default('general'),
  language: z.string().trim().optional().default('auto')
});

// Summarizer Validators
const summarizeTextSchema = z.object({
  text: z.string().trim().min(50, 'Text must be at least 50 characters').max(50000, 'Text too long'),
  mode: z.enum(['concise', 'detailed', 'extract', 'plain']).optional().default('concise'),
  maxLength: z.coerce.number().optional().default(500)
});

const summarizeDocSchema = z.object({
  fileId: z.string().trim().min(1, 'fileId is required'),
  mode: z.enum(['concise', 'detailed', 'extract']).optional().default('concise')
});

const compareDocsSchema = z.object({
  fileIds: z.array(z.string().trim()).min(2, 'At least 2 fileIds are required for comparison').max(10),
  query: z.string().trim().max(500).optional()
});

// Feedback Validator
const feedbackSchema = z.object({
  overallRating: z.coerce.number().min(1, 'Rating must be at least 1').max(5, 'Rating maximum is 5'),
  overallComment: z.string().trim().max(10000).optional().default(''),
  categories: z.array(z.object({
    id: z.string().trim().optional().default('unknown'),
    rating: z.coerce.number().min(1).max(5),
    comment: z.string().trim().max(5000).optional().default('')
  })).min(1, 'At least one category rating is required'),
  email: z.string().trim().email('Invalid email address').or(z.literal('')).nullish()
});

// Admin Validators
const promptUpdateSchema = z.object({
  prompt: z.string().trim().min(1, 'Prompt is required').max(20000, 'Prompt too long')
});

// Bookmarks Validators
const addBookmarkSchema = z.object({
  articleId: z.string().trim().min(1, 'Article ID is required'),
  title: z.string().trim().max(200).optional()
});

const updateBookmarkSchema = z.object({
  notes: z.string().trim().max(5000).optional(),
  title: z.string().trim().max(200).optional()
});

// Workspace Validators
const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1, 'Workspace name is required').max(100, 'Workspace name too long'),
  description: z.string().trim().max(1000).optional().default(''),
  members: z.array(z.string().trim()).optional().default([])
});

const updateWorkspaceSchema = z.object({
  name: z.string().trim().min(1, 'Workspace name cannot be empty').max(100).optional(),
  description: z.string().trim().max(1000).optional(),
  members: z.array(z.string().trim()).optional()
});

const addWorkspaceDocSchema = z.object({
  documentId: z.string().trim().min(1, 'Document ID is required'),
  name: z.string().trim().max(200).optional()
});

const addAnnotationSchema = z.object({
  documentId: z.string().trim().min(1, 'Document ID is required'),
  text: z.string().trim().min(1, 'Annotation text is required').max(10000),
  highlight: z.string().trim().max(5000).optional().default('')
});

// Share Validator
const generateShareSchema = z.object({
  content: z.string().trim().min(1, 'Content is required').max(50000, 'Content too long'),
  citations: z.array(z.any()).optional().default([]),
  confidence: z.coerce.number().optional().default(0),
  title: z.string().trim().max(300).nullish()
});

module.exports = {
  registerSchema,
  loginSchema,
  profileUpdateSchema,
  googleAuthSchema,
  chatSchema,
  searchSchema,
  suggestionsQuerySchema,
  updateDocumentSchema,
  searchInDocumentQuerySchema,
  aiGenerateSchema,
  summarizeTextSchema,
  summarizeDocSchema,
  compareDocsSchema,
  feedbackSchema,
  promptUpdateSchema,
  addBookmarkSchema,
  updateBookmarkSchema,
  createWorkspaceSchema,
  updateWorkspaceSchema,
  addWorkspaceDocSchema,
  addAnnotationSchema,
  generateShareSchema
};
