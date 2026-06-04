import { Link } from 'react-router-dom';

export default function SigningRejected() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="text-center">
        <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-5xl">❌</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Document Declined</h1>
        <p className="text-gray-600 mb-8 max-w-md">
          You have declined to sign this document. The document owner has been notified.
        </p>
        <Link
          to="/"
          className="inline-block px-8 py-4 bg-primary text-white rounded-xl font-semibold hover:bg-primary-hover transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
