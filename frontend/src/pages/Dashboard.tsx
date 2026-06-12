import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDocuments } from '../api/documents';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const docs = await getDocuments();
      setDocuments(docs);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats
  const stats = {
    total: documents.length,
    pending: documents.filter(d => d.status === 'pending').length,
    signed: documents.filter(d => d.status === 'signed').length,
    rejected: documents.filter(d => d.status === 'rejected').length,
  };

  // This week's stats
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const thisWeekDocs = documents.filter(d => new Date(d.created_at) >= oneWeekAgo);
  const thisWeekStats = {
    uploads: thisWeekDocs.length,
    signed: thisWeekDocs.filter(d => d.status === 'signed').length,
    pending: thisWeekDocs.filter(d => d.status === 'pending').length,
  };

  // Recent documents
  const recentDocs = [...documents]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  // Pending documents needing action
  const pendingDocs = documents.filter(d => d.status === 'pending').slice(0, 3);

  // Get user name
  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';
  const greeting = getGreeting();
  
  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header with greeting */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{greeting}, {userName}! 👋</h1>
        <p className="text-gray-600 mt-1">Here's what's happening with your documents.</p>
      </div>

      {/* This Week Stats */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 mb-8 text-white">
        <h2 className="text-lg font-semibold mb-4">📊 This Week</h2>
        <div className="grid grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-4xl font-bold">{thisWeekStats.uploads}</p>
            <p className="text-blue-100 text-sm">Documents Uploaded</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold">{thisWeekStats.signed}</p>
            <p className="text-blue-100 text-sm">Documents Signed</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold">{thisWeekStats.pending}</p>
            <p className="text-blue-100 text-sm">Awaiting Signature</p>
          </div>
        </div>
      </div>

      {/* All Time Stats */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white text-xl">📄</div>
            <div>
              <p className="text-3xl font-bold">{stats.total}</p>
              <p className="text-sm text-gray-500">Total Documents</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center text-white text-xl">⏳</div>
            <div>
              <p className="text-3xl font-bold">{stats.pending}</p>
              <p className="text-sm text-gray-500">Pending</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center text-white text-xl">✅</div>
            <div>
              <p className="text-3xl font-bold">{stats.signed}</p>
              <p className="text-sm text-gray-500">Signed</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center text-white text-xl">❌</div>
            <div>
              <p className="text-3xl font-bold">{stats.rejected}</p>
              <p className="text-sm text-gray-500">Rejected</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">⚡ Quick Actions</h2>
          <div className="space-y-3">
            <Link
              to="/dashboard/upload"
              className="flex items-center gap-3 p-4 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors"
            >
              <span className="text-xl">⬆️</span>
              <span className="font-medium">Upload New Document</span>
            </Link>
            <Link
              to="/dashboard/documents"
              className="flex items-center gap-3 p-4 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
            >
              <span className="text-xl">📋</span>
              <span className="font-medium">View All Documents</span>
            </Link>
          </div>
        </div>

        {/* Pending Action */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">⏳ Needs Attention</h2>
          {pendingDocs.length === 0 ? (
            <div className="text-center py-6">
              <div className="text-4xl mb-2">🎉</div>
              <p className="text-gray-500">All caught up!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingDocs.map((doc) => (
                <Link
                  key={doc.id}
                  to={`/dashboard/documents/${doc.id}`}
                  className="flex items-center justify-between p-3 bg-yellow-50 rounded-xl hover:bg-yellow-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📄</span>
                    <span className="font-medium text-sm truncate">{doc.title}</span>
                  </div>
                  <span className="text-xs text-yellow-700 font-medium">Share Link</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Documents */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm mt-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">📁 Recent Documents</h2>
          <Link to="/dashboard/documents" className="text-primary text-sm font-medium hover:underline">
            View All
          </Link>
        </div>

        {recentDocs.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-gray-500 mb-4">No documents yet</p>
            <Link
              to="/dashboard/upload"
              className="inline-block px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover transition-colors"
            >
              Upload Your First Document
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentDocs.map((doc) => (
              <Link
                key={doc.id}
                to={`/dashboard/documents/${doc.id}`}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">📄</div>
                  <div>
                    <p className="font-medium">{doc.title}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  doc.status === 'signed' ? 'bg-green-100 text-green-700' :
                  doc.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                  doc.status === 'rejected' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {doc.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}