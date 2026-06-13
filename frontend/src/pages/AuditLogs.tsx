import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/axios';
import type { AuditLog } from '../types';

const actionIcons: Record<string, string> = {
  DOCUMENT_UPLOADED: '📤',
  DOCUMENT_VIEWED: '👁️',
  DOCUMENT_SIGNED: '✅',
  DOCUMENT_REJECTED: '❌',
  LINK_CREATED: '🔗',
  SIGNATURE_PLACED: '✍️',
  PDF_DOWNLOADED: '��',
};

export default function AuditLogs() {
  const { id } = useParams<{ id: string }>();

  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs', id],
    queryFn: async () => {
      const response = await api.get(`/audit/${id}`);
      return response.data.data as AuditLog[];
    },
    enabled: !!id,
  });

  return (
    <div>
      <div className="mb-8">
        <Link to={`/dashboard/documents/${id}`} className="text-sm text-gray-500 hover:text-primary mb-2 inline-block">
          ← Back to Document
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
        <p className="text-gray-600 mt-1">Track all activity for this document</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : logs && logs.length > 0 ? (
          <div className="space-y-4">
            {logs.map((log, index) => (
              <div key={log.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-lg">
                    {actionIcons[log.action] || '📋'}
                  </div>
                  {index < logs.length - 1 && (
                    <div className="w-0.5 h-full bg-gray-200 mt-2"></div>
                  )}
                </div>
                <div className="flex-1 pb-6">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{log.action.replace(/_/g, ' ')}</span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {new Date(log.created_at).toLocaleString()}
                  </p>
                  {log.ip_address && (
                    <p className="text-xs text-gray-400 mt-1">IP: {log.ip_address}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">📋</div>
            <p className="text-gray-500">No activity recorded yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
