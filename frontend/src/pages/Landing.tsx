import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-primary">PDF Sign</h1>
          <div className="flex gap-4">
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-primary transition-colors"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Sign Documents
              <span className="text-primary"> Digitally</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Upload, sign, and share documents securely. No printing, no scanning, no hassle.
            </p>
            <Link
              to="/register"
              className="inline-block px-8 py-4 text-lg font-semibold text-white bg-primary hover:bg-primary-hover rounded-xl transition-colors"
            >
              Start Signing Free
            </Link>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
            <div className="bg-gray-100 rounded-xl p-6 mb-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center text-white text-xl">📄</div>
                <div>
                  <p className="font-semibold">Contract.pdf</p>
                  <p className="text-sm text-gray-500">2.4 MB • 3 pages</p>
                </div>
              </div>
              <div className="border-2 border-dashed border-primary rounded-lg p-4 text-center text-primary">
                Signature field placed here
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-1 bg-green-100 text-green-700 rounded-lg py-2 text-center font-medium">✓ Signed</div>
              <div className="flex-1 bg-gray-100 text-gray-600 rounded-lg py-2 text-center font-medium">Download</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: '📤', title: 'Upload PDF', desc: 'Upload your document in seconds' },
              { icon: '✍️', title: 'Place Signature', desc: 'Drag and drop signature fields' },
              { icon: '🔗', title: 'Share & Sign', desc: 'Send signing links to others' },
            ].map((feature, i) => (
              <div key={i} className="text-center p-6 rounded-2xl bg-gray-50">
                <div className="text-5xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-primary">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to get started?</h2>
          <p className="text-xl text-blue-100 mb-8">Join thousands of users signing documents digitally.</p>
          <Link
            to="/register"
            className="inline-block px-8 py-4 text-lg font-semibold text-primary bg-white hover:bg-gray-100 rounded-xl transition-colors"
          >
            Create Free Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 text-center text-gray-500 text-sm">
        <p>© 2024 PDF Sign. Built with React & Node.js</p>
      </footer>
    </div>
  );
}
