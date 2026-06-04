import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/axios';

export default function UploadDocument() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async (data: { title: string; fileUrl: string; totalPages: number; fileSize: number }) => {
      const response = await api.post('/api/documents/upload', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      navigate('/dashboard/documents');
    },
  });

  const handleFile = (selectedFile: File) => {
    if (selectedFile.type !== 'application/pdf') {
      alert('Only PDF files are allowed');
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }
    setFile(selectedFile);
    if (!title) {
      setTitle(selectedFile.name.replace('.pdf', ''));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFile(droppedFile);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title) return;
    
    // Mock upload - in production, upload to Supabase Storage
    const mockUrl = `https://storage.example.com/documents/${crypto.randomUUID()}.pdf`;
    uploadMutation.mutate({
      title,
      fileUrl: mockUrl,
      totalPages: 1,
      fileSize: file.size,
    });
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Upload Document</h1>
        <p className="text-gray-600 mt-1">Upload a PDF to get started</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl">
        {/* Drop Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all mb-6 ${
            dragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            className="hidden"
          />
          <div className="text-5xl mb-4">📄</div>
          <p className="text-lg font-medium text-gray-700 mb-2">
            {file ? file.name : 'Drop your PDF here or click to browse'}
          </p>
          <p className="text-sm text-gray-500">Maximum file size: 10MB</p>
        </div>

        {/* Title */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Document Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            placeholder="Enter document title"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={!file || !title || uploadMutation.isPending}
            className="px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {uploadMutation.isPending ? 'Uploading...' : 'Upload Document'}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>

        {uploadMutation.isError && (
          <p className="mt-4 text-danger">Upload failed. Please try again.</p>
        )}
      </form>
    </div>
  );
}
