import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { Document } from '../types/index.js';
import { AppError } from '../middleware/error.js';

const router = Router();

// Mock document storage
const documents: Document[] = [];

// Get all documents for user
router.get('/', authenticate, (req: AuthRequest, res) => {
  const userDocs = documents.filter(doc => doc.owner_id === req.user?.userId);
  res.json({ success: true, data: userDocs });
});

// Get single document
router.get('/:id', authenticate, (req: AuthRequest, res) => {
  const doc = documents.find(
    d => d.id === req.params.id && d.owner_id === req.user?.userId
  );
  
  if (!doc) {
    return res.status(404).json({ success: false, message: 'Document not found' });
  }
  
  res.json({ success: true, data: doc });
});

// Upload document (mock - actual implementation with Supabase on Day 3)
router.post('/upload', authenticate, (req: AuthRequest, res) => {
  const { title, fileUrl, totalPages, fileSize } = req.body;
  
  if (!title || !fileUrl) {
    throw new AppError('Title and file URL are required', 400);
  }

  const doc: Document = {
    id: crypto.randomUUID(),
    owner_id: req.user!.userId,
    title,
    original_file_url: fileUrl,
    signed_file_url: null,
    status: 'draft',
    total_pages: totalPages || 1,
    file_size: fileSize || 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  documents.push(doc);
  
  res.status(201).json({ success: true, data: doc, message: 'Document uploaded' });
});

// Delete document
router.delete('/:id', authenticate, (req: AuthRequest, res) => {
  const index = documents.findIndex(
    d => d.id === req.params.id && d.owner_id === req.user?.userId
  );
  
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Document not found' });
  }
  
  documents.splice(index, 1);
  res.json({ success: true, message: 'Document deleted' });
});

export default router;
