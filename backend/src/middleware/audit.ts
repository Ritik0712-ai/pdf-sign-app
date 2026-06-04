import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';

export interface AuditData {
  document_id: string;
  actor_user_id: string | null;
  action: string;
  ip_address: string;
  user_agent: string | null;
  metadata?: Record<string, unknown>;
}

export const extractAuditData = (req: AuthRequest): AuditData => {
  return {
    document_id: req.params.documentId || req.body.documentId || '',
    actor_user_id: req.user?.userId || null,
    action: req.body.action || req.path,
    ip_address: req.ip || req.socket.remoteAddress || 'unknown',
    user_agent: req.headers['user-agent'] || null,
    metadata: req.body.metadata,
  };
};
