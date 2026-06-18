import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/axios';

export default function SigningPage() {
  const { token } = useParams<{ token: string }>();
  const [signatureText, setSignatureText] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [signed, setSigned] = useState(false);
  const [rejected, setRejected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [linkData, setLinkData] = useState<any>(null);
  const [error, setError] = useState('');
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    if (token) {
      fetchLinkData();
    }
  }, [token]);

  const fetchLinkData = async () => {
    try {
      const response = await api.get(`/signatures/link/${token}`);
      if (response.data.success) {
        setLinkData(response.data.data);
      } else {
        setError(response.data.message || 'Link not found');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async () => {
    if (!signatureText.trim() || !linkData?.signatures?.length) return;
    
    setSigning(true);
    try {
      for (const sig of linkData.signatures) {
        await api.patch(`/signatures/${sig.id}`, {
          status: 'signed',
          signature_value: signatureText,
        });
      }
      
      await api.patch(`/documents/${linkData.document_id}`, {
        status: 'signed'
      });
      
      setSigned(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to sign');
    } finally {
      setSigning(false);
    }
  };

  const handleReject = async () => {
    if (!linkData?.document_id) return;
    
    setSigning(true);
    try {
      await api.patch(`/documents/${linkData.document_id}`, {
        status: 'rejected'
      });
      
      for (const sig of linkData.signatures) {
        await api.patch(`/signatures/${sig.id}`, {
          status: 'rejected'
        });
      }
      
      setRejected(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reject');
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error && !linkData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Link</h1>
          <p className="text-gray-600">{error}</p>
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

  if (rejected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Document Declined</h1>
          <p className="text-gray-600 mb-6">The document has been declined.</p>
          <Link
            to="/sign/rejected"
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
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-primary">PDF Sign</h1>
          <p className="text-gray-600">Signing as <span className="font-medium">{linkData?.signer_name}</span></p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary text-2xl">📄</div>
            <div>
              <h2 className="text-xl font-bold">Document Ready for Signature</h2>
              <p className="text-gray-500">{linkData?.document_title}</p>
            </div>
          </div>
          
          <div className="bg-gray-100 rounded-xl overflow-hidden" style={{ height: '300px' }}>
            {linkData?.document_url ? (
              <iframe
                src={linkData.document_url}
                className="w-full h-full"
                title="Document Preview"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">Document preview not available</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-xl font-bold mb-4">Complete All Fields</h2>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ✍️ Your Signature
            </label>
            <input
              type="text"
              value={signatureText}
              onChange={(e) => setSignatureText(e.target.value)}
              placeholder="Type your full name"
              className="w-full px-4 py-4 border-2 border-gray-300 rounded-xl text-xl font-serif focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
            <p className="text-sm text-gray-500 mt-2">By signing, you agree to the terms and conditions.</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={() => setShowConfirm(true)}
              disabled={signing || !signatureText.trim()}
              className="flex-1 px-6 py-4 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-colors disabled:opacity-50"
            >
              {signing ? 'Processing...' : '✓ Sign Document'}
            </button>
            <button
              onClick={() => setShowRejectModal(true)}
              disabled={signing}
              className="px-6 py-4 bg-red-50 text-red-600 rounded-xl font-semibold hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              Decline
            </button>
          </div>
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Confirm Signature</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to sign this document? This action cannot be undone.
            </p>
            
            <div className="bg-gray-100 rounded-xl p-4 mb-6">
              <span className="text-sm text-gray-500">Your signature:</span>
              <p className="text-2xl font-serif mt-1">{signatureText}</p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleSign}
                disabled={signing}
                className="flex-1 px-4 py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors disabled:opacity-50"
              >
                {signing ? 'Signing...' : 'Confirm & Sign'}
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

      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-red-600">Decline Document</h2>
            <p className="text-gray-600 mb-4">
              Please provide a reason for declining this document.
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter reason for declining (optional)"
              rows={4}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none resize-none mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  handleReject();
                }}
                disabled={signing}
                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {signing ? 'Processing...' : 'Confirm Decline'}
              </button>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
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
