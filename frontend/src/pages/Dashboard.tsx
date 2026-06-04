import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/axios';
import type { Document, DashboardStats } from '../types';

export default function Dashboard() {
  const { data: documentsData } = useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      const response = await api.get('/api/documents');
      return response.data.data as Document[];
    },
  });

  const documents = documentsData || [];
  
  const stats: DashboardStats = {
    total: documents.length,
    pending: documents.filter(d => d.status === 'pending').length,
    signed: documents.filter(d => d.status === 'signed').length,
    rejected: documents.filter(d => d.status === 'rejected').length,
  };

  const recentDocs = documents.slice(0, 5);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back! Here's your overview.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Total Documents', value: stats.total, color: 'bg-primary' },
          { label: 'Pending', value: stats.pending, color: 'bg-warning' },
          { label: 'Signed', value: stats.signed, color: 'bg-success' },
          { label: 'Rejected', value: stats.rejected, color: 'bg-danger' },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center text-white text-xl`}>
                {i === 0 ? '📄' : i === 1 ? '⏳' : i === 2 ? '✅' : '❌'}
              </div>
              <div>
                <p className="text-3xl font-bold">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm mb-8">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="flex gap-4">
          <Link
            to="/dashboard/upload"
            className="flex-1 p-4 bg-primary text-white rounded-xl text-center font-medium hover:bg-primary-hover transition-colors"
          >
            ⬆️ Upload Document
          </Link>
          <Link
            to="/dashboard/documents"
            className="flex-1 p-4 bg-gray-100 text-gray-700 rounded-xl text-center font-medium hover:bg-gray-200 transition-colors"
          >
            📋 View All Documents
          </Link>
        </div>
      </div>

      {/* Recent Documents */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Recent Documents</h2>
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
