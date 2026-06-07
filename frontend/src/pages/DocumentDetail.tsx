import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getDocument } from '../api/documents';

export default function DocumentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [document, setDocument] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      getDocument(id)
        .then(setDocument)
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [id]);

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

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">Document Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">File Size</p>
            <p className="font-medium">{(document.file_size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Pages</p>
            <p className="font-medium">{document.total_pages}</p>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-gray-100 rounded-xl">
          <p className="text-sm text-gray-500 mb-2">File URL</p>
          <p className="text-sm break-all">{document.original_file_url}</p>
        </div>
      </div>
    </div>
  );
}