import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Document, Page } from 'react-pdf';
import { supabase } from '../api/supabase';
import { getDocument } from '../api/documents';

import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

export default function DocumentDetail() {
  const { id } = useParams<{ id: string }>();
  const [document, setDocument] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [numPages, setNumPages] = useState<number>(0);
  const [pdfUrl, setPdfUrl] = useState<string>('');

  useEffect(() => {
    if (id) {
      getDocument(id)
        .then(async (doc) => {
          setDocument(doc);
          // Get signed URL for the PDF
          const { data, error } = await supabase.storage
            .from('documents')
            .createSignedUrl(doc.original_file_url.split('/documents/')[1], 3600);
          
          if (error) {
            console.error('Failed to get signed URL:', error);
            setError('Failed to load PDF');
          } else {
            setPdfUrl(data.signedUrl);
          }
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [id]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
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
        <span className={`px-4 py-2 rounded-full text-sm font-medium ${
          document.status === 'signed' ? 'bg-green-100 text-green-700' :
          document.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
          document.status === 'rejected' ? 'bg-red-100 text-red-700' :
          'bg-gray-100 text-gray-700'
        }`}>
          {document.status}
        </span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="max-h-[70vh] overflow-auto flex flex-col items-center bg-gray-100 p-4">
          {pdfUrl ? (
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={(err) => {
                console.error('PDF load error:', err);
                setError('Failed to load PDF');
              }}
              loading={
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
              }
              error={
                <div className="text-center py-12">
                  <p className="text-red-500">Failed to load PDF</p>
                </div>
              }
            >
              {Array.from(new Array(numPages), (el, index) => (
                <Page
                  key={`page_${index + 1}`}
                  pageNumber={index + 1}
                  width={800}
                  className="mb-4 shadow-lg"
                />
              ))}
            </Document>
          ) : (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}