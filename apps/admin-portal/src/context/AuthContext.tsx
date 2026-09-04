import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

interface MemberProfile {
    id: string;
    email: string;
    full_name: string;
    avatar_url: string | null;
    phone: string | null;
    role: 'Owner' | 'Admin' | 'Manager' | 'User' | 'Viewer' | 'Client';
    status: 'Active' | 'Inactive' | 'Pending';
    organization_id: string | null;
    organization_name: string | null;
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
    current_period_end?: string | null;
    created_at: string;
    stripe_customer_id?: string | null;
    stripe_subscription_id?: string | null;
    settings?: any;
}

interface AuthContextType {
    session: Session | null;
    user: User | null;
    profile: MemberProfile | null;
    organization: OrganizationProfile | null;
    loading: boolean;
    error: string | null;
    /** True when org is on Premium or Trial — use this everywhere instead of manual checks */
    isPremium: boolean;
    /** True when org is on Basic plan (or free/None) — opposite of isPremium (excluding locked) */
    isBasic: boolean;
    managedMemberIds: string[] | null;
    managedProjectIds: string[] | null;
    aalLevel: 'aal1' | 'aal2' | null;
    nextAalLevel: 'aal1' | 'aal2' | null;
    refreshAal: () => Promise<{ currentLevel: 'aal1' | 'aal2'; nextLevel: 'aal1' | 'aal2' } | null>;
    refreshProfile: () => Promise<MemberProfile | null>;
    /** Re-fetches only the organization row without reloading the full profile */
    refreshOrganization: () => Promise<OrganizationProfile | null>;
    signOut: () => Promise<void>;
    displayTimezone: string;
    setDisplayTimezone: React.Dispatch<React.SetStateAction<string>>;
    /**
     * False until the organization's timezone has been applied (or auth has
     * settled without one). `displayTimezone` defaults to 'UTC' before that, so
     * consumers deriving day boundaries must wait for this rather than treating
     * the provisional 'UTC' as a real choice — a user may genuinely select UTC.
     */
    timezoneReady: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Derives isPremium from an organization record. Single source of truth. */
function computeIsPremium(org: OrganizationProfile | null): boolean {
    if (!org) return false;
    // Trial counts as Premium access
    if (org.subscription_status === 'Trial') return true;
    // Premium plan that is Active
    if (org.plan_type === 'Premium' && org.subscription_status === 'Active') return true;
    return false;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<MemberProfile | null>(null);
    const [organization, setOrganization] = useState<OrganizationProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [managedMemberIds, setManagedMemberIds] = useState<string[] | null>(null);
    const [managedProjectIds, setManagedProjectIds] = useState<string[] | null>(null);
    const [aalLevel, setAalLevel] = useState<'aal1' | 'aal2' | null>(null);
    const [nextAalLevel, setNextAalLevel] = useState<'aal1' | 'aal2' | null>(null);
    const [displayTimezone, setDisplayTimezone] = useState<string>('UTC');
    const [timezoneReady, setTimezoneReady] = useState(false);

    useEffect(() => {
        if (organization?.settings?.orgTimezone) {
            setDisplayTimezone(organization.settings.orgTimezone);
            setTimezoneReady(true);
        }
    }, [organization?.settings?.orgTimezone]);

    // Fallback: an org may have no orgTimezone configured, in which case the
    // effect above never fires. Once auth has settled, whatever we hold is
    // final — without this, consumers gated on timezoneReady would wait forever.
    useEffect(() => {
        if (!loading) setTimezoneReady(true);
    }, [loading]);

    // Derived plan flags — always computed from organization state
    const isPremium = computeIsPremium(organization);
    const isBasic = !isPremium && 
                    organization?.subscription_status !== 'Locked' && 
                    organization?.subscription_status !== 'None';

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

    useEffect(() => {
        let isInitial = true;

        // 1. Initial session check
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) {
                fetchAal();
                fetchProfile(session.user.email!, 3, !isInitial);
            }
            else setLoading(false);
            isInitial = false;
        });

        // 2. Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            setSession(session);
            if (session) {
                fetchAal();
                if (event === 'TOKEN_REFRESHED') return;
                fetchProfile(session.user.email!, 3, !isInitial);
            }
            else {
                setProfile(null);
                setOrganization(null);
                setAalLevel(null);
                setNextAalLevel(null);
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
            console.log(`[AuthContext] Fetch already in progress, skipping duplicate call.`);
            return;
        }
        
        fetchInProgress.current = email;
        if (!silent) setLoading(true);

        try {
            console.log(`[AuthContext] Fetching profile... (Retries left: ${retries})`);
            
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

            if (member.status === 'Inactive') {
                setError('Your account is inactive. Please contact your administrator.');
                setProfile(null);
                setOrganization(null);
                setLoading(false);
                fetchInProgress.current = null;
                await supabase.auth.signOut();
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
                
                if (member.role === 'Manager') {
                    const { data: managedTeams } = await supabase.from('teams').select('id').eq('manager_id', member.id);
                    const { data: leadTeams } = await supabase.from('team_members').select('team_id').eq('member_id', member.id).eq('is_lead', true);
                    
                    const teamIds = new Set([
                        ...(managedTeams?.map(t => t.id) || []),
                        ...(leadTeams?.map(t => t.team_id) || [])
                    ]);

                    if (teamIds.size > 0) {
                        const { data: teamMembers } = await supabase.from('team_members').select('member_id').in('team_id', Array.from(teamIds));
                        const { data: projectTeams } = await supabase.from('project_teams').select('project_id').in('team_id', Array.from(teamIds));
                        
                        // Managers always see themselves
                        const memberIds = new Set([member.id, ...(teamMembers?.map(tm => tm.member_id) || [])]);
                        setManagedMemberIds(Array.from(memberIds));
                        setManagedProjectIds(projectTeams?.map(pt => pt.project_id) || []);
                    } else {
                        setManagedMemberIds([member.id]);
                        setManagedProjectIds([]);
                    }
                } else if (member.role === 'Client') {
                    const { data: clientData } = await supabase
                        .from('clients')
                        .select('id')
                        .ilike('email', email)
                        .maybeSingle();

                    if (clientData) {
                        const { data: clientProjects } = await supabase
                            .from('projects')
                            .select('id')
                            .eq('client_id', clientData.id);

                        const projectIds = clientProjects?.map(p => p.id) || [];
                        setManagedProjectIds(projectIds);

                        if (projectIds.length > 0) {
                            const { data: projMembers } = await supabase
                                .from('project_members')
                                .select('member_id')
                                .in('project_id', projectIds);

                            const { data: projTeams } = await supabase
                                .from('project_teams')
                                .select('team_id')
                                .in('project_id', projectIds);

                            const teamIds = projTeams?.map(pt => pt.team_id) || [];
                            let teamMemberIds: string[] = [];
                            if (teamIds.length > 0) {
                                const { data: tMembers } = await supabase
                                    .from('team_members')
                                    .select('member_id')
                                    .in('team_id', teamIds);
                                teamMemberIds = tMembers?.map(tm => tm.member_id) || [];
                            }

                            const memberIds = new Set([
                                ...(projMembers?.map(pm => pm.member_id) || []),
                                ...teamMemberIds
                            ]);

                            setManagedMemberIds(Array.from(memberIds));
                        } else {
                            setManagedMemberIds([]);
                        }
                    } else {
                        setManagedProjectIds([]);
                        setManagedMemberIds([]);
                    }
                } else {
                    setManagedMemberIds(null);
                    setManagedProjectIds(null);
                }
            } else {
                setOrganization(null);
                setManagedMemberIds(null);
                setManagedProjectIds(null);
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
        try {
            await supabase.auth.signOut();
        } catch (err) {
            console.error('Error during signOut:', err);
        }
        setProfile(null);
        setOrganization(null);
        setManagedMemberIds(null);
        setManagedProjectIds(null);
        setAalLevel(null);
        setNextAalLevel(null);
    };

    const refreshAal = async () => {
        return await fetchAal();
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
                
                if (member.status === 'Inactive') {
                    setError('Your account is inactive. Please contact your administrator.');
                    setProfile(null);
                    setOrganization(null);
                    setLoading(false);
                    await supabase.auth.signOut();
                    return null;
                }

                setProfile(member);

                if (member.organization_id) {
                    const { data: org } = await supabase
                        .from('organizations')
                        .select('*')
                        .eq('id', member.organization_id)
                        .single();
                    setOrganization(org);

                    if (member.role === 'Manager') {
                        // 1. Teams they manage or lead
                        const { data: managedTeams } = await supabase.from('teams').select('id').eq('manager_id', member.id);
                        const { data: leadTeams } = await supabase.from('team_members').select('team_id').eq('member_id', member.id).eq('is_lead', true);
                        
                        const teamIds = new Set([
                            ...(managedTeams?.map(t => t.id) || []),
                            ...(leadTeams?.map(t => t.team_id) || [])
                        ]);

                        // 2. Direct project assignments
                        const { data: directProjects } = await supabase.from('project_members').select('project_id').eq('member_id', member.id);
                        const directProjectIds = directProjects?.map(dp => dp.project_id) || [];

                        // 3. Projects from teams
                        let teamProjectIds: string[] = [];
                        let teamMemberIds: string[] = [];
                        
                        if (teamIds.size > 0) {
                            const [{ data: pTeams }, { data: tMembers }] = await Promise.all([
                                supabase.from('project_teams').select('project_id').in('team_id', Array.from(teamIds)),
                                supabase.from('team_members').select('member_id').in('team_id', Array.from(teamIds))
                            ]);
                            teamProjectIds = pTeams?.map(pt => pt.project_id) || [];
                            teamMemberIds = tMembers?.map(tm => tm.member_id) || [];
                        }

                        // Combine project IDs
                        const allProjectIds = Array.from(new Set([...directProjectIds, ...teamProjectIds]));

                        // 4. Members from those projects
                        let projectMemberIds: string[] = [];
                        if (allProjectIds.length > 0) {
                            const { data: pMembers } = await supabase.from('project_members').select('member_id').in('project_id', allProjectIds);
                            projectMemberIds = pMembers?.map(pm => pm.member_id) || [];
                        }

                        // Combine member IDs
                        const allMemberIds = Array.from(new Set([
                            member.id,
                            ...teamMemberIds,
                            ...projectMemberIds
                        ]));

                        setManagedMemberIds(allMemberIds);
                        setManagedProjectIds(allProjectIds);
                    } else if (member.role === 'Client') {
                        const { data: clientData } = await supabase
                            .from('clients')
                            .select('id')
                            .ilike('email', session.user.email)
                            .maybeSingle();

                        if (clientData) {
                            const { data: clientProjects } = await supabase
                                .from('projects')
                                .select('id')
                                .eq('client_id', clientData.id);

                            const projectIds = clientProjects?.map(p => p.id) || [];
                            setManagedProjectIds(projectIds);

                            if (projectIds.length > 0) {
                                const { data: projMembers } = await supabase
                                    .from('project_members')
                                    .select('member_id')
                                    .in('project_id', projectIds);

                                const { data: projTeams } = await supabase
                                    .from('project_teams')
                                    .select('team_id')
                                    .in('project_id', projectIds);

                                const teamIds = projTeams?.map(pt => pt.team_id) || [];
                                let teamMemberIds: string[] = [];
                                if (teamIds.length > 0) {
                                    const { data: tMembers } = await supabase
                                        .from('team_members')
                                        .select('member_id')
                                        .in('team_id', teamIds);
                                    teamMemberIds = tMembers?.map(tm => tm.member_id) || [];
                                }

                                const memberIds = new Set([
                                    ...(projMembers?.map(pm => pm.member_id) || []),
                                    ...teamMemberIds
                                ]);

                                setManagedMemberIds(Array.from(memberIds));
                            } else {
                                setManagedMemberIds([]);
                            }
                        } else {
                            setManagedProjectIds([]);
                            setManagedMemberIds([]);
                        }
                    } else {
                        setManagedMemberIds(null);
                        setManagedProjectIds(null);
                    }
                } else {
                    setManagedMemberIds(null);
                    setManagedProjectIds(null);
                }

                await fetchAal();
                setLoading(false);
                return member;
            }
            setProfile(null);
            setOrganization(null);
            setAalLevel(null);
            setNextAalLevel(null);
            setLoading(false);
            return null;
        } catch (err: any) {
            console.error('Error in refreshProfile:', err);
            setError(err.message);
            return null;
        }
    };

    /** Fetches only the organization row and updates state instantly.
     *  Call this after a plan change to reflect new permissions without a full page reload. */
    const refreshOrganization = async (): Promise<OrganizationProfile | null> => {
        if (!profile?.organization_id) return null;
        try {
            const { data: org, error: orgError } = await supabase
                .from('organizations')
                .select('*')
                .eq('id', profile.organization_id)
                .single();
            if (orgError) throw orgError;
            setOrganization(org);
            return org;
        } catch (err: any) {
            console.error('[AuthContext] refreshOrganization error:', err);
            return null;
        }
    };

    return (
        <AuthContext.Provider value={{
            session,
            user: session?.user ?? null,
            profile,
            organization,
            loading,
            error,
            isPremium,
            isBasic,
            aalLevel,
            nextAalLevel,
            refreshAal,
            refreshProfile,
            refreshOrganization,
            managedMemberIds,
            managedProjectIds,
            signOut,
            displayTimezone,
            setDisplayTimezone,
            timezoneReady
        }}>
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

/** Convenience alias — returns { isPremium, isBasic } without the rest of auth. */
export function usePlan() {
    const { isPremium, isBasic, organization } = useAuth();
    return { isPremium, isBasic, organization };
}
