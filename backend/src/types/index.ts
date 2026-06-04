export interface User {
  id: string;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  owner_id: string;
  title: string;
  original_file_url: string;
  signed_file_url: string | null;
  status: 'draft' | 'pending' | 'signed' | 'rejected' | 'expired';
  total_pages: number;
  file_size: number;
  created_at: string;
  updated_at: string;
}

export interface Signature {
  id: string;
  document_id: string;
  signer_id: string | null;
  page_number: number;
  x_percent: number;
  y_percent: number;
  signature_type: 'typed' | 'image' | 'drawn';
  signature_value: string;
  status: 'pending' | 'signed' | 'rejected';
  signed_at: string | null;
  created_at: string;
}

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
}

export interface AuditLog {
  id: string;
  document_id: string;
  actor_user_id: string | null;
  action: string;
  ip_address: string;
  user_agent: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}
