import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isSuperAdmin: boolean;
  aalLevel: 'aal1' | 'aal2' | null;
  nextAalLevel: 'aal1' | 'aal2' | null;
  refreshAal: () => Promise<{ currentLevel: 'aal1' | 'aal2'; nextLevel: 'aal1' | 'aal2' } | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [aalLevel, setAalLevel] = useState<'aal1' | 'aal2' | null>(null);
  const [nextAalLevel, setNextAalLevel] = useState<'aal1' | 'aal2' | null>(null);

  const fetchAal = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (error) throw error;
      if (data) {
        setAalLevel(data.currentLevel as 'aal1' | 'aal2');
        setNextAalLevel(data.nextLevel as 'aal1' | 'aal2');
        return data as { currentLevel: 'aal1' | 'aal2'; nextLevel: 'aal1' | 'aal2' };
      }
    } catch (err) {
      console.error('Error fetching AAL level:', err);
    }
    return null;
  };

  const checkSuperAdminStatus = async (userEmail: string) => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('is_super_admin')
        .eq('email', userEmail)
        .single();

      if (error) throw error;
      setIsSuperAdmin(!!data?.is_super_admin);
      return !!data?.is_super_admin;
    } catch (err) {
      console.error('Error checking super admin status:', err);
      setIsSuperAdmin(false);
      return false;
    }
  };

  const handleAuthChange = async (currentSession: Session | null) => {
    setSession(currentSession);
    const currentUser = currentSession?.user ?? null;
    setUser(currentUser);

    if (currentUser && currentUser.email) {
      // 1. Fetch super admin profile
      const isAdmin = await checkSuperAdminStatus(currentUser.email);
      if (isAdmin) {
        // 2. Fetch AAL assurance levels
        await fetchAal();
      } else {
        // If not super admin, sign out automatically
        setIsSuperAdmin(false);
        setAalLevel(null);
        setNextAalLevel(null);
        await supabase.auth.signOut();
      }
    } else {
      setIsSuperAdmin(false);
      setAalLevel(null);
      setNextAalLevel(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    // Initial session load
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      handleAuthChange(initialSession);
    });

    // Auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, currentSession) => {
        setLoading(true);
        await handleAuthChange(currentSession);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const refreshAal = async () => {
    return await fetchAal();
  };

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setIsSuperAdmin(false);
    setAalLevel(null);
    setNextAalLevel(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        loading,
        isSuperAdmin,
        aalLevel,
        nextAalLevel,
        refreshAal,
        signOut,
      }}
    >
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
