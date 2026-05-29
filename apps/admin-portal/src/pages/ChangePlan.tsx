import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { PageLayout } from '../components/ui';
import { CheckCircle, Minus, Plus, Loader2, Zap, Calendar, RefreshCcw } from 'lucide-react';
import { clsx } from 'clsx';

export function ChangePlan() {
    const { organization, refreshOrganization } = useAuth();
    const navigate = useNavigate();

    const [selectedPlan, setSelectedPlan] = useState<'Basic' | 'Premium'>(organization?.plan_type || 'Basic');
    const [selectedCycle, setSelectedCycle] = useState<'Monthly' | 'Yearly'>(organization?.subscription_period || 'Monthly');
    const [seatsToPurchase, setSeatsToPurchase] = useState<number>(organization?.seats_purchased || 5);
    const [memberCount, setMemberCount] = useState<number>(0);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewData, setPreviewData] = useState<any>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!organization?.id) return;
        fetchMemberCount();
    }, [organization?.id]);

    useEffect(() => {
        if (!organization?.id) return;

        const noChange =
            selectedPlan === organization.plan_type &&
            selectedCycle === organization.subscription_period &&
            seatsToPurchase === organization.seats_purchased;

        if (noChange) {
            setPreviewData(null);
            setPreviewLoading(false);
            return;
        }

        const fetchPreview = async () => {
            setPreviewLoading(true);
            try {
                const { data, error } = await supabase.functions.invoke('preview-plan-change', {
                    body: {
                        newPlanType: selectedPlan,
                        newBillingCycle: selectedCycle,
                        newSeatsCount: seatsToPurchase
                    }
                });
                if (error) throw error;
                setPreviewData(data);
            } catch (err) {
                console.error('Preview error:', err);
                setPreviewData(null);
            } finally {
                setPreviewLoading(false);
            }
        };

        const t = setTimeout(fetchPreview, 400);
        return () => clearTimeout(t);
    }, [selectedPlan, selectedCycle, seatsToPurchase, organization?.id]);

    async function fetchMemberCount() {
        const { count } = await supabase
            .from('members')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', organization?.id);
        setMemberCount(count || 0);
    }

    const handleConfirm = async () => {
        setSaving(true);
        try {
            if (selectedPlan === organization?.plan_type && selectedCycle === organization?.subscription_period) {
                const { error } = await supabase.functions.invoke('update-subscription-seats', {
                    body: { seatsCount: seatsToPurchase }
                });
                if (error) throw error;
            } else {
                if (seatsToPurchase !== organization?.seats_purchased) {
                    await supabase.functions.invoke('update-subscription-seats', {
                        body: { seatsCount: seatsToPurchase }
                    });
                }
                const { error } = await supabase.functions.invoke('change-subscription-plan', {
                    body: { action: 'changePlan', planType: selectedPlan, billingCycle: selectedCycle }
                });
                if (error) throw error;
            }
            await refreshOrganization();
            alert('Subscription updated successfully!');
            navigate('/dashboard/settings/billing');
        } catch (err: any) {
            alert(err.message || 'Failed to update subscription.');
            setSaving(false);
        }
    };

    if (!organization) return null;

    const hasChanges =
        selectedPlan !== organization.plan_type ||
        selectedCycle !== organization.subscription_period ||
        seatsToPurchase !== organization.seats_purchased;

    const isUpgrade = selectedPlan === 'Premium' && organization.plan_type === 'Basic';
    const isDowngrade = selectedPlan === 'Basic' && organization.plan_type === 'Premium';
    const isScheduled = previewData?.isScheduled ?? false;

    // Simple price per seat for display
    const newPricePerSeat = selectedPlan === 'Premium'
        ? (selectedCycle === 'Monthly' ? 6.99 : 4.99)
        : (selectedCycle === 'Monthly' ? 3.99 : 2.99);
    const billableSeats = Math.max(1, seatsToPurchase - 1);
    const renewalAmount = previewData?.nextRenewalAmount
        ?? (billableSeats * newPricePerSeat * (selectedCycle === 'Yearly' ? 12 : 1));
    const amountDueToday = previewData?.amountDueToday ?? 0;

    const renewalDate = previewData?.nextRenewalDate
        ? new Date(previewData.nextRenewalDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        : organization.current_period_end
        ? new Date(organization.current_period_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        : '—';

    // What happens next bullet text
    const immediateEffect = isUpgrade
        ? 'Premium features unlock immediately after confirmation.'
        : isDowngrade
        ? 'You keep Premium access until your current billing period ends.'
        : null;

    return (
        <PageLayout
            title="Change your plan"
            description="A few clicks to update your subscription."
            backButton={{ onClick: () => navigate('/dashboard/settings/billing'), label: 'Back to Billing' }}
        >
            <div className="max-w-3xl mx-auto space-y-6">

                {/* ── STEP 1: What is changing ── */}
                <div className="bg-surface border border-border/30 rounded-2xl p-6 space-y-5">

                    {/* Plan Tier */}
                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-text-muted uppercase tracking-widest block">Plan</label>
                        <div className="grid grid-cols-2 gap-3">
                            {(['Basic', 'Premium'] as const).map((plan) => {
                                const price = plan === 'Premium'
                                    ? (selectedCycle === 'Monthly' ? '$6.99' : '$4.99')
                                    : (selectedCycle === 'Monthly' ? '$3.99' : '$2.99');
                                const isSelected = selectedPlan === plan;
                                const isCurrent = organization.plan_type === plan;
                                return (
                                    <button
                                        key={plan}
                                        type="button"
                                        onClick={() => setSelectedPlan(plan)}
                                        className={clsx(
                                            'relative p-4 rounded-xl border-2 text-left transition-all duration-200 cursor-pointer',
                                            isSelected
                                                ? 'border-primary bg-primary/5 shadow-sm'
                                                : 'border-border/30 bg-main hover:border-border/60 hover:bg-surface'
                                        )}
                                    >
                                        {isCurrent && (
                                            <span className="absolute top-2.5 right-2.5 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-border/40 text-text-muted">
                                                Current
                                            </span>
                                        )}
                                        <div className="text-xl mb-1.5">{plan === 'Basic' ? '🌱' : '💎'}</div>
                                        <h3 className="text-sm font-black text-text-main">{plan}</h3>
                                        <p className="text-xs font-semibold text-text-muted mt-0.5">{price} / seat / mo</p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-border/20" />

                    {/* Billing Cycle */}
                    <div className="flex items-center justify-between">
                        <div>
                            <label className="text-[11px] font-black text-text-muted uppercase tracking-widest block mb-0.5">Billing Cycle</label>
                            <p className="text-xs text-text-muted">Yearly billing saves you 25%</p>
                        </div>
                        <div className="flex bg-main border border-border/30 p-1 rounded-lg gap-1">
                            {(['Monthly', 'Yearly'] as const).map((cycle) => (
                                <button
                                    key={cycle}
                                    type="button"
                                    onClick={() => setSelectedCycle(cycle)}
                                    className={clsx(
                                        'px-4 py-1.5 text-xs font-black rounded-md transition-all cursor-pointer flex items-center gap-1.5',
                                        selectedCycle === cycle
                                            ? 'bg-primary text-white shadow-sm'
                                            : 'text-text-muted hover:text-text-main'
                                    )}
                                >
                                    {cycle}
                                    {cycle === 'Yearly' && (
                                        <span className={clsx(
                                            'text-[9px] font-extrabold px-1 py-0.5 rounded transition-all',
                                            selectedCycle === 'Yearly'
                                                ? 'bg-white/20 text-white'
                                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                        )}>
                                            −25%
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-border/20" />

                    {/* Seats */}
                    <div className="flex items-center justify-between">
                        <div>
                            <label className="text-[11px] font-black text-text-muted uppercase tracking-widest block mb-0.5">Seats</label>
                            <p className="text-xs text-text-muted">
                                {memberCount} members active · 1 owner seat is free
                            </p>
                        </div>
                        <div className="flex items-center gap-3 bg-main border border-border/30 px-3 py-1.5 rounded-lg">
                            <button
                                type="button"
                                onClick={() => setSeatsToPurchase(Math.max(Math.max(1, memberCount), seatsToPurchase - 1))}
                                disabled={seatsToPurchase <= Math.max(1, memberCount)}
                                className="w-7 h-7 flex items-center justify-center rounded-md bg-surface border border-border/30 text-text-main hover:border-primary hover:text-primary transition-all disabled:opacity-30 cursor-pointer"
                            >
                                <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-sm font-black text-text-main w-6 text-center tabular-nums">{seatsToPurchase}</span>
                            <button
                                type="button"
                                onClick={() => setSeatsToPurchase(seatsToPurchase + 1)}
                                className="w-7 h-7 flex items-center justify-center rounded-md bg-surface border border-border/30 text-text-main hover:border-primary hover:text-primary transition-all cursor-pointer"
                            >
                                <Plus className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── STEP 2: Summary Card ── */}
                {hasChanges && (
                    <div className="bg-surface border border-border/30 rounded-2xl p-6 space-y-4">
                        <h2 className="text-[11px] font-black text-text-muted uppercase tracking-widest">Summary</h2>

                        {previewLoading ? (
                            <div className="flex items-center gap-3 py-4 text-text-muted">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-sm font-semibold">Calculating…</span>
                            </div>
                        ) : (
                            <>
                                {/* Amount due today */}
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-sm font-bold text-text-main">
                                            {isScheduled ? 'No charge today' : 'Amount Due Today'}
                                        </p>
                                        <p className="text-xs text-text-muted mt-0.5">
                                            {isScheduled
                                                ? 'Changes take effect at your next renewal.'
                                                : 'Charged immediately after confirmation.'}
                                        </p>
                                    </div>
                                    <p className={clsx(
                                        'text-2xl font-black tracking-tight',
                                        isScheduled ? 'text-text-muted' : 'text-primary dark:text-primary'
                                    )}>
                                        {isScheduled ? '$0.00' : `$${amountDueToday.toFixed(2)}`}
                                    </p>
                                </div>

                                <div className="border-t border-border/20" />

                                {/* Next renewal */}
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-sm font-bold text-text-main">Next Renewal</p>
                                        <p className="text-xs text-text-muted mt-0.5">{renewalDate}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-text-main">
                                            ${renewalAmount.toFixed(2)}
                                            <span className="text-xs text-text-muted font-semibold ml-1">
                                                / {selectedCycle === 'Monthly' ? 'mo' : 'yr'}
                                            </span>
                                        </p>
                                        <p className="text-xs text-text-muted mt-0.5">
                                            {selectedPlan} · {seatsToPurchase} seats · {selectedCycle}
                                        </p>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* ── STEP 3: What happens next ── */}
                {hasChanges && (
                    <div className="bg-surface border border-border/30 rounded-2xl p-6 space-y-3">
                        <h2 className="text-[11px] font-black text-text-muted uppercase tracking-widest">What happens next</h2>
                        <div className="space-y-3">
                            {immediateEffect && (
                                <div className="flex items-start gap-3">
                                    <Zap className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                                    <p className="text-sm font-semibold text-text-main">{immediateEffect}</p>
                                </div>
                            )}
                            <div className="flex items-start gap-3">
                                <Calendar className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                                <p className="text-sm font-semibold text-text-main">
                                    Your next renewal is on <span className="font-black">{renewalDate}</span>.
                                </p>
                            </div>
                            <div className="flex items-start gap-3">
                                <RefreshCcw className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                                <p className="text-sm font-semibold text-text-main">
                                    Future renewals will be{' '}
                                    <span className="font-black">
                                        ${renewalAmount.toFixed(2)}/{selectedCycle === 'Monthly' ? 'month' : 'year'}
                                    </span>{' '}
                                    for {seatsToPurchase} seats.
                                </p>
                            </div>
                            <div className="flex items-start gap-3">
                                <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                                <p className="text-sm font-semibold text-text-main">No disruption to your service or data.</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Actions ── */}
                <div className="flex gap-3 pb-8">
                    <button
                        type="button"
                        onClick={() => navigate('/dashboard/settings/billing')}
                        className="h-12 px-6 bg-surface border border-border/30 text-text-main font-bold text-sm rounded-xl hover:bg-main transition-all cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={saving || !hasChanges || previewLoading}
                        className={clsx(
                            'flex-1 h-12 bg-primary text-white font-black text-sm uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer',
                            (saving || !hasChanges || previewLoading) && 'opacity-40 cursor-not-allowed'
                        )}
                    >
                        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                        {saving ? 'Processing…' : hasChanges ? 'Confirm Changes' : 'No Changes'}
                    </button>
                </div>
            </div>
        </PageLayout>
    );
}
