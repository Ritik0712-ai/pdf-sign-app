import { supabase } from './supabase';
import { api } from './axios';

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

// Upload PDF to Supabase Storage
export async function uploadDocument(file: File, title: string): Promise<Document> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not authenticated');

  const userId = session.user.id;
  const ext = file.name.split('.').pop();
  const filename = `${userId}/${Date.now()}.${ext}`;

  // Upload file to Supabase Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('documents')
    .upload(filename, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) throw uploadError;

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('documents')
    .getPublicUrl(filename);

  // Create document record in database via backend API
  const response = await api.post('/documents', {
    title,
    original_file_url: publicUrl,
    file_size: file.size,
    total_pages: 1, // We'll calculate this later with PDF.js
  });

  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to create document');
  }

  return response.data.data.document;
}

// Get user's documents from backend
export async function getDocuments(): Promise<Document[]> {
  const response = await api.get('/documents');
  
  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to fetch documents');
  }

  return response.data.data.documents;
}

// Get single document
export async function getDocument(id: string): Promise<Document> {
  const response = await api.get(`/documents/${id}`);
  
  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to fetch document');
  }

  return response.data.data.document;
}

// Delete document
export async function deleteDocument(id: string): Promise<void> {
  const response = await api.delete(`/documents/${id}`);
  
  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to delete document');
  }
}