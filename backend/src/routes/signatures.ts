import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { AppError } from '../middleware/error.js';

const router = Router();

// Create signature placement
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

    const { document_id, page_number, x_percent, y_percent, width_percent, height_percent, signature_type } = req.body;

    if (!document_id || page_number === undefined || x_percent === undefined || y_percent === undefined) {
      throw new AppError('document_id, page_number, x_percent, and y_percent are required', 400);
    }

    if (x_percent < 0 || x_percent > 100 || y_percent < 0 || y_percent > 100) {
      throw new AppError('Coordinates must be between 0 and 100', 400);
    }

    const { data: signature, error } = await supabaseAdmin
      .from('signatures')
      .insert({
        document_id,
        page_number,
        x_percent,
        y_percent,
        width_percent: width_percent || 20,
        height_percent: height_percent || 8,
        signature_type: signature_type || 'typed',
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, data: { signature }, message: 'Signature placement saved' });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
    } else {
      console.error('Create signature error:', error);
      res.status(500).json({ success: false, message: 'Failed to create signature' });
    }
  }
});

// Get signatures for document
router.get('/document/:documentId', async (req, res) => {
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

    const { data: signatures, error } = await supabaseAdmin
      .from('signatures')
      .select('*')
      .eq('document_id', req.params.documentId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    res.json({ success: true, data: { signatures: signatures || [] } });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
    } else {
      console.error('Get signatures error:', error);
      res.status(500).json({ success: false, message: 'Failed to get signatures' });
    }
  }
});

// Update signature (sign/reject)
router.patch('/:id', async (req, res) => {
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

    const { status, signature_value } = req.body;

    if (!['signed', 'rejected'].includes(status)) {
      throw new AppError('Invalid status', 400);
    }

    const updateData: any = { status };
    if (status === 'signed') {
      updateData.signed_at = new Date().toISOString();
      updateData.signer_id = user.id;
    }
    if (signature_value) {
      updateData.signature_value = signature_value;
    }

    const { data: signature, error } = await supabaseAdmin
      .from('signatures')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data: { signature }, message: `Signature ${status}` });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
    } else {
      console.error('Update signature error:', error);
      res.status(500).json({ success: false, message: 'Failed to update signature' });
    }
  }
});

// Delete signature
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

    const { error } = await supabaseAdmin
      .from('signatures')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;

    res.json({ success: true, message: 'Signature deleted' });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
    } else {
      console.error('Delete signature error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete signature' });
    }
  }
});

// Generate signing link
router.post('/link', async (req, res) => {
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

    const { documentId, signerName, signerEmail, expiresAt } = req.body;

    if (!documentId || !signerName) {
      throw new AppError('documentId and signerName are required', 400);
    }

    // Verify user owns the document
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .select('id, owner_id')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      throw new AppError('Document not found', 404);
    }

    if (document.owner_id !== user.id) {
      throw new AppError('Not authorized to create link for this document', 403);
    }

    const { data: link, error } = await supabaseAdmin
      .from('signing_links')
      .insert({
        document_id: documentId,
        signer_name: signerName,
        signer_email: signerEmail || null,
        expires_at: expiresAt || null,
        is_active: true,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      data: { 
        token: link.token,
        signingUrl: `/sign/${link.token}`,
      },
      message: 'Signing link generated',
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
    } else {
      console.error('Generate link error:', error);
      res.status(500).json({ success: false, message: 'Failed to generate link' });
    }
  }
});

// Validate signing token (public)
router.get('/link/:token', async (req, res) => {
  try {
    const { data: link, error } = await supabaseAdmin
      .from('signing_links')
      .select('*, documents!inner(id, title, original_file_url, owner_id)')
      .eq('token', req.params.token)
      .single();

    if (error || !link) {
      return res.status(404).json({ success: false, message: 'Signing link not found' });
    }

    if (!link.is_active) {
      return res.status(400).json({ success: false, message: 'Signing link is inactive' });
    }

    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return res.status(400).json({ success: false, message: 'Signing link has expired' });
    }

    res.json({ 
      success: true, 
      data: {
        document_id: link.document_id,
        signer_name: link.signer_name,
        document_title: link.documents.title,
        document_url: link.documents.original_file_url,
      }
    });
  } catch (error) {
    console.error('Validate link error:', error);
    res.status(500).json({ success: false, message: 'Failed to validate link' });
  }
});

export default router;