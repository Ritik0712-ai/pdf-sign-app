import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { AuditLog } from '../types/index.js';

const router = Router();

// Mock audit storage
const auditLogs: AuditLog[] = [];

// Get audit logs for document
router.get('/:documentId', authenticate, (req: AuthRequest, res) => {
  const logs = auditLogs
    .filter(log => log.document_id === req.params.documentId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  
  res.json({ success: true, data: logs });
});

// Create audit log (internal use)
export const createAuditLog = (data: Omit<AuditLog, 'id' | 'created_at'>): AuditLog => {
  const log: AuditLog = {
    id: crypto.randomUUID(),
    ...data,
    created_at: new Date().toISOString(),
  };
  auditLogs.push(log);
  return log;
};

export default router;
