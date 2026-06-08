import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getDocument } from '../api/documents';
import { createSignature, getSignaturesByDocument, deleteSignature, Signature } from '../api/signatures';

export default function SignatureEditor() {
  const { id } = useParams<{ id: string }>();
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [document, setDocument] = useState<any>(null);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [placingMode, setPlacingMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const doc = await getDocument(id!);
      setDocument(doc);
      
      const sigs = await getSignaturesByDocument(id!);
      setSignatures(sigs);
      
      setTotalPages(doc.total_pages || 1);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleContainerClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!placingMode || !containerRef.current || !id) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x_percent = ((e.clientX - rect.left) / rect.width) * 100;
    const y_percent = ((e.clientY - rect.top) / rect.height) * 100;

    try {
      setSaving(true);
      const newSig = await createSignature({
        document_id: id,
        page_number: currentPage,
        x_percent: Math.round(x_percent * 100) / 100,
        y_percent: Math.round(y_percent * 100) / 100,
        width_percent: 20,
        height_percent: 8,
        signature_type: 'typed',
      });
      
      setSignatures(prev => [...prev, newSig]);
      setPlacingMode(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSignature = async (sigId: string) => {
    if (!confirm('Delete this signature field?')) return;

    try {
      await deleteSignature(sigId);
      setSignatures(prev => prev.filter(s => s.id !== sigId));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getSignaturePosition = (sig: Signature) => {
    if (sig.page_number !== currentPage) return null;
    return {
      left: `${sig.x_percent}%`,
      top: `${sig.y_percent}%`,
      width: `${sig.width_percent}%`,
      height: `${sig.height_percent}%`,
    };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error && !document) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error}</p>
        <Link to="/dashboard/documents" className="text-primary hover:underline mt-4 inline-block">
          Back to Documents
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <Link to="/dashboard/documents" className="text-sm text-gray-500 hover:text-primary mb-2 inline-block">
            ← Back to Documents
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Place Signatures: {document?.title || 'Document'}</h1>
        </div>
        <button
          onClick={() => setPlacingMode(!placingMode)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            placingMode 
              ? 'bg-red-500 text-white' 
              : 'bg-primary text-white hover:bg-primary-hover'
          }`}
        >
          {placingMode ? '✕ Cancel' : '✍️ Place Signature'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Instructions */}
      {placingMode && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-blue-800">
            <strong>Click on the PDF</strong> to place a signature field!
          </p>
        </div>
      )}

      {/* Page Selector */}
      <div className="mb-4 flex items-center gap-4">
        <span className="text-sm text-gray-600">Page:</span>
        <div className="flex gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`px-3 py-1 rounded-lg text-sm font-medium ${
                currentPage === page
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {page}
            </button>
          ))}
        </div>
        <span className="text-sm text-gray-500 ml-4">
          {signatures.filter(s => s.page_number === currentPage).length} signatures
        </span>
      </div>

      {/* PDF Container with Signature Overlays */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div
          ref={containerRef}
          onClick={handleContainerClick}
          className={`relative bg-gray-100 ${
            placingMode ? 'cursor-crosshair' : ''
          }`}
          style={{ height: '70vh' }}
        >
          {document?.original_file_url && (
            <iframe
              src={document.original_file_url}
              className="w-full h-full"
              title="Document PDF"
            />
          )}

          {/* Signature Markers */}
          {signatures.map(sig => {
            const pos = getSignaturePosition(sig);
            if (!pos) return null;
            
            return (
              <div
                key={sig.id}
                className={`absolute border-2 ${
                  sig.status === 'signed' 
                    ? 'border-green-500 bg-green-100' 
                    : 'border-red-500 bg-red-100'
                } rounded flex items-center justify-center text-xs font-medium z-10`}
                style={pos}
              >
                <div className="text-center p-1">
                  <div>{sig.status === 'signed' ? '✓ Signed' : '📝 Signature'}</div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSignature(sig.id);
                    }}
                    className="mt-1 text-xs text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}

          {/* Placing Indicator */}
          {placingMode && (
            <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium z-20">
              Click to place signature
            </div>
          )}
        </div>
      </div>

      {/* Save Indicator */}
      {saving && (
        <div className="fixed bottom-4 right-4 bg-primary text-white px-4 py-2 rounded-lg shadow-lg">
          Saving...
        </div>
      )}
    </div>
  );
}