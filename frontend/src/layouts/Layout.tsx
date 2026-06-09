import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { AppUser } from '../context/AuthContext';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/dashboard/documents', label: 'Documents', icon: '📄' },
  { path: '/dashboard/upload', label: 'Upload', icon: '⬆️' },
  { path: '/dashboard/profile', label: 'Profile', icon: '👤' },
];

export default function Layout() {
  const { user, signOut } = useAuth() as { user: AppUser | null; signOut: () => Promise<void> };
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  // Get user metadata or email for display
  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 p-4">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-primary">PDF Sign</h1>
          <p className="text-sm text-gray-500">Document Signature App</p>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                location.pathname === item.path
                  ? 'bg-primary text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span>{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <div className="mb-3 px-4 py-2 bg-gray-100 rounded-lg">
            <p className="font-medium text-sm">{userName}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 p-8">
        <Outlet />
      </main>
    </div>
  );
}
