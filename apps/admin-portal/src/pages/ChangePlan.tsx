import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { PageLayout } from '../components/ui';
import { CheckCircle, Loader2, Zap, Calendar, RefreshCcw } from 'lucide-react';
import { clsx } from 'clsx';

export function ChangePlan() {
    const { organization, refreshOrganization } = useAuth();
    const navigate = useNavigate();

    const [selectedPlan, setSelectedPlan] = useState<'Basic' | 'Premium'>(organization?.plan_type || 'Basic');
    const [selectedCycle, setSelectedCycle] = useState<'Monthly' | 'Yearly'>(organization?.subscription_period || 'Monthly');
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewData, setPreviewData] = useState<any>(null);
    const [saving, setSaving] = useState(false);

    // Seats are fixed to the org's current seat count — managed separately from plan changes
    const seats = organization?.seats_purchased || 1;

    useEffect(() => {
        if (!organization?.id) return;

        const noChange =
            selectedPlan === organization.plan_type &&
            selectedCycle === organization.subscription_period;

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
                        newSeatsCount: seats
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
    }, [selectedPlan, selectedCycle, organization?.id]);

    const handleConfirm = async () => {
        setSaving(true);
        try {
            const { error } = await supabase.functions.invoke('change-subscription-plan', {
                body: { action: 'changePlan', planType: selectedPlan, billingCycle: selectedCycle }
            });
            if (error) throw error;
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
        selectedCycle !== organization.subscription_period;

    const isUpgrade = selectedPlan === 'Premium' && organization.plan_type === 'Basic';
    const isDowngrade = selectedPlan === 'Basic' && organization.plan_type === 'Premium';
    const isScheduled = previewData?.isScheduled ?? false;

    const newPricePerSeat = selectedPlan === 'Premium'
        ? (selectedCycle === 'Monthly' ? 6.99 : 4.99)
        : (selectedCycle === 'Monthly' ? 3.99 : 2.99);
    const billableSeats = Math.max(1, seats - 1);
    const renewalAmount = previewData?.nextRenewalAmount
        ?? (billableSeats * newPricePerSeat * (selectedCycle === 'Yearly' ? 12 : 1));
    const amountDueToday = previewData?.amountDueToday ?? 0;

    // Is there a meaningful difference between today's charge and the normal renewal amount?
    // e.g. switching to yearly or upgrading mid-cycle creates a gap the user might question
    const hasProratedDifference = !isScheduled && Math.abs(amountDueToday - renewalAmount) > 0.5;

    const renewalDate = previewData?.nextRenewalDate
        ? new Date(previewData.nextRenewalDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        : organization.current_period_end
        ? new Date(organization.current_period_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        : '—';

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
            <div className="max-w-3xl mx-auto space-y-5">

                {/* ── STEP 1: Plan + Cycle ── */}
                <div className="bg-surface border border-border/30 rounded-2xl p-7 space-y-6">

                    {/* Plan Tier */}
                    <div className="space-y-3">
                        <label className="text-xs font-black text-text-muted uppercase tracking-widest block">Plan</label>
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
                                            'relative p-5 rounded-xl border-2 text-left transition-all duration-200 cursor-pointer',
                                            isSelected
                                                ? 'border-primary bg-primary/5 shadow-sm'
                                                : 'border-border/30 bg-main hover:border-border/60 hover:bg-surface'
                                        )}
                                    >
                                        {isCurrent && (
                                            <span className="absolute top-3 right-3 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-border/40 text-text-muted">
                                                Current
                                            </span>
                                        )}
                                        <div className="text-2xl mb-2">{plan === 'Basic' ? '🌱' : '💎'}</div>
                                        <h3 className="text-base font-black text-text-main">{plan}</h3>
                                        <p className="text-sm font-semibold text-text-muted mt-1">{price} / seat / mo</p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="border-t border-border/20" />

                    {/* Billing Cycle */}
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <label className="text-xs font-black text-text-muted uppercase tracking-widest block mb-1">Billing Cycle</label>
                            <p className="text-sm text-text-muted">Yearly billing saves you 25%</p>
                        </div>
                        <div className="flex bg-main border border-border/30 p-1 rounded-lg gap-1">
                            {(['Monthly', 'Yearly'] as const).map((cycle) => (
                                <button
                                    key={cycle}
                                    type="button"
                                    onClick={() => setSelectedCycle(cycle)}
                                    className={clsx(
                                        'px-4 py-2 text-sm font-black rounded-md transition-all cursor-pointer flex items-center gap-1.5',
                                        selectedCycle === cycle
                                            ? 'bg-primary text-white shadow-sm'
                                            : 'text-text-muted hover:text-text-main'
                                    )}
                                >
                                    {cycle}
                                    {cycle === 'Yearly' && (
                                        <span className={clsx(
                                            'text-[10px] font-extrabold px-1.5 py-0.5 rounded transition-all',
                                            selectedCycle === 'Yearly'
                                                ? 'bg-black/30 text-white'
                                                : 'bg-amber-500/15 text-amber-500 dark:text-amber-400'
                                        )}>
                                            −25%
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Active seats info-only row (no controls) */}
                    <div className="border-t border-border/20" />
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <label className="text-xs font-black text-text-muted uppercase tracking-widest block mb-1">Active Seats</label>
                            <p className="text-sm text-text-muted">Manage seats separately from the Billing page.</p>
                        </div>
                        <span className="text-base font-black text-text-main tabular-nums">{seats}</span>
                    </div>
                </div>

                {/* ── STEP 2: Summary Card ── */}
                {hasChanges && (
                    <div className="bg-surface border border-border/30 rounded-2xl p-7 space-y-5">
                        <h2 className="text-xs font-black text-text-muted uppercase tracking-widest">Summary</h2>

                        {previewLoading ? (
                            <div className="flex items-center gap-3 py-6 text-text-muted">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span className="text-base font-semibold">Calculating…</span>
                            </div>
                        ) : (
                            <>
                                {/* Charge today */}
                                <div className="flex items-start justify-between gap-6">
                                    <div className="flex-1">
                                        <p className="text-base font-bold text-text-main">
                                            {isScheduled ? 'No charge today' : 'Charge Today'}
                                        </p>
                                        <p className="text-sm text-text-muted mt-1.5 leading-relaxed">
                                            {isScheduled
                                                ? 'Changes take effect at your next renewal.'
                                                : hasProratedDifference
                                                ? 'Includes any unused-time credit from your current plan and a prorated charge for the remainder of this billing period.'
                                                : 'Charged immediately after confirmation.'}
                                        </p>
                                    </div>
                                    <p className={clsx(
                                        'text-3xl font-black tracking-tight shrink-0',
                                        isScheduled ? 'text-text-muted' : 'text-primary'
                                    )}>
                                        {isScheduled ? '$0.00' : `$${amountDueToday.toFixed(2)}`}
                                    </p>
                                </div>

                                <div className="border-t border-border/20" />

                                {/* Next renewal */}
                                <div className="flex items-start justify-between gap-6">
                                    <div>
                                        <p className="text-base font-bold text-text-main">Next Renewal</p>
                                        <p className="text-sm text-text-muted mt-1">{renewalDate}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-base font-black text-text-main">
                                            ${renewalAmount.toFixed(2)}
                                            <span className="text-sm text-text-muted font-semibold ml-1">
                                                / {selectedCycle === 'Monthly' ? 'mo' : 'yr'}
                                            </span>
                                        </p>
                                        <p className="text-sm text-text-muted mt-1">
                                            {selectedPlan} · {seats} seats · {selectedCycle}
                                        </p>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* ── STEP 3: What happens next ── */}
                {hasChanges && (
                    <div className="bg-surface border border-border/30 rounded-2xl p-7 space-y-5">
                        <h2 className="text-xs font-black text-text-muted uppercase tracking-widest">What happens next</h2>
                        <div className="space-y-4">
                            {immediateEffect && (
                                <div className="flex items-start gap-3.5">
                                    <Zap className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                                    <p className="text-base font-semibold text-text-main leading-snug">{immediateEffect}</p>
                                </div>
                            )}
                            <div className="flex items-start gap-3.5">
                                <Calendar className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                                <p className="text-base font-semibold text-text-main leading-snug">
                                    Your next renewal is on <span className="font-black">{renewalDate}</span>.
                                </p>
                            </div>
                            <div className="flex items-start gap-3.5">
                                <RefreshCcw className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                                <p className="text-base font-semibold text-text-main leading-snug">
                                    Future renewals will be{' '}
                                    <span className="font-black">
                                        ${renewalAmount.toFixed(2)}/{selectedCycle === 'Monthly' ? 'month' : 'year'}
                                    </span>{' '}
                                    for {seats} seats.
                                </p>
                            </div>
                            <div className="flex items-start gap-3.5">
                                <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                                <p className="text-base font-semibold text-text-main leading-snug">No disruption to your service or data.</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Actions ── */}
                <div className="flex gap-3 pb-10">
                    <button
                        type="button"
                        onClick={() => navigate('/dashboard/settings/billing')}
                        className="h-13 px-7 bg-surface border border-border/30 text-text-main font-bold text-sm rounded-xl hover:bg-main transition-all cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={saving || !hasChanges || previewLoading}
                        className={clsx(
                            'flex-1 h-13 bg-primary text-white font-black text-sm uppercase tracking-widest rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer',
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
