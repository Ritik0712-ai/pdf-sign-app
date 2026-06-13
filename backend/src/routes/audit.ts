import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { AppError } from '../middleware/error.js';

const router = Router();

// Get audit logs for a document
router.get('/:documentId', async (req, res) => {
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

    const { documentId } = req.params;

    // Verify user owns the document
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .select('id')
      .eq('id', documentId)
      .eq('owner_id', user.id)
      .single();

    if (docError || !document) {
      throw new AppError('Document not found', 404);
    }

    // Get audit logs
    const { data: logs, error } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .eq('document_id', documentId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, data: logs || [] });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
    } else {
      console.error('Get audit logs error:', error);
      res.status(500).json({ success: false, message: 'Failed to get audit logs' });
    }
  }
});

// Create audit log (internal use)
export const createAuditLog = async (data: {
  document_id: string;
  actor_user_id: string | null;
  action: string;
  ip_address: string;
  user_agent: string | null;
  metadata?: Record<string, unknown>;
}) => {
  try {
    const { data: log, error } = await supabaseAdmin
      .from('audit_logs')
      .insert({
        document_id: data.document_id,
        action: data.action,
        ip_address: data.ip_address,
        user_agent: data.user_agent,
        metadata: data.metadata,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create audit log:', error);
      return null;
    }

    return log;
  } catch (error) {
    console.error('Failed to create audit log:', error);
    return null;
  }
};

export default router;