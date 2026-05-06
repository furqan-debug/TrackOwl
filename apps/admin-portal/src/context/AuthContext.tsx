import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

interface MemberProfile {
    id: string;
    email: string;
    full_name: string;
    avatar_url: string | null;
    phone: string | null;
    role: 'Admin' | 'Manager' | 'User' | 'Viewer';
    status: 'Active' | 'Inactive' | 'Pending';
    organization_id: string | null;
    location: string | null;
    created_at: string;
}

interface AuthContextType {
    session: Session | null;
    user: User | null;
    profile: MemberProfile | null;
    loading: boolean;
    error: string | null;
    refreshProfile: () => Promise<MemberProfile | null>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<MemberProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // 1. Initial session check
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) fetchProfile(session.user.email!);
            else setLoading(false);
        });

        // 2. Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) fetchProfile(session.user.email!);
            else {
                setProfile(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // Track the current fetch to prevent concurrent overlapping calls
    const fetchInProgress = React.useRef<string | null>(null);

    async function fetchProfile(email: string, retries = 3) {
        // If we're already fetching for this email, don't start another one
        if (fetchInProgress.current === email && retries === 3) {
            console.log(`[AuthContext] Fetch already in progress for ${email}, skipping duplicate call.`);
            return;
        }
        
        fetchInProgress.current = email;
        setLoading(true); // Ensure we are in loading state

        try {
            console.log(`[AuthContext] Fetching profile for ${email}... (Retries left: ${retries})`);
            
            const { data, error } = await supabase
                .from('members')
                .select('*')
                .ilike('email', email)
                .maybeSingle();

            if (error) {
                console.error('[AuthContext] Profile fetch error:', email, error.message);
                
                // Retry on error too, as it might be a transient connection issue or RLS propagation delay
                if (retries > 0) {
                    setTimeout(() => fetchProfile(email, retries - 1), 2000);
                    return;
                }
                
                setError(`Profile Verification Failed: ${error.message}`);
                setLoading(false);
                fetchInProgress.current = null;
                return; 
            }
            
            if (!data) {
                if (retries > 0) {
                    console.log(`[AuthContext] No profile found for ${email}, retrying in 2s...`);
                    setTimeout(() => fetchProfile(email, retries - 1), 2000);
                    return;
                }
                console.error('[AuthContext] Profile not found after retries:', email);
                setProfile(null);
                setLoading(false);
                fetchInProgress.current = null;
                return;
            } else {
                console.log('[AuthContext] Profile successfully loaded:', data.email);
                setProfile(data);
                setError(null);
                setLoading(false);
                fetchInProgress.current = null;
            }
        } catch (err: any) {
            console.error('Error fetching profile:', err);
            if (retries > 0) {
                setTimeout(() => fetchProfile(email, retries - 1), 2000);
                return;
            }
            setError(err.message || 'Unknown error fetching profile');
            setProfile(null);
            setLoading(false);
            fetchInProgress.current = null;
        }
    }

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    const refreshProfile = async (): Promise<MemberProfile | null> => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.email) {
                const { data: member, error: memberError } = await supabase
                    .from('members')
                    .select('*')
                    .ilike('email', session.user.email)
                    .single();
                
                if (memberError) throw memberError;
                
                setProfile(member);
                setLoading(false);
                return member;
            }
            setProfile(null);
            setLoading(false);
            return null;
        } catch (err: any) {
            console.error('Error in refreshProfile:', err);
            setError(err.message);
            return null;
        }
    };

    return (
        <AuthContext.Provider value={{ session, user: session?.user ?? null, profile, loading, error, refreshProfile, signOut }}>
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
