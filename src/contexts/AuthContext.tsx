import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';
import type { Profile } from '@/types/schema';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch profile from profiles table
  const fetchProfile = useCallback(async (userId: string, jwt: string) => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/v1/users/me`,
        { headers: { Authorization: `Bearer ${jwt}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setProfile(data ?? null);
      }
    } catch {
      // If backend is unreachable, fall back to supabase profile query
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        setProfile(data as Profile | null);
      } catch {
        setProfile(null);
      }
    }
  }, []);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }: { data: { session: Session | null } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        localStorage.setItem('supabase-auth-token', s.access_token);
        fetchProfile(s.user.id, s.access_token);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: string, s: Session | null) => {
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.access_token) {
          localStorage.setItem('supabase-auth-token', s.access_token);
          if (s.user) fetchProfile(s.user.id, s.access_token);
        } else {
          localStorage.removeItem('supabase-auth-token');
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('supabase-auth-token');
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
