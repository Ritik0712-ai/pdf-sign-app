import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { AppError } from '../middleware/error.js';

const router = Router();

// Get all documents for user
router.get('/', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401);
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      throw new AppError('Invalid token', 401);
    }

    const { data: documents, error } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: { documents: documents || [] },
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
    } else {
      console.error('Get documents error:', error);
      res.status(500).json({ success: false, message: 'Failed to get documents' });
    }
  }
});

// Get single document
router.get('/:id', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401);
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      throw new AppError('Invalid token', 401);
    }

    const { data: document, error } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('id', req.params.id)
      .eq('owner_id', user.id)
      .single();

    if (error || !document) {
      throw new AppError('Document not found', 404);
    }

    res.json({
      success: true,
      data: { document },
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
    } else {
      console.error('Get document error:', error);
      res.status(500).json({ success: false, message: 'Failed to get document' });
    }
  }
});

// Create document (called after file upload to Supabase Storage)
router.post('/', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401);
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      throw new AppError('Invalid token', 401);
    }

    const { title, original_file_url, file_size, total_pages } = req.body;

    if (!title || !original_file_url) {
      throw new AppError('Title and file URL are required', 400);
    }

    const { data: document, error } = await supabaseAdmin
      .from('documents')
      .insert({
        owner_id: user.id,
        title,
        original_file_url,
        file_size: file_size || 0,
        total_pages: total_pages || 1,
        status: 'draft',
      })
      .select()
      .single();

    if (error) {
      console.error('Create document error:', error);
      throw new AppError('Failed to create document', 500);
    }

    res.status(201).json({
      success: true,
      data: { document },
      message: 'Document uploaded successfully',
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
    } else {
      console.error('Create document error:', error);
      res.status(500).json({ success: false, message: 'Failed to create document' });
    }
  }
});

// Delete document
router.delete('/:id', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401);
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      throw new AppError('Invalid token', 401);
    }

    // Get document to check ownership
    const { data: document, error: fetchError } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('id', req.params.id)
      .eq('owner_id', user.id)
      .single();

    if (fetchError || !document) {
      throw new AppError('Document not found', 404);
    }

    // Delete from database
    const { error: deleteError } = await supabaseAdmin
      .from('documents')
      .delete()
      .eq('id', req.params.id);

    if (deleteError) throw deleteError;

    res.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
    } else {
      console.error('Delete document error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete document' });
    }
  }
});

export default router;