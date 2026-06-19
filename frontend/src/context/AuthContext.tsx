import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI } from '../api/axios';
import { supabase } from '../api/supabase';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  user_metadata?: {
    name?: string;
    avatar_url?: string;
  };
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check Supabase session first (for Google OAuth)
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setUser({
            id: session.user.id,
            name: (session.user.user_metadata as any)?.name || session.user.email?.split('@')[0] || 'User',
            email: session.user.email || '',
          });
          setLoading(false);
          return;
        }

        // Check our JWT token (for email/password)
        const token = localStorage.getItem('token');
        if (token) {
          const res = await authAPI.getMe();
          if (res.data.success) {
            setUser(res.data.data.user);
          } else {
            localStorage.removeItem('token');
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          name: (session.user.user_metadata as any)?.name || session.user.email?.split('@')[0] || 'User',
          email: session.user.email || '',
        });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (name: string, email: string, password: string) => {
    const res = await authAPI.register(name, email, password);
    if (res.data.success) {
      localStorage.setItem('token', res.data.data.token);
      setUser(res.data.data.user);
    } else {
      throw new Error(res.data.message || 'Registration failed');
    }
  };

  const signIn = async (email: string, password: string) => {
    const res = await authAPI.login(email, password);
    if (res.data.success) {
      localStorage.setItem('token', res.data.data.token);
      setUser(res.data.data.user);
    } else {
      throw new Error(res.data.message || 'Login failed');
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
