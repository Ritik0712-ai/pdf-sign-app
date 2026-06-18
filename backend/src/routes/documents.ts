import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { AppError } from '../middleware/error.js';
import { generateSignedPdf } from '../services/pdfGenerator.js';
import { createAuditLog } from './audit.js';

const router = Router();

// Helper to get or create user profile
async function getOrCreateProfile(userId: string, userEmail: string, userName: string) {
  let { data: profile, error } = await supabaseAdmin
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    // Create profile if doesn't exist
    const { data: newProfile, error: createError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: userId,
        name: userName || userEmail.split('@')[0],
        email: userEmail,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating profile:', createError);
      throw new AppError('Failed to create user profile', 500);
    }
    profile = newProfile;
  }

  return profile;
}

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

    // Get or create user profile
    const profile = await getOrCreateProfile(
      user.id,
      user.email || '',
      user.user_metadata?.name || ''
    );

    const { data: document, error } = await supabaseAdmin
      .from('documents')
      .insert({
        owner_id: profile.id,
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
      throw new AppError('Failed to create document: ' + error.message, 500);
    }

    // Create audit log
    await createAuditLog({
      document_id: document.id,
      actor_user_id: user.id,
      action: 'DOCUMENT_UPLOADED',
      ip_address: req.ip || req.socket.remoteAddress || 'unknown',
      user_agent: req.headers['user-agent'] || null,
      metadata: { title: document.title },
    });

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

// Update document status
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

    const { status } = req.body;
    
    if (!status) {
      throw new AppError('Status is required', 400);
    }

    if (!['draft', 'pending', 'signed', 'rejected', 'expired'].includes(status)) {
      throw new AppError('Invalid status', 400);
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

    // Update document status
    const { data: updatedDoc, error: updateError } = await supabaseAdmin
      .from('documents')
      .update({ status })
      .eq('id', req.params.id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Create audit log for status changes
    const auditAction = 
      status === 'signed' ? 'DOCUMENT_SIGNED' : 
      status === 'rejected' ? 'DOCUMENT_REJECTED' : 
      'DOCUMENT_STATUS_CHANGED';
    await createAuditLog({
      document_id: req.params.id,
      actor_user_id: user.id,
      action: auditAction,
      ip_address: req.ip || req.socket.remoteAddress || 'unknown',
      user_agent: req.headers['user-agent'] || null,
      metadata: { 
        previous_status: document.status, 
        new_status: status 
      },
    });

    res.json({
      success: true,
      data: { document: updatedDoc },
      message: 'Document status updated',
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
    } else {
      console.error('Update document error:', error);
      res.status(500).json({ success: false, message: 'Failed to update document' });
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

    // Create audit log for document deletion
    await createAuditLog({
      document_id: req.params.id,
      actor_user_id: user.id,
      action: 'DOCUMENT_DELETED',
      ip_address: req.ip || req.socket.remoteAddress || 'unknown',
      user_agent: req.headers['user-agent'] || null,
      metadata: { title: document.title },
    });

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

// Generate signed PDF
router.post('/:id/generate-signed', async (req, res) => {
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

    // Verify document ownership
    const { data: document, error: fetchError } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('id', req.params.id)
      .eq('owner_id', user.id)
      .single();

    if (fetchError || !document) {
      throw new AppError('Document not found', 404);
    }

    // Check if document is signed
    if (document.status !== 'signed') {
      throw new AppError('Document must be signed before generating PDF', 400);
    }

    // Generate signed PDF
    const result = await generateSignedPdf(req.params.id);

    if (!result.success) {
      throw new AppError(result.message, 500);
    }

    res.json({
      success: true,
      data: { signedFileUrl: result.signedFileUrl },
      message: 'Signed PDF generated successfully',
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
    } else {
      console.error('Generate signed PDF error:', error);
      res.status(500).json({ success: false, message: 'Failed to generate signed PDF' });
    }
  }
});

export default router;
