import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import { getDocument } from '../api/documents';
import { getSignaturesByDocument, Signature } from '../api/signatures';
import { api } from '../api/axios';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function DocumentDetail() {
  const { id } = useParams<{ id: string }>();
  const [document, setDocument] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [signingLink, setSigningLink] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    try {
      const doc = await getDocument(id!);
      setDocument(doc);
      
      // Get signatures
      const sigs = await getSignaturesByDocument(id!);
      setSignatures(sigs);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateLink = async () => {
    if (!signerName.trim()) {
      return;
    }
    
    setGenerating(true);
    try {
      const response = await api.post('/signatures/link', {
        documentId: id,
        signerName: signerName.trim(),
        signerEmail: signerEmail.trim() || null,
      });
      
      if (response.data.success) {
        setSigningLink(window.location.origin + response.data.data.signingUrl);
      }
    } catch (err) {
      console.error('Failed to generate link:', err);
    } finally {
      setGenerating(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(signingLink);
    alert('Link copied to clipboard!');
  };

  const handleGenerateSignedPdf = async () => {
    setGeneratingPdf(true);
    try {
      const response = await api.post(`/documents/${id}/generate-signed`);
      if (response.data.success && response.data.data.signedFileUrl) {
        // Open the signed PDF in a new tab
        window.open(response.data.data.signedFileUrl, '_blank');
        // Refresh document to get updated signed_file_url
        loadData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to generate signed PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleDownloadSignedPdf = () => {
    if (document.signed_file_url) {
      window.open(document.signed_file_url, '_blank');
    } else {
      handleGenerateSignedPdf();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error || 'Document not found'}</p>
        <Link to="/dashboard/documents" className="text-primary hover:underline mt-4 inline-block">
          Back to Documents
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <Link to="/dashboard/documents" className="text-sm text-gray-500 hover:text-primary mb-2 inline-block">
            ← Back to Documents
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{document.title}</h1>
          <p className="text-gray-600 mt-1">
            Created {new Date(document.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          {document.status === 'signed' && (
            <button
              onClick={handleDownloadSignedPdf}
              disabled={generatingPdf}
              className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {generatingPdf ? '⏳ Generating...' : '📥 Download Signed PDF'}
            </button>
          )}
          <button
            onClick={() => setShowShareModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            📤 Share
          </button>
          <Link
            to={`/dashboard/documents/${id}/editor`}
            className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors"
          >
            ✍️ Place Signatures {signatures.length > 0 && `(${signatures.length})`}
          </Link>
          <Link
            to={`/dashboard/documents/${id}/audit`}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            📋 Audit
          </Link>
          <span className={`px-4 py-2 rounded-full text-sm font-medium ${
            document.status === 'signed' ? 'bg-green-100 text-green-700' :
            document.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
            document.status === 'rejected' ? 'bg-red-100 text-red-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {document.status}
          </span>
        </div>
      </div>

      {/* Page Selector */}
      {signatures.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 bg-white p-2 rounded-lg border shadow-sm overflow-x-auto">
            {Array.from({ length: Math.max(1, totalPages) }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-4 py-2 rounded-lg text-sm font-bold min-w-[50px] ${
                  currentPage === page
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {page}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* PDF Viewer with Signature Markers */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden relative">
        {document.original_file_url ? (
          <Document
            file={document.original_file_url}
            onLoadSuccess={({ numPages }) => setTotalPages(numPages)}
            loading={
              <div className="flex items-center justify-center h-[70vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            }
          >
            <div className="flex justify-center items-start pt-4 overflow-y-auto" style={{ height: '70vh' }}>
              <Page 
                pageNumber={currentPage}
                height={700}
                className="shadow-lg"
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </div>
          </Document>
        ) : (
          <div className="flex items-center justify-center h-[70vh] text-gray-500">
            No PDF file available
          </div>
        )}
        
        {/* Signature Markers Overlay */}
        <div className="absolute inset-0 pointer-events-none">
          {signatures
            .filter(sig => sig.page_number === currentPage)
            .map((sig, idx) => (
              <div
                key={sig.id}
                className="absolute border-2 border-blue-500 bg-blue-100/70 rounded flex items-center justify-center"
                style={{
                  left: `${sig.x_percent}%`,
                  top: `${sig.y_percent}%`,
                  width: `${sig.width_percent}%`,
                  height: `${sig.height_percent}%`,
                }}
              >
                <span className="text-xl">📝</span>
                <span className="absolute -top-5 text-xs font-bold text-blue-600 bg-white px-1 rounded">
                  Sign {idx + 1}
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Share Document for Signing</h2>
              <button 
                onClick={() => {
                  setShowShareModal(false);
                  setSigningLink('');
                  setSignerName('');
                  setSignerEmail('');
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>

            {!signingLink ? (
              <>
                <p className="text-gray-600 mb-4">Enter signer details to generate a unique signing link.</p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Signer Name *</label>
                    <input
                      type="text"
                      value={signerName}
                      onChange={(e) => setSignerName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Signer Email (optional)</label>
                    <input
                      type="email"
                      value={signerEmail}
                      onChange={(e) => setSignerEmail(e.target.value)}
                      placeholder="john@example.com"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                    />
                  </div>

                  <button
                    onClick={handleGenerateLink}
                    disabled={!signerName.trim() || generating}
                    className="w-full py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
                  >
                    {generating ? 'Generating...' : 'Generate Signing Link'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-gray-600 mb-4">Share this link with the signer:</p>
                
                <div className="bg-gray-100 rounded-xl p-3 mb-4 break-all">
                  <p className="text-sm text-gray-500">Signing Link:</p>
                  <p className="font-medium text-blue-600">{signingLink}</p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={copyLink}
                    className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors"
                  >
                    �� Copy Link
                  </button>
                  <button
                    onClick={() => {
                      setSigningLink('');
                      setSignerName('');
                      setSignerEmail('');
                    }}
                    className="px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    New Link
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
