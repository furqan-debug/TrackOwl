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

interface OrganizationProfile {
    id: string;
    name: string;
    plan_type: 'Basic' | 'Premium' | null;
    subscription_status: 'None' | 'Trial' | 'Active' | 'Locked' | 'Past Due';
    subscription_period: 'Monthly' | 'Yearly';
    seats_purchased: number;
    trial_ends_at: string | null;
    created_at: string;
}

interface AuthContextType {
    session: Session | null;
    user: User | null;
    profile: MemberProfile | null;
    organization: OrganizationProfile | null;
    loading: boolean;
    error: string | null;
    refreshProfile: () => Promise<MemberProfile | null>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<MemberProfile | null>(null);
    const [organization, setOrganization] = useState<OrganizationProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isInitial = true;

        // 1. Initial session check
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) fetchProfile(session.user.email!, 3, !isInitial);
            else setLoading(false);
            isInitial = false;
        });

        // 2. Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            setSession(session);
            if (session) {
                if (event === 'TOKEN_REFRESHED') return;
                fetchProfile(session.user.email!, 3, !isInitial);
            }
            else {
                setProfile(null);
                setOrganization(null);
                setLoading(false);
            }
            isInitial = false;
        });

        return () => subscription.unsubscribe();
    }, []);

    // Track the current fetch to prevent concurrent overlapping calls
    const fetchInProgress = React.useRef<string | null>(null);

    async function fetchProfile(email: string, retries = 3, silent = false) {
        // If we're already fetching for this email, don't start another one
        if (fetchInProgress.current === email && retries === 3) {
            console.log(`[AuthContext] Fetch already in progress for ${email}, skipping duplicate call.`);
            return;
        }
        
        fetchInProgress.current = email;
        if (!silent) setLoading(true);

        try {
            console.log(`[AuthContext] Fetching profile for ${email}... (Retries left: ${retries})`);
            
            const { data: member, error: memberError } = await supabase
                .from('members')
                .select('*')
                .ilike('email', email)
                .maybeSingle();

            if (memberError) throw memberError;
            
            if (!member) {
                if (retries > 0) {
                    setTimeout(() => fetchProfile(email, retries - 1), 2000);
                    return;
                }
                setProfile(null);
                setOrganization(null);
                setLoading(false);
                fetchInProgress.current = null;
                return;
            }

            setProfile(member);

            if (member.organization_id) {
                const { data: org, error: orgError } = await supabase
                    .from('organizations')
                    .select('*')
                    .eq('id', member.organization_id)
                    .maybeSingle();
                
                if (orgError) console.error('[AuthContext] Org fetch error:', orgError);
                setOrganization(org);
            } else {
                setOrganization(null);
            }

            setError(null);
            setLoading(false);
            fetchInProgress.current = null;

        } catch (err: any) {
            console.error('Error fetching profile:', err);
            if (retries > 0) {
                setTimeout(() => fetchProfile(email, retries - 1), 2000);
                return;
            }
            setError(err.message || 'Unknown error fetching profile');
            setProfile(null);
            setOrganization(null);
            setLoading(false);
            fetchInProgress.current = null;
        }
    }

    const signOut = async () => {
        await supabase.auth.signOut();
        setProfile(null);
        setOrganization(null);
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

                if (member.organization_id) {
                    const { data: org } = await supabase
                        .from('organizations')
                        .select('*')
                        .eq('id', member.organization_id)
                        .single();
                    setOrganization(org);
                }

                setLoading(false);
                return member;
            }
            setProfile(null);
            setOrganization(null);
            setLoading(false);
            return null;
        } catch (err: any) {
            console.error('Error in refreshProfile:', err);
            setError(err.message);
            return null;
        }
    };

    return (
        <AuthContext.Provider value={{ session, user: session?.user ?? null, profile, organization, loading, error, refreshProfile, signOut }}>
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
