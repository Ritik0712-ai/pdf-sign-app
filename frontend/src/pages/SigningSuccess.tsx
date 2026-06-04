import { Link } from 'react-router-dom';

export default function SigningSuccess() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="text-center">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-5xl">✅</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Document Signed Successfully!</h1>
        <p className="text-gray-600 mb-8 max-w-md">
          Thank you for signing. The document owner has been notified and will receive your signed copy.
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
