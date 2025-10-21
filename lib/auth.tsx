import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const selectProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        return null;
      }

      return (data ?? null) as UserProfile | null;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  };

  const ensureProfile = async (authUser: User) => {
    const existing = await selectProfile(authUser.id);
    if (existing) {
      return existing;
    }

    const fallbackName =
      (authUser.user_metadata && (authUser.user_metadata.name as string | undefined)) ||
      authUser.email?.split('@')[0] ||
      'User';

    const payload = {
      id: authUser.id,
      email: authUser.email ?? '',
      name: fallbackName,
      role: 'Viewer',
      avatar:
        (authUser.user_metadata && (authUser.user_metadata.avatar_url as string | undefined)) ??
        null,
    };

    try {
      const { data, error } = await supabase
        .from('users')
        .upsert(payload, { onConflict: 'id' })
        .select('*')
        .single();

      if (error) {
        console.error('Error creating profile:', error);
        return null;
      }

      return data as UserProfile;
    } catch (error) {
      console.error('Error creating profile:', error);
      return null;
    }
  };

  const loadProfile = async (authUser: User | null) => {
    if (!authUser) {
      return null;
    }

    const profile = await ensureProfile(authUser);
    return profile;
  };

  // Refresh profile
  const refreshProfile = async () => {
    if (user) {
      const userProfile = await loadProfile(user);
      setProfile(userProfile);
    }
  };

  // Initialize auth state
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        loadProfile(session.user).then(setProfile);
      }

      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const userProfile = await loadProfile(session.user);
        setProfile(userProfile);
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Sign up with email and password
  const signUp = async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    });

    if (!error && data.user) {
      // Profile will be auto-created by trigger, but we can refresh it
      setTimeout(() => refreshProfile(), 1000);
    }

    return { error };
  };

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error };
  };

  // Sign out
  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook to require authentication
export function useRequireAuth() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      // Redirect to login or show login modal
      console.warn('User not authenticated');
    }
  }, [user, loading]);

  return { user, loading };
}
