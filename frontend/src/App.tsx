import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useEffect } from 'react';
import { supabase } from './api/supabase';
import Layout from './layouts/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Documents from './pages/Documents';
import UploadDocument from './pages/UploadDocument';
import DocumentDetail from './pages/DocumentDetail';
import SignatureEditor from './pages/SignatureEditor';
import SigningPage from './pages/SigningPage';
import SigningSuccess from './pages/SigningSuccess';
import SigningRejected from './pages/SigningRejected';
import AuditLogs from './pages/AuditLogs';
import Profile from './pages/Profile';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AuthCallback() {
  useEffect(() => {
    // Check if there's an error in URL fragment (e.g., from OAuth provider)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const errorDescription = hashParams.get('error_description');
    if (errorDescription) {
      console.error('AuthCallback - OAuth error:', errorDescription);
      window.location.replace('/login?error=' + encodeURIComponent(errorDescription));
      return;
    }

    // Listen for auth state change FIRST - this catches the SIGNED_IN event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('AuthCallback - Auth state changed:', event);
      if (event === 'SIGNED_IN' && session) {
        localStorage.setItem('supabase_token', session.access_token);
        // Clean URL fragment and redirect
        window.history.replaceState(null, '', '/dashboard');
        window.location.href = '/dashboard';
      }
    });

    // Also detect session from URL hash - Supabase puts tokens in the hash
    if (window.location.hash) {
      console.log('AuthCallback - Hash detected, processing...');
      // Give Supabase a moment to detect the session from URL hash
      setTimeout(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('AuthCallback - Session after hash:', session);
        if (session) {
          localStorage.setItem('supabase_token', session.access_token);
          window.history.replaceState(null, '', '/dashboard');
          window.location.href = '/dashboard';
        }
      }, 500);
    }

    // Fallback: redirect to login after 5 seconds if nothing happens
    const timeout = setTimeout(() => {
      console.log('AuthCallback - Timeout, redirecting to login');
      window.location.replace('/login');
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Completing sign in...</p>
      </div>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/sign/:token" element={<SigningPage />} />
      <Route path="/sign/success" element={<SigningSuccess />} />
      <Route path="/sign/rejected" element={<SigningRejected />} />

      {/* Protected routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="documents" element={<Documents />} />
        <Route path="upload" element={<UploadDocument />} />
<Route path="documents/:id" element={<DocumentDetail />} />
<Route path="documents/:id/editor" element={<SignatureEditor />} />
<Route path="documents/:id/audit" element={<AuditLogs />} />
<Route path="profile" element={<Profile />} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
