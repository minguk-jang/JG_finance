import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  profileLoading: boolean;
  profileError: Error | null;
  signUp: (email: string, password: string, name: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isAdmin: () => boolean;
  isEditor: () => boolean;
  isViewer: () => boolean;
  canEdit: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PROFILE_QUERY_TIMEOUT_MS = 12000;
const PROFILE_QUERY_TIMEOUT_MESSAGE = 'Supabase query timeout after 12s';
const PROFILE_UPSERT_TIMEOUT_MS = 15000;
const PROFILE_UPSERT_TIMEOUT_MESSAGE = 'Supabase profile upsert timeout after 15s';

const withTimeout = <T,>(
  promise: Promise<T>,
  timeoutMs = PROFILE_QUERY_TIMEOUT_MS,
  timeoutMessage = `Supabase request timed out after ${timeoutMs / 1000}s`
): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timeoutId));
  });
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const retryWithBackoff = async <T,>(
  operation: () => Promise<T>,
  {
    retries = 2,
    initialDelayMs = 500,
    backoffFactor = 2,
    retryable = () => true,
    onRetry,
  }: {
    retries?: number;
    initialDelayMs?: number;
    backoffFactor?: number;
    retryable?: (error: unknown) => boolean;
    onRetry?: (error: unknown, attempt: number, nextDelay: number) => void;
  } = {}
): Promise<T> => {
  let attempt = 0;
  let lastError: unknown;

  while (attempt <= retries) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!retryable(error) || attempt === retries) {
        break;
      }

      const nextDelay = initialDelayMs * Math.pow(backoffFactor, attempt);
      onRetry?.(error, attempt + 1, nextDelay);
      await sleep(nextDelay);
      attempt += 1;
    }
  }

  throw lastError;
};

const isRetryableProfileError = (error: unknown) => {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes('timeout') || message.includes('fetch') || message.includes('network');
  }
  return false;
};

const deriveFallbackName = (authUser: User) => {
  if (authUser.user_metadata && typeof authUser.user_metadata.name === 'string') {
    return authUser.user_metadata.name;
  }
  if (authUser.email) {
    return authUser.email.split('@')[0];
  }
  return 'Guest';
};

const createFallbackProfile = (authUser: User): UserProfile => {
  const nowIso = new Date().toISOString();
  return {
    id: authUser.id,
    email: authUser.email ?? '',
    name: deriveFallbackName(authUser),
    role: 'Viewer',
    status: 'pending',
    avatar:
      (authUser.user_metadata && (authUser.user_metadata.avatar_url as string | undefined)) ?? null,
    created_at: nowIso,
    updated_at: nowIso,
  };
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const selectProfile = async (userId: string) => {
    try {
      console.log('[Auth] Fetching profile from DB for user:', userId);
      console.log('[Auth] Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
      console.log('[Auth] Supabase client exists:', !!supabase);

      const runQuery = () =>
        withTimeout(
          supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .maybeSingle(),
          PROFILE_QUERY_TIMEOUT_MS,
          PROFILE_QUERY_TIMEOUT_MESSAGE
        );

      console.log('[Auth] Starting profile query...');
      const { data, error } = await retryWithBackoff(runQuery, {
        retries: 2,
        retryable: isRetryableProfileError,
        onRetry: (err, attempt, nextDelay) => {
          const message = err instanceof Error ? err.message : String(err);
          console.warn(
            `[Auth] Profile query attempt ${attempt} failed (${message}). Retrying in ${nextDelay}ms`
          );
        },
      });
      console.log('[Auth] Profile query completed');

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('[Auth] Profile not found (PGRST116)');
          return null;
        }
        console.error('[Auth] Supabase error during profile fetch:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        throw error;
      }

      console.log('[Auth] Profile fetched from DB:', data);
      return (data ?? null) as UserProfile | null;
    } catch (error) {
      console.error('[Auth] Error fetching profile:', error);
      throw error;
    }
  };

  const ensureProfile = async (authUser: User) => {
    console.log('[Auth] ensureProfile called for user:', authUser.id);
    let existing: UserProfile | null = null;

    try {
      existing = await selectProfile(authUser.id);
    } catch (error) {
      console.error('[Auth] Failed to load profile from Supabase:', error);
      throw error;
    }

    if (existing) {
      console.log('[Auth] Profile exists in DB:', existing);
      return existing;
    }

    console.log('[Auth] Profile not found, creating new profile...');
    const fallbackName = deriveFallbackName(authUser);

    const payload = {
      id: authUser.id,
      email: authUser.email ?? '',
      name: fallbackName,
      role: 'Viewer',
      avatar:
        (authUser.user_metadata && (authUser.user_metadata.avatar_url as string | undefined)) ??
        null,
    };

    console.log('[Auth] Creating profile with payload:', payload);
    try {
      const { data, error } = await withTimeout(
        supabase
          .from('users')
          .upsert(payload, { onConflict: 'id' })
          .select('*')
          .single(),
        PROFILE_UPSERT_TIMEOUT_MS,
        PROFILE_UPSERT_TIMEOUT_MESSAGE
      );

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error('Supabase profile upsert returned empty response');
      }

      console.log('[Auth] Profile created successfully:', data);
      return data as UserProfile;
    } catch (error) {
      console.error('[Auth] Error creating profile:', error);
      throw error;
    }
  };

  const loadProfile = async (authUser: User | null) => {
    if (!authUser) {
      return null;
    }

    const profile = await ensureProfile(authUser);
    return profile;
  };

  const beginProfileFetch = async (authUser: User) => {
    const fallbackProfile = createFallbackProfile(authUser);
    const previousProfile = profile;

    if (isMountedRef.current) {
      if (!previousProfile) {
        setProfile(fallbackProfile);
      }
      setProfileLoading(true);
      setProfileError(null);
    }

    try {
      const userProfile = await loadProfile(authUser);
      if (!isMountedRef.current) {
        return userProfile ?? fallbackProfile;
      }

      if (userProfile) {
        setProfile(userProfile);
        return userProfile;
      }

      setProfile(previousProfile ?? fallbackProfile);
      return previousProfile ?? fallbackProfile;
    } catch (error) {
      console.error('[Auth] Failed to load profile:', error);
      if (isMountedRef.current) {
        const normalizedError = error instanceof Error ? error : new Error(String(error));
        setProfileError(normalizedError);
        setProfile(previousProfile ?? fallbackProfile);
      }

      return previousProfile ?? fallbackProfile;
    } finally {
      if (isMountedRef.current) {
        setProfileLoading(false);
      }
    }
  };

  // Refresh profile
  const refreshProfile = async () => {
    if (user) {
      try {
        await beginProfileFetch(user);
      } catch (error) {
        console.error('[Auth] Failed to refresh profile:', error);
      }
    }
  };

  // Initialize auth state
  useEffect(() => {
    const initialize = async () => {
      if (!isMountedRef.current) {
        return;
      }

      setLoading(true);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!isMountedRef.current) {
          return;
        }

        console.log('[Auth] Initial session:', !!session, session?.user?.email);

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          beginProfileFetch(session.user);
        } else {
          setProfile(null);
          setProfileLoading(false);
          setProfileError(null);
        }
      } catch (error) {
        console.error('[Auth] Failed to initialize session:', error);
        if (isMountedRef.current) {
          const normalizedError = error instanceof Error ? error : new Error(String(error));
          setProfileError(normalizedError);
          setProfile(null);
          setProfileLoading(false);
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    initialize();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMountedRef.current) {
        return;
      }

      console.log('[Auth] Auth state changed:', _event, !!session);

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        beginProfileFetch(session.user);
      } else {
        setProfile(null);
        setProfileLoading(false);
        setProfileError(null);
      }

      if (isMountedRef.current) {
        setLoading(false);
      }
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

  // Role check helpers
  const isAdmin = () => profile?.role === 'Admin';
  const isEditor = () => profile?.role === 'Editor';
  const isViewer = () => profile?.role === 'Viewer';
  const canEdit = () => profile?.role === 'Admin' || profile?.role === 'Editor';

  const value = {
    user,
    session,
    profile,
    loading,
    profileLoading,
    profileError,
    signUp,
    signIn,
    signOut,
    refreshProfile,
    isAdmin,
    isEditor,
    isViewer,
    canEdit,
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
