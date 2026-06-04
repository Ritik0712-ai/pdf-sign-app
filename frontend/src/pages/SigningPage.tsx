import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../api/axios';
import type { SigningLink, Signature } from '../types';

export default function SigningPage() {
  const { token } = useParams<{ token: string }>();
  const [signatureText, setSignatureText] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [signed, setSigned] = useState(false);

  const { data: linkData, isLoading, error } = useQuery({
    queryKey: ['signing-link', token],
    queryFn: async () => {
      const response = await api.get(`/api/signatures/link/${token}`);
      return response.data.data as SigningLink;
    },
    enabled: !!token,
  });

  const signMutation = useMutation({
    mutationFn: async (data: { token: string; signatureValue: string }) => {
      // In production, this would finalize the signing
      return api.patch(`/api/signatures/${data.token}`, {
        status: 'signed',
        signatureValue: data.signatureValue,
      });
    },
    onSuccess: () => {
      setSigned(true);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      return api.patch(`/api/signatures/${token}`, {
        status: 'rejected',
      });
    },
    onSuccess: () => {
      window.location.href = '/sign/rejected';
    },
  });

  const handleSign = () => {
    if (!signatureText.trim() || !token) return;
    signMutation.mutate({ token, signatureValue: signatureText });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !linkData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">🔗</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Link</h1>
          <p className="text-gray-600">This signing link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  if (signed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Document Signed!</h1>
          <p className="text-gray-600 mb-6">Thank you for signing.</p>
          <Link
            to="/sign/success"
            className="px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-hover transition-colors"
          >
            Done
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-primary">PDF Sign</h1>
          <p className="text-gray-600">Signing as <span className="font-medium">{linkData.signer_name}</span></p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6">
        {/* Document Preview */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary text-2xl">📄</div>
            <div>
              <h2 className="text-xl font-bold">Document Ready for Signature</h2>
              <p className="text-gray-500">Review the document and sign below</p>
            </div>
          </div>
          <div className="bg-gray-100 rounded-xl h-96 flex items-center justify-center">
            <div className="text-center">
              <div className="text-5xl mb-4">📄</div>
              <p className="text-gray-600">Document Preview</p>
            </div>
          </div>
        </div>

        {/* Signature Area */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-xl font-bold mb-4">Sign Document</h2>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Your Signature</label>
            <input
              type="text"
              value={signatureText}
              onChange={(e) => setSignatureText(e.target.value)}
              placeholder="Type your full name as signature"
              className="w-full px-4 py-4 border-2 border-gray-300 rounded-xl text-xl font-serif focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
            <p className="text-sm text-gray-500 mt-2">By signing, you agree to the terms and conditions.</p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setShowConfirm(true)}
              disabled={!signatureText.trim()}
              className="flex-1 px-6 py-4 bg-success text-white rounded-xl font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              ✓ Sign Document
            </button>
            <button
              onClick={() => rejectMutation.mutate()}
              disabled={rejectMutation.isPending}
              className="px-6 py-4 bg-red-50 text-danger rounded-xl font-semibold hover:bg-red-100 transition-colors"
            >
              Decline
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Confirm Signature</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to sign this document? This action cannot be undone.
            </p>
            <div className="p-3 bg-gray-100 rounded-xl mb-6">
              <p className="text-2xl font-serif text-center">{signatureText}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSign}
                disabled={signMutation.isPending}
                className="flex-1 px-4 py-3 bg-success text-white rounded-xl font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {signMutation.isPending ? 'Signing...' : 'Confirm & Sign'}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
