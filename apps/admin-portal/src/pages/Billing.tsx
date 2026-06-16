import { useState, useEffect, Fragment } from 'react';
import {
    CreditCard,
    Users,
    ArrowUpCircle,
    History,
    CheckCircle2,
    AlertCircle,
    Calendar,
    Zap,
    Plus,
    Minus,
    ChevronRight,
    ChevronDown,
    ChevronUp,
    ExternalLink,
    Crown,
    Info
} from 'lucide-react';
import { PageLayout, Card, StatusBadge, LoadingState } from '../components/ui';

const CardBrandIcon = ({ brand, className }: { brand?: string, className?: string }) => {
    switch (brand?.toLowerCase()) {
        case 'mastercard':
            return (
                <svg viewBox="0 0 24 24" fill="none" className={className}>
                    <rect width="24" height="24" rx="4" fill="#000000"/>
                    <circle cx="9" cy="12" r="5" fill="#EB001B"/>
                    <circle cx="15" cy="12" r="5" fill="#F79E1B" fillOpacity="0.8"/>
                </svg>
            );
        case 'visa':
            return (
                <svg viewBox="0 0 24 24" fill="none" className={className}>
                    <rect width="24" height="24" rx="4" fill="#1A1F36"/>
                    <text x="12" y="15" fill="#fff" fontSize="8" fontWeight="900" fontFamily="sans-serif" textAnchor="middle" fontStyle="italic">VISA</text>
                </svg>
            );
        case 'amex':
            return (
                <svg viewBox="0 0 24 24" fill="none" className={className}>
                    <rect width="24" height="24" rx="4" fill="#006FCF"/>
                    <text x="12" y="14.5" fill="#fff" fontSize="6.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">AMEX</text>
                </svg>
            );
        case 'discover':
            return (
                <svg viewBox="0 0 24 24" fill="none" className={className}>
                    <rect width="24" height="24" rx="4" fill="#E55C20"/>
                    <text x="12" y="14.5" fill="#fff" fontSize="5.5" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">DISCOVER</text>
                </svg>
            );
        default:
            return (
                <svg viewBox="0 0 24 24" fill="none" className={className}>
                    <rect width="24" height="24" rx="4" fill="#1f2937"/>
                    <rect x="4" y="8" width="16" height="3" fill="#fff" fillOpacity="0.2"/>
                    <rect x="4" y="15" width="6" height="2" fill="#fff" fillOpacity="0.2"/>
                </svg>
            );
    }
};
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useNavigate, useSearchParams } from 'react-router-dom';
import clsx from 'clsx';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function Billing() {
    const { organization, refreshProfile, refreshOrganization, session } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [showMockPortalNotice, setShowMockPortalNotice] = useState(searchParams.get('mock_portal') === 'true');
    const [memberCount, setMemberCount] = useState(0);
    const [seatsToPurchase, setSeatsToPurchase] = useState(organization?.seats_purchased || 5);
    const [saving, setSaving] = useState(false);
    const [syncingAfterCheckout, setSyncingAfterCheckout] = useState(searchParams.get('success') === 'true');
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loadingInvoices, setLoadingInvoices] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<any>(null);
    const [expandedInvoices, setExpandedInvoices] = useState<Set<string>>(new Set());

    const toggleInvoice = (id: string) => {
        setExpandedInvoices(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // After Stripe redirects back with ?success=true, the webhook may not have fired yet.
    // Poll refreshOrganization until stripe_subscription_id appears in the DB (max 10 tries × 2s).
    useEffect(() => {
        if (searchParams.get('success') !== 'true') return;

        let attempts = 0;
        const MAX_ATTEMPTS = 10;

        const poll = async () => {
            attempts++;
            const updated = await refreshOrganization();
            const isWebhookDone = !!updated?.stripe_subscription_id;

            if (isWebhookDone || attempts >= MAX_ATTEMPTS) {
                setSyncingAfterCheckout(false);
                const cleanParams = new URLSearchParams(searchParams);
                cleanParams.delete('success');
                cleanParams.delete('session_id');
                navigate(
                    { search: cleanParams.toString() },
                    { replace: true }
                );
            } else {
                setTimeout(poll, 2000);
            }
        };

        poll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (organization?.id) {
            fetchMemberCount();
            fetchBillingHistory();
            setSeatsToPurchase(organization.seats_purchased || 5);
            // Silently backfill current_period_end / seats if missing (runs once per session)
            if (organization.stripe_subscription_id && !organization.current_period_end) {
                supabase.functions.invoke('sync-subscription')
                    .then(() => refreshOrganization())
                    .catch(() => {}); // silent — no UX impact
            }
        }
    }, [organization?.id, organization?.seats_purchased]);

    async function fetchMemberCount() {
        const { count } = await supabase
            .from('members')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', organization?.id);
        setMemberCount(count || 0);
    }

    async function fetchBillingHistory() {
        setLoadingInvoices(true);
        try {
            const isMockMode = !organization?.stripe_subscription_id || organization?.stripe_customer_id?.startsWith('cus_mock_');

            if (isMockMode) {
                setInvoices([
                    {
                        id: 'inv_mock_trial',
                        date: 'May 7, 2026',
                        description: 'Premium Plan (Trial Started)',
                        amount: '$0.00',
                        status: 'paid',
                        pdfUrl: '#'
                    }
                ]);
                setPaymentMethod({ brand: 'visa', last4: '4242', exp_month: 12, exp_year: 2028 });
                return;
            }

            const { data: { session: currentSession } } = await supabase.auth.getSession();
            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-billing-history`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentSession?.access_token}`,
                    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
                }
            });

            if (response.ok) {
                const result = await response.json();
                setInvoices(result.invoices || []);
                if (result.paymentMethod) setPaymentMethod(result.paymentMethod);
            }
        } catch (err) {
            console.error('Error fetching billing history:', err);
        } finally {
            setLoadingInvoices(false);
        }
    }

    const handleManageBilling = async () => {
        if (!organization?.stripe_customer_id) {
            navigate('/dashboard/pricing');
            return;
        }
        setSaving(true);
        try {
            const { data, error: funcError } = await supabase.functions.invoke('create-portal-session');

            if (funcError) throw funcError;

            if (data?.url) {
                window.location.href = data.url;
            }
        } catch (err: any) {
            console.error('Error starting Stripe portal:', err);
            alert(err.message || 'Failed to open billing settings.');
        } finally {
            setSaving(false);
        }
    };



    const handleCancelDowngrade = async () => {
        if (!organization?.id) return;
        
        setSaving(true);
        try {
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/change-subscription-plan`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentSession?.access_token}`,
                    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
                },
                body: JSON.stringify({
                    action: 'cancelDowngrade'
                })
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || `Server returned ${response.status}`);
            }

            if (result?.success) {
                await refreshProfile();
                alert(`Pending plan downgrade successfully cancelled. Your subscription will remain Premium indefinitely!`);
                window.location.reload();
            }
        } catch (err: any) {
            console.error('Error cancelling downgrade:', err);
            alert(err.message || 'Failed to cancel plan downgrade.');
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateSeats = async () => {
        if (!organization?.id) return;
        
        // If they have no active plan, redirect to pricing
        if (organization.subscription_status === 'None') {
            navigate('/dashboard/pricing');
            return;
        }

        setSaving(true);
        try {
            const isMockCustomer = organization.stripe_customer_id?.startsWith('cus_mock_');
            
            // If they are adding paid seats but have no subscription yet, create checkout session
            if (!organization.stripe_subscription_id && !isMockCustomer && seatsToPurchase > 1) {
                const { data: { session: currentSession } } = await supabase.auth.getSession();
                const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${currentSession?.access_token}`,
                        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
                    },
                    body: JSON.stringify({
                        planType: organization.plan_type,
                        billingCycle: organization.subscription_period || 'Monthly',
                        seatsCount: seatsToPurchase - 1, // Pass only paid seats
                        isTrial: false
                    })
                });

                const result = await response.json();
                if (!response.ok) throw new Error(result.error || `Server returned ${response.status}`);
                if (result?.url) {
                    window.location.href = result.url;
                    return;
                }
            }

            const isMockMode = !organization.stripe_subscription_id || isMockCustomer;

            if (isMockMode) {
                // Developer sandbox simulation mode:
                const { error } = await supabase
                    .from('organizations')
                    .update({ seats_purchased: seatsToPurchase })
                    .eq('id', organization.id);

                if (error) throw error;
                await refreshProfile();
                alert(`[Sandbox Mode] Seats successfully updated to ${seatsToPurchase}!`);
                window.location.reload();
                return;
            }

            // Real Stripe Mode: Call our secure Edge Function to update Stripe and Postgres
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-subscription-seats`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentSession?.access_token}`,
                    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
                },
                body: JSON.stringify({
                    seatsCount: seatsToPurchase
                })
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || `Server returned ${response.status}`);
            }

            if (result?.success) {
                await refreshProfile();
                await fetchMemberCount();
                alert(`Seats successfully updated to ${seatsToPurchase}! Your card will be prorated automatically.`);
                window.location.reload();
            }
        } catch (err: any) {
            console.error('Error updating seats:', err);
            alert(err.message || 'Failed to update seats.');
        } finally {
            setSaving(false);
        }
    };

    if (!organization) return <LoadingState />;

    return (
        <PageLayout
            title="Billing & Subscription"
            description="Manage your plan, seat usage, and payment methods."
            maxWidth="6xl"
        >
            {/* Post-Checkout Sync Banner: shown while webhook propagates */}
            {syncingAfterCheckout && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-[24px] p-6 mb-8 flex items-center gap-4 relative overflow-hidden backdrop-blur-md">
                    <div className="w-6 h-6 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin shrink-0" />
                    <div>
                        <h4 className="text-sm font-bold text-emerald-400">Syncing your subscription…</h4>
                        <p className="text-xs text-text-muted">We're confirming your payment with Stripe. This usually takes a few seconds.</p>
                    </div>
                </div>
            )}

            {/* Mock Billing Portal Redirect Notice */}
            {showMockPortalNotice && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-[24px] p-6 mb-8 flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden backdrop-blur-md">
                    <div className="flex items-center gap-3 relative z-10">
                        <CheckCircle2 className="w-6 h-6 text-blue-400 shrink-0" />
                        <div>
                            <h4 className="text-sm font-bold text-white">Stripe Portal Simulation Authorized</h4>
                            <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold">You clicked "Manage Subscription". Since Stripe is offline, the sandbox simulated customer portal access successfully.</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setShowMockPortalNotice(false)}
                        className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/35 border border-blue-500/30 text-blue-300 text-xs font-bold rounded-md transition-all relative z-10"
                    >
                        Dismiss
                    </button>
                </div>
            )}


            {/* Developer Sandbox Plan Sync / Downgrade controls */}
            {(organization.stripe_customer_id?.startsWith('cus_mock_') || (organization.plan_type === 'Premium' && !organization.stripe_customer_id)) && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-[24px] p-6 mb-8 flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden backdrop-blur-md">
                    <div className="flex items-center gap-3 relative z-10">
                        <Info className="w-6 h-6 text-amber-400 shrink-0 animate-pulse" />
                        <div>
                            <h4 className="text-sm font-bold text-white">Developer Simulation Mode Active</h4>
                            <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold">TrackOwl is running in Sandbox Offline Billing. No real subscription charges or credit cards are involved.</p>
                        </div>
                    </div>
                    <button 
                        disabled={saving}
                        onClick={async () => {
                            setSaving(true);
                            try {
                                const res = await fetch(`${API}/api/billing/mock-downgrade`, {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${session?.access_token}`
                                    }
                                });
                                if (!res.ok) throw new Error('Downgrade failed');
                                await refreshProfile();
                                alert('Sandbox subscription reset back to Basic successfully!');
                                window.location.reload();
                            } catch (err) {
                                alert('Failed to reset sandbox billing.');
                            } finally {
                                setSaving(false);
                            }
                        }}
                        className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/35 border border-rose-500/30 text-rose-300 text-xs font-bold rounded-md transition-all relative z-10 disabled:opacity-50"
                    >
                        {saving ? 'Resetting Sandbox...' : 'Reset to Basic Plan (Downgrade)'}
                    </button>
                </div>
            )}

            {/* Plan Downgrade Scheduled Notice */}
            {organization.settings?.pending_downgrade && (
                <div className="bg-amber-500/10 border border-amber-500/25 rounded-[24px] p-6 mb-8 flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden backdrop-blur-md">
                    <div className="flex items-center gap-3 relative z-10">
                        <Info className="w-6.5 h-6.5 text-amber-500 shrink-0 animate-pulse" />
                        <div>
                            <h4 className="text-sm font-bold text-text-main">Plan Downgrade Scheduled</h4>
                            <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold mt-0.5">
                                You have scheduled a downgrade to the <strong className="text-text-main">Basic</strong> plan, taking effect at your next renewal on{" "}
                                <strong className="text-text-main">
                                    {new Date(organization.settings.pending_downgrade.scheduled_for).toLocaleDateString()}
                                </strong>. 
                                You retain full access to Premium features until the end of your current period.
                            </p>
                        </div>
                    </div>
                    <button 
                        disabled={saving}
                        onClick={handleCancelDowngrade}
                        className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/35 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold rounded-md transition-all relative z-10 disabled:opacity-50 cursor-pointer shrink-0"
                    >
                        {saving ? 'Canceling...' : 'Cancel Pending Downgrade'}
                    </button>
                </div>
            )}

            <div className="grid gap-8 lg:grid-cols-12 pb-20">
                {/* Row 1: Active Plan Card (Full Width) */}
                <div className="lg:col-span-12">
                    <Card className="p-8 border border-border/30 bg-surface rounded-2xl shadow-soft overflow-hidden relative">
                        {/* Decorative Background */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[60px] rounded-full -mr-20 -mt-20" />

                        <div className="relative z-10">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                                <div className="space-y-1.5">
                                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Current Plan</p>
                                    <div className="flex items-center gap-4">
                                        <h2 className="text-3xl font-black text-text-main tracking-tight">
                                            {organization.subscription_status === 'None' ? 'Freemium' : organization.plan_type}
                                        </h2>
                                        <StatusBadge
                                            variant={organization.subscription_status === 'Active' || organization.subscription_status === 'Trial' ? 'success' : 'warning'}
                                            className="px-4 py-1 h-auto text-[10px] font-black uppercase tracking-widest animate-pulse"
                                        >
                                            {organization.subscription_status === 'None' ? 'Explore Mode' : organization.subscription_status}
                                        </StatusBadge>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    {organization.subscription_status !== 'None' && (
                                        <button
                                            onClick={() => navigate('/dashboard/settings/billing/change-plan')}
                                            disabled={saving || !!organization.settings?.pending_downgrade}
                                            title={organization.settings?.pending_downgrade ? "Plan downgrade already scheduled" : "Upgrade or downgrade your plan"}
                                            className="px-5 h-11 bg-surface border border-border/30 text-text-main hover:border-primary/55 font-black rounded-md text-[10px] uppercase tracking-wider shadow-sm active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <Zap className="w-4 h-4 text-primary" />
                                            Change Plan
                                        </button>
                                    )}
                                    {organization.subscription_status !== 'None' && organization.stripe_customer_id ? (
                                        <button
                                            onClick={handleManageBilling}
                                            disabled={saving}
                                            style={{ color: 'var(--bg-surface)' }}
                                            className="px-6 h-11 bg-primary hover:bg-primary-hover font-black rounded-md text-[10px] uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                                        >
                                            <Crown className="w-4 h-4" />
                                            {saving ? 'Loading...' : 'Manage Subscription'}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => navigate('/dashboard/pricing')}
                                            style={{ color: 'var(--bg-surface)' }}
                                            className="px-6 h-11 bg-primary hover:bg-primary-hover font-black rounded-md text-[10px] uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                                        >
                                            <ArrowUpCircle className="w-4 h-4" />
                                            Upgrade Plan
                                        </button>
                                    )}
                                    <button
                                        onClick={handleManageBilling}
                                        disabled={saving || organization.subscription_status === 'None' || !organization.stripe_customer_id}
                                        title={organization.subscription_status !== 'None' && organization.stripe_customer_id ? "Manage in Stripe" : "Stripe account not configured yet"}
                                        className="p-3 bg-surface border border-border/30 rounded-md text-slate-600 dark:text-slate-400 hover:text-primary hover:border-primary/35 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                    >
                                        <ExternalLink className="w-4.5 h-4.5" />
                                    </button>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-3 gap-6 p-6 bg-main/40 rounded-2xl border border-border/15">
                                <div className="space-y-1 text-center md:text-left md:border-r border-border/20 pr-4 last:border-r-0">
                                    <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest flex items-center justify-center md:justify-start gap-2">
                                        <Users className="w-3.5 h-3.5 text-primary/75" /> Seats Used
                                    </p>
                                    <p className="text-2xl font-black text-text-main">
                                        {memberCount} <span className="text-lg text-slate-500 dark:text-slate-400 font-bold">/ {organization.seats_purchased}</span>
                                    </p>
                                </div>
                                <div className="space-y-1 text-center md:text-left md:border-r border-border/20 pr-4 last:border-r-0">
                                    <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest flex items-center justify-center md:justify-start gap-2">
                                        <Calendar className="w-3.5 h-3.5 text-primary/75" />
                                        {organization.subscription_status === 'Trial' ? 'Trial Ends' : 'Renewal Date'}
                                    </p>
                                    <p className="text-xl font-black text-text-main">
                                        {organization.subscription_status === 'Trial' && organization.trial_ends_at
                                            ? new Date(organization.trial_ends_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                            : organization.current_period_end
                                                ? new Date(organization.current_period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                                : organization.subscription_status === 'Active'
                                                    ? 'Auto-renews'
                                                    : 'No active renewal'}
                                    </p>
                                </div>
                                <div className="space-y-1 text-center md:text-left last:border-r-0">
                                    <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest flex items-center justify-center md:justify-start gap-2">
                                        <CreditCard className="w-3.5 h-3.5 text-primary/75" /> Billing Cycle
                                    </p>
                                    <p className="text-xl font-black text-text-main">{organization.subscription_status === 'None' ? 'N/A' : organization.subscription_period}</p>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Row 2 - Left: Seat Management (Spans 8 Columns) */}
                <div className="lg:col-span-8">
                    <Card className="p-8 border border-border/30 bg-surface rounded-2xl shadow-soft h-full flex flex-col justify-between">
                        <div>
                            <div className="mb-6">
                                <h3 className="text-lg font-black text-text-main tracking-tight mb-1">Manage Seats</h3>
                                <p className="text-[12.5px] font-semibold text-slate-600 dark:text-slate-300">Purchase additional seats to invite more team members.</p>
                            </div>

                            <div className="flex flex-col md:flex-row items-center gap-8">
                                <div className="flex items-center gap-4 px-3 py-1.5 bg-main/60 rounded-md border border-border/20 w-fit shadow-sm">
                                    <button
                                        onClick={() => setSeatsToPurchase(Math.max(Math.max(1, memberCount), seatsToPurchase - 1))}
                                        disabled={seatsToPurchase <= Math.max(1, memberCount)}
                                        className="w-9 h-9 flex items-center justify-center rounded-md bg-surface border border-border/30 text-text-main hover:text-primary hover:border-primary/55 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm cursor-pointer"
                                    >
                                        <Minus className="w-4 h-4" />
                                    </button>
                                    <span className="text-xl font-black text-text-main w-8 text-center tabular-nums">
                                        {seatsToPurchase}
                                    </span>
                                    <button
                                        onClick={() => setSeatsToPurchase(seatsToPurchase + 1)}
                                        className="w-9 h-9 flex items-center justify-center rounded-md bg-surface border border-border/30 text-text-main hover:text-primary hover:border-primary/55 transition-all active:scale-95 shadow-sm cursor-pointer"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="flex-1 space-y-1.5">
                                    <div className="flex flex-col">
                                        <p className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] mb-0.5">
                                            {seatsToPurchase === organization.seats_purchased 
                                                ? 'Current Subscription' 
                                                : (seatsToPurchase < organization.seats_purchased 
                                                    ? 'Next Renewal Total' 
                                                    : 'New Subscription Total')}
                                        </p>
                                        <p className="text-2xl font-black text-text-main tracking-tight">
                                            ${(
                                                Math.max(0, seatsToPurchase - 1) * 
                                                (organization.plan_type === 'Premium' 
                                                    ? (organization.subscription_period === 'Monthly' ? 6.99 : 4.99) 
                                                    : (organization.subscription_period === 'Monthly' ? 3.99 : 2.99)
                                                ) * 
                                                (organization.subscription_period === 'Yearly' ? 12 : 1)
                                            ).toFixed(2)}
                                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                                {organization.subscription_period === 'Yearly' ? ' / yr' : ' / mo'}
                                            </span>
                                        </p>
                                    </div>
                                    
                                    {seatsToPurchase !== organization.seats_purchased && (
                                        <div className="pt-1.5 border-t border-border/30 animate-in fade-in slide-in-from-top-1">
                                            {seatsToPurchase > organization.seats_purchased ? (
                                                <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wide">
                                                    Additional: +${(
                                                        (seatsToPurchase - organization.seats_purchased) * 
                                                        (organization.plan_type === 'Premium' 
                                                            ? (organization.subscription_period === 'Monthly' ? 6.99 : 4.99) 
                                                            : (organization.subscription_period === 'Monthly' ? 3.99 : 2.99)
                                                        ) * 
                                                        (organization.subscription_period === 'Yearly' ? 12 : 1)
                                                    ).toFixed(2)} {organization.subscription_period === 'Yearly' ? '/yr' : '/mo'} (for {seatsToPurchase - organization.seats_purchased} new seat{seatsToPurchase - organization.seats_purchased > 1 ? 's' : ''})
                                                </p>
                                            ) : (
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wide">
                                                        Savings: -${(
                                                            (organization.seats_purchased - seatsToPurchase) * 
                                                            (organization.plan_type === 'Premium' 
                                                                ? (organization.subscription_period === 'Monthly' ? 6.99 : 4.99) 
                                                                : (organization.subscription_period === 'Monthly' ? 3.99 : 2.99)
                                                            ) * 
                                                            (organization.subscription_period === 'Yearly' ? 12 : 1)
                                                        ).toFixed(2)} {organization.subscription_period === 'Yearly' ? '/yr' : '/mo'} (at next renewal)
                                                    </p>
                                                    <p className="text-[11px] font-medium text-amber-500 leading-snug">
                                                        ⚠️ Note: Reducing seats takes effect on your next renewal. No refunds or prorated credits are issued for the current period.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    
                                    {seatsToPurchase === Math.max(1, memberCount) && memberCount > 0 && (
                                        <p className="text-[9px] font-bold text-amber-500 uppercase tracking-wide mt-1">
                                            Reached active member count ({memberCount}). Deactivate members to reduce seats further.
                                        </p>
                                    )}
                                    <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest mt-1">1 Free Owner Seat Included</p>
                                </div>

                                <button
                                    onClick={handleUpdateSeats}
                                    disabled={saving || (organization.subscription_status !== 'None' && seatsToPurchase === organization.seats_purchased)}
                                    style={{ color: 'var(--bg-surface)' }}
                                    className={clsx(
                                        "px-8 h-11 bg-primary hover:bg-primary-hover font-black rounded-md text-[10px] uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer",
                                        (saving || (organization.subscription_status !== 'None' && seatsToPurchase === organization.seats_purchased)) && "opacity-50 cursor-not-allowed"
                                    )}
                                >
                                    {organization.subscription_status === 'None' ? 'Upgrade to Get Seats' : (saving ? 'Saving...' : 'Update Seats')}
                                </button>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Row 2 - Right: Payment Method (Spans 4 Columns) */}
                <div className="lg:col-span-4">
                    <Card className="p-8 border border-border/30 bg-surface rounded-2xl shadow-soft h-full flex flex-col justify-between">
                        <div>
                            <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400 mb-6">Payment Method</h4>
                            {organization.subscription_status !== 'None' && organization.stripe_customer_id ? (
                                <div className="space-y-6">
                                    <div 
                                        onClick={handleManageBilling}
                                        className="p-4 bg-main/50 rounded-2xl border border-border/15 flex items-center gap-4 relative group cursor-pointer overflow-hidden shadow-sm"
                                    >
                                        {/* Decorative Sparkle */}
                                        <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 blur-xl group-hover:bg-primary/20 transition-colors" />

                                        {paymentMethod ? (
                                            <CardBrandIcon brand={paymentMethod.brand} className="w-10 h-9 shrink-0 shadow-sm rounded-md" />
                                        ) : (
                                            <div className="w-10 h-9 bg-surface border border-border/20 rounded-md flex items-center justify-center text-text-main shadow-sm shrink-0">
                                                <CreditCard className="w-5 h-5" />
                                            </div>
                                        )}
                                        <div className="flex-1">
                                            <p className="text-[12px] font-black text-text-main capitalize">
                                                {paymentMethod ? `${paymentMethod.brand} •••• ${paymentMethod.last4}` : 'Stripe Payment'}
                                            </p>
                                            <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                                                {paymentMethod ? `Expires ${paymentMethod.exp_month}/${paymentMethod.exp_year}` : 'Managed securely in Stripe'}
                                            </p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-slate-500 dark:text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                                    </div>
                                    <button
                                        onClick={handleManageBilling}
                                        disabled={saving}
                                        className="w-full h-11 bg-main border border-border/30 text-[10px] font-bold uppercase tracking-wider text-text-main rounded-md hover:bg-surface-hover transition-all cursor-pointer"
                                    >
                                        {saving ? 'Loading...' : 'Update Payment Method'}
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="p-4 bg-main/50 rounded-2xl border border-border/15 flex items-center gap-4 relative overflow-hidden opacity-60 shadow-sm">
                                        <div className="w-10 h-9 bg-surface border border-border/20 rounded-md flex items-center justify-center text-slate-500 dark:text-slate-400 shadow-sm">
                                            <CreditCard className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[12px] font-black text-slate-600 dark:text-slate-300">No card on file</p>
                                            <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Freemium Plan</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => navigate('/dashboard/pricing')}
                                        className="w-full h-11 bg-primary text-white dark:text-slate-950 hover:bg-primary-hover font-black text-[10px] uppercase tracking-wider rounded-md shadow-md transition-all cursor-pointer"
                                    >
                                        Add Payment Method
                                    </button>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Row 3: Billing History Card (Full Width) */}
                <div className="lg:col-span-12">
                    <Card className="p-8 border border-border/30 bg-surface rounded-2xl shadow-soft">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-black text-text-main tracking-tight mb-1">Billing History</h3>
                                <p className="text-[12.5px] font-semibold text-slate-600 dark:text-slate-300">View and download your recent invoices.</p>
                            </div>
                            <History className="w-5 h-5 text-slate-500 dark:text-slate-400 opacity-40" />
                        </div>

                        <div className="overflow-x-auto w-full">
                            {loadingInvoices ? (
                                <div className="flex items-center justify-center gap-3 py-12 text-text-muted">
                                    <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                                    <span className="text-[13px] font-bold">Loading invoices…</span>
                                </div>
                            ) : invoices.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-3">
                                    <History className="w-8 h-8 text-text-muted opacity-20" />
                                    <p className="text-[13px] font-bold text-text-muted">No billing history found.</p>
                                </div>
                            ) : (
                                <table className="w-full text-left">
                                    <thead className="bg-main/40">
                                        <tr>
                                            <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">Date</th>
                                            <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">Description</th>
                                            <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">Amount</th>
                                            <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">Status</th>
                                            <th className="px-6 py-4 text-right"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/10">
                                        {invoices.map((inv) => {
                                            const isExpanded = expandedInvoices.has(inv.id);
                                            const prorationLines = inv.lines?.filter((l: any) => l.proration) || [];
                                            const mainLines = inv.lines?.filter((l: any) => !l.proration) || [];
                                            const hasProrations = prorationLines.length > 0;
                                            
                                            // Construct a simple summary
                                            let displayDescription = inv.description;
                                            if (hasProrations && mainLines.length > 0) {
                                                displayDescription = mainLines[0].description;
                                            } else if (hasProrations) {
                                                displayDescription = "Seat Prorations (Mid-cycle upgrades)";
                                            }

                                            return (
                                                <Fragment key={inv.id}>
                                                    <tr className={clsx("hover:bg-main/30 transition-colors", hasProrations && "cursor-pointer")} onClick={() => hasProrations && toggleInvoice(inv.id)}>
                                                        <td className="px-6 py-4 text-[13px] font-bold text-text-main">{inv.date}</td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[13px] font-semibold text-slate-600 dark:text-slate-300">{displayDescription}</span>
                                                                {hasProrations && (
                                                                    <span className="flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                                                        {prorationLines.length} adjustments {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-[13px] font-bold text-text-main">{inv.amount}</td>
                                                        <td className="px-6 py-4">
                                                            <div className={clsx(
                                                                "flex items-center gap-1.5 font-bold text-[10px] uppercase",
                                                                inv.status === "paid" ? "text-emerald-500"
                                                                : inv.status === "pending" ? "text-blue-400"
                                                                : "text-amber-500"
                                                            )}>
                                                                {inv.status === "paid" ? (
                                                                    <>
                                                                        <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                                                                    </>
                                                                ) : inv.status === "pending" ? (
                                                                    <>
                                                                        <History className="w-3.5 h-3.5" /> Pending
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <AlertCircle className="w-3.5 h-3.5" /> {inv.status}
                                                                    </>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            {inv.pdfUrl && inv.pdfUrl !== '#' ? (
                                                                <a 
                                                                    href={inv.pdfUrl}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    className="text-slate-500 dark:text-slate-400 hover:text-primary transition-colors text-[11px] font-black hover:underline uppercase tracking-widest"
                                                                >
                                                                    Download
                                                                </a>
                                                            ) : (
                                                                <span className="text-slate-600/40 dark:text-slate-500/40 text-[11px] font-black uppercase tracking-widest select-none">
                                                                    N/A
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                    {isExpanded && hasProrations && (
                                                        <tr className="bg-main/10 border-y border-border/5">
                                                            <td colSpan={5} className="px-6 py-4">
                                                                <div className="pl-4 border-l-2 border-primary/20 space-y-3">
                                                                    <div className="mb-3">
                                                                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Proration Details</p>
                                                                        <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
                                                                            Note: Seat count changed between {Math.min(...prorationLines.map((l: any) => l.quantity || 0))} and {Math.max(...prorationLines.map((l: any) => l.quantity || 0))} during the billing period.
                                                                        </p>
                                                                    </div>
                                                                    {inv.lines.map((line: any) => (
                                                                        <div key={line.id} className="flex items-center justify-between text-[12px]">
                                                                            <span className={clsx(
                                                                                "font-medium pr-4",
                                                                                line.proration ? "text-slate-600 dark:text-slate-400" : "text-text-main font-bold"
                                                                            )}>
                                                                                {line.description}
                                                                            </span>
                                                                            <span className="font-bold text-text-main whitespace-nowrap">
                                                                                ${(line.amount / 100).toFixed(2)}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </Card>
                </div>
            </div>

        </PageLayout>
    );
}
