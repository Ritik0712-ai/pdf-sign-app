import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import { getDocument } from '../api/documents';
import { createSignature, getSignaturesByDocument, deleteSignature, updateSignaturePosition, Signature } from '../api/signatures';
import { api } from '../api/axios';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function SignatureEditor() {
  const { id } = useParams<{ id: string }>();
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [document, setDocument] = useState<any>(null);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [placingMode, setPlacingMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Drag state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });

  // Handle page change with proper scrolling
  useEffect(() => {
    if (currentPage > 0 && containerRef.current) {
      // Scroll to the current page position
      const scrollHeight = window.innerHeight || 800;
      const targetScroll = (currentPage - 1) * scrollHeight;
      window.scrollTo({ top: targetScroll, behavior: 'auto' });
    }
  }, [currentPage]);

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
      
      // Don't set totalPages here - it will be auto-detected by react-pdf's onLoadSuccess
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleContainerClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!placingMode || !containerRef.current || !id || draggingId) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x_percent = ((e.clientX - rect.left) / rect.width) * 100;
    const y_percent = ((e.clientY - rect.top) / rect.height) * 100;

    try {
      setSaving(true);
      const newSig = await createSignature({
        document_id: id,
        page_number: currentPage,
        x_percent: Math.max(0, Math.min(80, Math.round(x_percent * 100) / 100)),
        y_percent: Math.max(0, Math.min(92, Math.round(y_percent * 100) / 100)),
        width_percent: 15,
        height_percent: 5,
        signature_type: 'typed',
      });
      
      setSignatures(prev => [...prev, newSig]);
      setPlacingMode(false);
      showSuccess('✅ Signature placed on page ' + currentPage);
      
      // Update document status to 'pending' if it's still 'draft'
      if (document?.status === 'draft') {
        await api.patch(`/documents/${id}`, { status: 'pending' });
        setDocument({ ...document, status: 'pending' });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSignature = async (sigId: string) => {
    if (!confirm('Delete this signature field?')) return;

    try {
      setSaving(true);
      await deleteSignature(sigId);
      setSignatures(prev => prev.filter(s => s.id !== sigId));
      showSuccess('✅ Signature deleted');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Drag handlers
  const handleDragStart = (e: React.MouseEvent, sig: Signature) => {
    e.stopPropagation();
    e.preventDefault();
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const markerX = (sig.x_percent / 100) * rect.width;
    const markerY = (sig.y_percent / 100) * rect.height;
    
    setDragOffset({
      x: e.clientX - rect.left - markerX,
      y: e.clientY - rect.top - markerY,
    });
    setDraggingId(sig.id);
    setDragPosition({ x: sig.x_percent, y: sig.y_percent });
  };

  const handleDragMove = (e: React.MouseEvent) => {
    if (!draggingId || !containerRef.current) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const rect = containerRef.current.getBoundingClientRect();
    let newX = ((e.clientX - rect.left - dragOffset.x) / rect.width) * 100;
    let newY = ((e.clientY - rect.top - dragOffset.y) / rect.height) * 100;
    
    // Constrain to container bounds
    newX = Math.max(0, Math.min(80, newX));
    newY = Math.max(0, Math.min(92, newY));
    
    setDragPosition({ x: newX, y: newY });
    
    // Update the signature position in the local state
    setSignatures(prev => prev.map(s => 
      s.id === draggingId 
        ? { ...s, x_percent: Math.round(newX * 100) / 100, y_percent: Math.round(newY * 100) / 100 }
        : s
    ));
  };

  const handleDragEnd = async () => {
    if (!draggingId) return;
    
    const sigToUpdate = signatures.find(s => s.id === draggingId);
    if (!sigToUpdate) {
      setDraggingId(null);
      return;
    }
    
    setDraggingId(null);
    
    // Update position in database using the API
    try {
      await updateSignaturePosition(
        draggingId,
        Math.round(dragPosition.x * 100) / 100,
        Math.round(dragPosition.y * 100) / 100
      );
      showSuccess('✅ Position saved');
    } catch (err: any) {
      console.error('Failed to update signature position:', err);
      setError(err.message || 'Failed to save position');
    }
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

  const pageSignatures = signatures.filter(sig => sig.page_number === currentPage);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <Link to="/dashboard/documents" className="text-sm text-gray-500 hover:text-primary mb-1 inline-block">
              ← Back
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Place Signatures</h1>
            <p className="text-sm text-gray-600">{document?.title}</p>
          </div>
          <button
            onClick={() => setPlacingMode(!placingMode)}
            className={`px-6 py-3 rounded-lg font-bold transition-colors ${
              placingMode 
                ? 'bg-red-500 text-white' 
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {placingMode ? '✕ Cancel' : '✍️ Place Signature'}
          </button>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="max-w-7xl mx-auto px-4 mt-4">
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm font-medium">
            {successMessage}
          </div>
        </div>
      )}

      {error && (
        <div className="max-w-7xl mx-auto px-4 mt-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        </div>
      )}

      {/* Instructions */}
      {placingMode && (
        <div className="max-w-7xl mx-auto px-4 mt-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-blue-800 text-center">
              <strong>Click anywhere on the PDF below</strong> to place a signature field!
            </p>
          </div>
        </div>
      )}

      {/* Page Selector */}
      <div className="max-w-7xl mx-auto px-4 mt-4">
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

      {/* PDF Container - Show only ONE page at a time using react-pdf */}
      <div className="max-w-4xl mx-auto px-4 mt-4 mb-32">
        <div 
          ref={containerRef}
          onClick={handleContainerClick}
          onMouseMove={handleDragMove}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
          className={`relative bg-white rounded-xl overflow-hidden shadow-2xl border ${placingMode ? 'cursor-crosshair' : ''}`}
          style={{ 
            height: '75vh',
            maxHeight: '700px'
          }}
        >
          {document?.original_file_url ? (
            <Document
              file={document.original_file_url}
              onLoadSuccess={({ numPages }) => setTotalPages(numPages)}
              loading={
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
              }
              error={
                <div className="flex items-center justify-center h-full text-red-500">
                  Failed to load PDF
                </div>
              }
            >
              <div className="flex justify-center items-start pt-4 overflow-y-auto" style={{ height: 'calc(75vh - 40px)' }}>
                <Page 
                  pageNumber={currentPage}
                  height={720}
                  className="shadow-lg"
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />
              </div>
            </Document>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              No PDF file available
            </div>
          )}
          
          {/* Markers Overlay - Only for current page */}
          <div className="absolute inset-0 pointer-events-none">
            {pageSignatures.map(sig => (
              <div
                key={sig.id}
                draggable
                onMouseDown={(e) => handleDragStart(e, sig)}
                onClick={(e) => e.stopPropagation()}
                className="absolute pointer-events-auto group"
                style={{
                  left: `${sig.x_percent}%`,
                  top: `${sig.y_percent}%`,
                  width: `${sig.width_percent}%`,
                  height: `${sig.height_percent}%`,
                  backgroundColor: sig.status === 'signed' ? '#dcfce7' : '#fef3c7',
                  border: '2px dashed #f59e0b',
                  borderRadius: '4px',
                  cursor: draggingId === sig.id ? 'grabbing' : 'grab',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                }}
              >
                <span className="text-2xl">📝</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSignature(sig.id);
                  }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  title="Delete signature"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fixed Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <button 
            onClick={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-6 py-3 bg-gray-100 rounded-lg disabled:opacity-50 hover:bg-gray-200 font-medium flex items-center gap-2"
          >
            Next →
          </button>
          
          <button 
            onClick={() => {
              if (confirm('Done placing signatures? You can always come back to adjust positions.')) {
                window.location.href = `/dashboard/documents/${id}`;
              }
            }}
            className="px-6 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
          >
            ✓ Done - View Document
          </button>
        </div>
      </div>

      {/* Saving Indicator */}
      {saving && (
        <div className="fixed bottom-20 right-4 bg-primary text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
          Saving...
        </div>
      )}
    </div>
  );
}
