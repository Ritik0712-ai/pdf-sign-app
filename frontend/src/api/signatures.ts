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

export async function getSignaturesByDocument(documentId: string): Promise<Signature[]> {
  const response = await api.get(`/signatures/document/${documentId}`);
  
  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to fetch signatures');
  }

  return response.data.data.signatures || [];
}

export async function createSignature(data: {
  document_id: string;
  page_number: number;
  x_percent: number;
  y_percent: number;
  width_percent?: number;
  height_percent?: number;
  signature_type?: 'typed' | 'image' | 'drawn';
}): Promise<Signature> {
  const response = await api.post('/signatures', data);
  
  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to create signature');
  }

  return response.data.data.signature;
}

export async function deleteSignature(id: string): Promise<void> {
  const response = await api.delete(`/signatures/${id}`);
  
  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to delete signature');
  }
}

export async function updateSignaturePosition(id: string, x_percent: number, y_percent: number): Promise<Signature> {
  const response = await api.patch(`/signatures/${id}`, {
    x_percent,
    y_percent,
  });
  
  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to update signature position');
  }

  return response.data.data.signature;
}
