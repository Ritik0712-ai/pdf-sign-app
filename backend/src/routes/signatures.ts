import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { AppError } from '../middleware/error.js';
import { createAuditLog } from './audit.js';
import { sendSigningRequest } from '../services/emailService.js';

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

    // Create audit log
    await createAuditLog({
      document_id,
      actor_user_id: null,
      action: 'SIGNATURE_PLACED',
      ip_address: req.ip || req.socket.remoteAddress || 'unknown',
      user_agent: req.headers['user-agent'] || null,
      metadata: { page_number, signature_id: signature.id },
    });

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

// Update signature (sign/reject or position update)
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

    const { status, signature_value, x_percent, y_percent } = req.body;

    // Build update data
    const updateData: any = {};
    
    // Handle position update (no status required)
    if (x_percent !== undefined && y_percent !== undefined) {
      if (x_percent < 0 || x_percent > 100 || y_percent < 0 || y_percent > 100) {
        throw new AppError('Coordinates must be between 0 and 100', 400);
      }
      updateData.x_percent = x_percent;
      updateData.y_percent = y_percent;
    }
    
    // Handle status update
    if (status) {
      if (!['signed', 'rejected'].includes(status)) {
        throw new AppError('Invalid status', 400);
      }
      updateData.status = status;
      if (status === 'signed') {
        updateData.signed_at = new Date().toISOString();
        // Don't set signer_id for external signers (they may not have accounts)
        // updateData.signer_id = user.id;
      }
    }
    
    if (signature_value) {
      updateData.signature_value = signature_value;
    }

    if (Object.keys(updateData).length === 0) {
      throw new AppError('No valid update data provided', 400);
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

    const bearerToken = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(bearerToken);

    if (authError || !user) {
      throw new AppError('Invalid token', 401);
    }

    const { documentId, signerName, signerEmail, expiresAt, signatureId } = req.body;

    if (!documentId || !signerName) {
      throw new AppError('documentId and signerName are required', 400);
    }

    // Validate signature_id if provided
    if (signatureId) {
      const { data: sig, error: sigError } = await supabaseAdmin
        .from('signatures')
        .select('id, status')
        .eq('id', signatureId)
        .eq('document_id', documentId)
        .single();
      
      if (sigError || !sig) {
        throw new AppError('Invalid signature ID', 400);
      }
      
      if (sig.status === 'signed') {
        throw new AppError('This signature has already been signed', 400);
      }
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

    // Check if user exists in user_profiles, if not create it
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('id', user.id)
      .single();
    
    if (!profile) {
      // Create user profile
      await supabaseAdmin
        .from('user_profiles')
        .insert({
          id: user.id,
          name: user.email?.split('@')[0] || 'User',
          email: user.email || '',
        });
    }

    // Generate unique signing token
    const crypto = require('crypto');
    const signingToken = crypto.randomBytes(32).toString('hex');
    
    const { data: link, error } = await supabaseAdmin
      .from('signing_links')
      .insert({
        document_id: documentId,
        token: signingToken,
        signer_name: signerName,
        signer_email: signerEmail || null,
        expires_at: expiresAt || null,
        is_active: true,
        created_by: user.id,
        signature_id: signatureId || null,
      })
      .select()
      .single();

    if (error) throw error;

    // Create audit log for link creation
    await createAuditLog({
      document_id: documentId,
      actor_user_id: null,
      action: 'LINK_CREATED',
      ip_address: req.ip || req.socket.remoteAddress || 'unknown',
      user_agent: req.headers['user-agent'] || null,
      metadata: { signer_name: signerName, signer_email: signerEmail },
    });

    // Send email notification to signer (if email provided)
    const baseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const signingUrl = `${baseUrl}/sign/${link.token}`;
    
    // Get document title for email
    const { data: docData } = await supabaseAdmin
      .from('documents')
      .select('title')
      .eq('id', documentId)
      .single();
    
    if (signerEmail) {
      sendSigningRequest({
        signerEmail,
        signerName,
        documentTitle: docData?.title || 'Document',
        signingUrl,
        expiresAt: expiresAt || undefined,
      }).catch(err => console.error('Email notification failed:', err));
    }

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
    // First get the signing link
    const { data: link, error: linkError } = await supabaseAdmin
      .from('signing_links')
      .select('*')
      .eq('token', req.params.token)
      .single();

    if (linkError || !link) {
      return res.status(404).json({ success: false, message: 'Signing link not found' });
    }

    if (!link.is_active) {
      return res.status(400).json({ success: false, message: 'Signing link is inactive' });
    }

    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return res.status(400).json({ success: false, message: 'Signing link has expired' });
    }

    // Then get the document
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .select('id, title, original_file_url')
      .eq('id', link.document_id)
      .single();

    if (docError || !document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    // Get signature fields for this document
    const { data: signatures } = await supabaseAdmin
      .from('signatures')
      .select('id, page_number, x_percent, y_percent, status')
      .eq('document_id', link.document_id)
      .eq('status', 'pending');

    res.json({ 
      success: true, 
      data: {
        document_id: link.document_id,
        signer_name: link.signer_name,
        document_title: document.title,
        document_url: document.original_file_url,
        signatures: signatures || [],
      }
    });
  } catch (error) {
    console.error('Validate link error:', error);
    res.status(500).json({ success: false, message: 'Failed to validate link' });
  }
});

export default router;