import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/axios';
import type { Document, Signature } from '../types';

export default function DocumentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');

  const { data: document, isLoading } = useQuery({
    queryKey: ['document', id],
    queryFn: async () => {
      const response = await api.get(`/api/documents/${id}`);
      return response.data.data as Document;
    },
    enabled: !!id,
  });

  const { data: signatures } = useQuery({
    queryKey: ['signatures', id],
    queryFn: async () => {
      const response = await api.get(`/api/signatures/document/${id}`);
      return response.data.data as Signature[];
    },
    enabled: !!id,
  });

  const generateLinkMutation = useMutation({
    mutationFn: async (data: { documentId: string; signerName: string }) => {
      const response = await api.post('/api/signatures/link', data);
      return response.data;
    },
    onSuccess: (data) => {
      setGeneratedLink(`${window.location.origin}/sign/${data.data.token}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/api/documents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      navigate('/dashboard/documents');
    },
  });

  const handleGenerateLink = () => {
    if (!signerName || !id) return;
    generateLinkMutation.mutate({ documentId: id, signerName });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Document not found</p>
        <Link to="/dashboard/documents" className="text-primary hover:underline mt-4 inline-block">
          Back to Documents
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-start mb-8">
        <div>
          <Link to="/dashboard/documents" className="text-sm text-gray-500 hover:text-primary mb-2 inline-block">
            ← Back to Documents
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{document.title}</h1>
          <p className="text-gray-600 mt-1">
            Created {new Date(document.created_at).toLocaleDateString()}
          </p>
        </div>
        <span className={`px-4 py-2 rounded-full text-sm font-medium ${
          document.status === 'signed' ? 'bg-green-100 text-green-700' :
          document.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
          document.status === 'rejected' ? 'bg-red-100 text-red-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          {document.status}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* PDF Preview */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Document Preview</h2>
          <div className="bg-gray-100 rounded-xl h-96 flex items-center justify-center">
            <div className="text-center">
              <div className="text-5xl mb-4">📄</div>
              <p className="text-gray-600">PDF Preview</p>
              <p className="text-sm text-gray-500 mt-1">{document.total_pages} pages</p>
            </div>
          </div>
        </div>

        {/* Actions Panel */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Actions</h2>
            <div className="space-y-3">
              <button
                onClick={() => setShowLinkModal(true)}
                className="w-full px-4 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-hover transition-colors"
              >
                🔗 Generate Signing Link
              </button>
              <Link
                to={`/dashboard/documents/${id}/editor`}
                className="block w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors text-center"
              >
                ✍️ Place Signature Field
              </Link>
              <Link
                to={`/dashboard/audit/${id}`}
                className="block w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors text-center"
              >
                📋 View Audit Logs
              </Link>
              <button
                onClick={() => deleteMutation.mutate()}
                className="w-full px-4 py-3 bg-red-50 text-danger rounded-xl font-medium hover:bg-red-100 transition-colors"
              >
                🗑️ Delete Document
              </button>
            </div>
          </div>

          {/* Signatures */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Signatures ({signatures?.length || 0})</h2>
            {signatures && signatures.length > 0 ? (
              <div className="space-y-2">
                {signatures.map((sig) => (
                  <div key={sig.id} className="p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium text-sm">Page {sig.page_number}</p>
                    <p className="text-xs text-gray-500">
                      Status: {sig.status}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No signatures placed yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Generate Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Generate Signing Link</h2>
            
            {!generatedLink ? (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Signer Name</label>
                  <input
                    type="text"
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    placeholder="Enter signer's name"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleGenerateLink}
                    disabled={!signerName || generateLinkMutation.isPending}
                    className="flex-1 px-4 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
                  >
                    {generateLinkMutation.isPending ? 'Generating...' : 'Generate Link'}
                  </button>
                  <button
                    onClick={() => setShowLinkModal(false)}
                    className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Signing Link</label>
                  <div className="p-3 bg-gray-100 rounded-xl text-sm break-all">
                    {generatedLink}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => navigator.clipboard.writeText(generatedLink)}
                    className="flex-1 px-4 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-hover transition-colors"
                  >
                    📋 Copy Link
                  </button>
                  <button
                    onClick={() => { setShowLinkModal(false); setGeneratedLink(''); setSignerName(''); }}
                    className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
