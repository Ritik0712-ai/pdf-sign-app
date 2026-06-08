import { api } from './axios';

export interface Signature {
  id: string;
  document_id: string;
  signer_id: string | null;
  page_number: number;
  x_percent: number;
  y_percent: number;
  width_percent: number;
  height_percent: number;
  signature_type: 'typed' | 'image' | 'drawn';
  signature_value: string | null;
  status: 'pending' | 'signed' | 'rejected';
  signed_at: string | null;
  created_at: string;
}

// Get signatures for a document
export async function getSignaturesByDocument(documentId: string): Promise<Signature[]> {
  const response = await api.get(`/api/signatures/document/${documentId}`);
  
  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to fetch signatures');
  }

  return response.data.data.signatures || [];
}

// Create signature placement
export async function createSignature(data: {
  document_id: string;
  page_number: number;
  x_percent: number;
  y_percent: number;
  width_percent?: number;
  height_percent?: number;
  signature_type?: 'typed' | 'image' | 'drawn';
}): Promise<Signature> {
  const response = await api.post('/api/signatures', data);
  
  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to create signature');
  }

  return response.data.data.signature;
}

// Delete signature
export async function deleteSignature(id: string): Promise<void> {
  const response = await api.delete(`/api/signatures/${id}`);
  
  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to delete signature');
  }
}

// Generate signing link
export async function generateSigningLink(documentId: string, signerName: string): Promise<{ token: string; url: string }> {
  const response = await api.post('/api/signatures/link', {
    documentId,
    signerName,
  });
  
  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to generate link');
  }

  return {
    token: response.data.data.token,
    url: `${window.location.origin}/sign/${response.data.data.token}`,
  };
}

// Get signature link details
export async function getSigningLink(token: string): Promise<{
  document_id: string;
  signer_name: string;
  document_title: string;
  document_url: string;
}> {
  const response = await api.get(`/api/signatures/link/${token}`);
  
  if (!response.data.success) {
    throw new Error(response.data.message || 'Invalid or expired link');
  }

  return response.data.data;
}

// Sign a signature field
export async function signSignature(id: string, value: string): Promise<Signature> {
  const response = await api.patch(`/api/signatures/${id}`, {
    status: 'signed',
    signature_value: value,
  });
  
  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to sign');
  }

  return response.data.data.signature;
}