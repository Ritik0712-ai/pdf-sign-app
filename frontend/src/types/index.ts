// User types
export interface User {
  id: string;
  name: string;
  email: string;
  created_at?: string;
  updated_at?: string;
}

// Document types
export type DocumentStatus = 'draft' | 'pending' | 'signed' | 'rejected' | 'expired';

export interface Document {
  id: string;
  owner_id: string;
  title: string;
  original_file_url: string;
  signed_file_url: string | null;
  status: DocumentStatus;
  total_pages: number;
  file_size: number;
  created_at: string;
  updated_at: string;
}

// Signature types
export type SignatureStatus = 'pending' | 'signed' | 'rejected';
export type SignatureType = 'typed' | 'image' | 'drawn';

export interface Signature {
  id: string;
  document_id: string;
  signer_id: string | null;
  page_number: number;
  x_percent: number;
  y_percent: number;
  signature_type: SignatureType;
  signature_value: string;
  status: SignatureStatus;
  signed_at: string | null;
  created_at: string;
}

// Signing link types
export interface SigningLink {
  id: string;
  document_id: string;
  token: string;
  signer_name: string;
  signer_email: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  signingUrl?: string;
}

// Audit log types
export type AuditAction = 
  | 'DOCUMENT_UPLOADED'
  | 'DOCUMENT_VIEWED'
  | 'DOCUMENT_SIGNED'
  | 'DOCUMENT_REJECTED'
  | 'LINK_CREATED'
  | 'SIGNATURE_PLACED'
  | 'PDF_DOWNLOADED';

export interface AuditLog {
  id: string;
  document_id: string;
  actor_user_id: string | null;
  action: AuditAction;
  ip_address: string;
  user_agent: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Stats
export interface DashboardStats {
  total: number;
  pending: number;
  signed: number;
  rejected: number;
}
