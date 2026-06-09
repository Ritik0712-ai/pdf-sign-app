import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadDocument } from '../api/documents';

export default function UploadDocument() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = (file: File) => {
    // Validate file type
    if (file.type !== 'application/pdf') {
      setError('Please select a PDF file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File must be less than 10MB');
      return;
    }

    setSelectedFile(file);
    setError('');

    // Auto-fill title from filename if empty
    if (!title) {
      const fileName = file.name.replace('.pdf', '');
      setTitle(fileName);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile || !title) {
      setError('Please select a file and enter a title');
      return;
    }

    setUploading(true);
    setError('');

    try {
      await uploadDocument(selectedFile, title);
      navigate('/dashboard/documents');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Upload Document</h1>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${
              dragOver
                ? 'border-primary bg-blue-50'
                : 'border-gray-300 hover:border-primary hover:bg-gray-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileInputChange}
              className="hidden"
            />

            {selectedFile ? (
              <div className="flex items-center justify-center gap-3">
                <span className="text-3xl">📄</span>
                <div className="text-left">
                  <p className="font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                    setTitle('');
                  }}
                  className="ml-4 text-red-500 hover:text-red-700"
                >
                  ✕
                </button>
              </div>
            ) : (
              <>
                <div className="text-4xl mb-4">📤</div>
                <p className="text-lg font-medium text-gray-700">
                  Drag and drop your PDF here
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  or click to browse • PDF only • Max 10MB
                </p>
              </>
            )}
          </div>

          {/* Title Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Document Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              placeholder="Enter document title"
            />
          </div>

          {/* Upload Button */}
          <button
            type="submit"
            disabled={!selectedFile || !title || uploading}
            className="w-full py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span>
                Uploading...
              </span>
            ) : (
              'Upload Document'
            )}
          </button>
        </form>
      </div>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
        <h3 className="font-medium text-blue-900 mb-2">📋 Tips:</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Only PDF files are accepted</li>
          <li>• Maximum file size is 10MB</li>
          <li>• After upload, you can add signature fields</li>
        </ul>
      </div>
    </div>
  );
}