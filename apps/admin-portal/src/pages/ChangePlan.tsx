import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { PageLayout } from '../components/ui';
import { Check, Loader2 } from 'lucide-react';
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
            if (!organization?.stripe_subscription_id) {
                setPreviewLoading(false);
                return;
            }
            
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
    }, [selectedPlan, selectedCycle, organization?.id, organization?.stripe_subscription_id, seats]);

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
    const billableSeats = Math.max(0, seats - 1);
    const renewalAmount = previewData?.nextRenewalAmount
        ?? (billableSeats * newPricePerSeat * (selectedCycle === 'Yearly' ? 12 : 1));
    const amountDueToday = previewData?.amountDueToday ?? 0;

    const hasProratedDifference = !isScheduled && Math.abs(amountDueToday - renewalAmount) > 0.5;

    const renewalDate = previewData?.nextRenewalDate
        ? new Date(previewData.nextRenewalDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        : organization.current_period_end
        ? new Date(organization.current_period_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        : '—';

    const immediateEffect = isUpgrade
        ? 'Keep Premium access with immediate feature unlock.'
        : isDowngrade
        ? 'Keep Premium access until current billing period ends.'
        : null;

    return (
        <PageLayout
            title="Change your plan"
            description="A few clicks to update your subscription."
            showFavorite={false}
        >
            <div className="max-w-5xl mx-auto py-8 px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Left Column: Plan Selection & Billing Options */}
                    <div className="lg:col-span-7 space-y-6">
                        {/* Plan Cards Grid */}
                        <div className="space-y-3">
                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                                Select Plan
                            </label>
                            <div className="grid grid-cols-2 gap-4">
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
                                                'text-left transition-all p-4 rounded-xl relative flex flex-col justify-between cursor-pointer',
                                                isSelected
                                                    ? 'border-2 border-[#0B2559] dark:border-blue-500 bg-blue-50/20 dark:bg-blue-950/30 shadow-xs'
                                                    : 'border border-slate-200 dark:border-border/30 bg-white dark:bg-surface hover:border-slate-300 dark:hover:border-border/60'
                                            )}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="text-2xl">{plan === 'Basic' ? '🌱' : '💎'}</div>
                                                <div className="flex items-center gap-1.5">
                                                    {isCurrent && (
                                                        <span className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:border dark:border-slate-700/60 text-[11px] font-medium px-2 py-0.5 rounded-md">
                                                            Current Plan
                                                        </span>
                                                    )}
                                                    {isSelected && (
                                                        <div className="w-5 h-5 rounded-full bg-[#0B2559] dark:bg-blue-500 text-white flex items-center justify-center shrink-0">
                                                            <Check className="w-3 h-3 stroke-[3]" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="mt-4">
                                                <h3 className="text-base font-bold text-slate-900 dark:text-text-main">{plan}</h3>
                                                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">{price} / seat / mo</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Billing Cycle Selector */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                                Billing Cycle
                            </label>
                            <div className="bg-slate-100 dark:bg-surface border border-transparent dark:border-border/30 p-1 rounded-xl flex items-center justify-between gap-1">
                                <button
                                    type="button"
                                    onClick={() => setSelectedCycle('Monthly')}
                                    className={clsx(
                                        'flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center cursor-pointer',
                                        selectedCycle === 'Monthly'
                                            ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-text-main shadow-xs'
                                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-text-main'
                                    )}
                                >
                                    Monthly
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedCycle('Yearly')}
                                    className={clsx(
                                        'flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer',
                                        selectedCycle === 'Yearly'
                                            ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-text-main shadow-xs'
                                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-text-main'
                                    )}
                                >
                                    <span>Yearly</span>
                                    <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-400 dark:border dark:border-emerald-800/50 text-xs font-semibold px-2 py-0.5 rounded-md">
                                        -25%
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Active Seats Row */}
                        <div className="border border-slate-200 dark:border-border/30 bg-white dark:bg-surface rounded-xl p-4 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold text-slate-900 dark:text-text-main">Active Seats</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Managed from Billing page</p>
                            </div>
                            <span className="font-semibold text-slate-900 dark:text-text-main tabular-nums text-sm">
                                {seats} {seats === 1 ? 'seat' : 'seats'}
                            </span>
                        </div>
                    </div>

                    {/* Right Column: Order Summary & Confirmation Box (sticky) */}
                    <div className="lg:col-span-5">
                        <div className="bg-white dark:bg-surface border border-slate-200 dark:border-border/30 rounded-2xl p-6 shadow-sm sticky top-6">
                            <h2 className="text-base font-semibold text-slate-900 dark:text-text-main mb-4">Summary</h2>

                            {previewLoading ? (
                                <div className="flex items-center gap-2 py-6 text-slate-500 dark:text-slate-400 text-xs">
                                    <Loader2 className="w-4 h-4 animate-spin text-[#0B2559] dark:text-blue-400" />
                                    <span>Calculating changes…</span>
                                </div>
                            ) : (
                                <>
                                    {/* Line-Item Breakdown */}
                                    <div>
                                        <div className="flex items-baseline justify-between">
                                            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                                {isScheduled || !hasChanges ? 'No charge today' : 'Charge today'}
                                            </span>
                                            <span className="text-2xl font-bold text-slate-900 dark:text-text-main tabular-nums">
                                                {isScheduled || !hasChanges ? '$0.00' : `$${amountDueToday.toFixed(2)}`}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                            {isScheduled || !hasChanges
                                                ? 'Changes take effect at your next renewal'
                                                : hasProratedDifference
                                                ? 'Includes unused-time credit and prorated charge for the remaining period'
                                                : 'Charged immediately after confirmation'}
                                        </p>
                                    </div>

                                    <div className="border-t border-slate-100 dark:border-border/20 my-4" />

                                    {/* Next Renewal Row */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Next Renewal</p>
                                            <p className="text-xs font-semibold text-slate-900 dark:text-text-main mt-0.5">{renewalDate}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-semibold text-slate-900 dark:text-text-main tabular-nums">
                                                ${renewalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / {selectedCycle === 'Monthly' ? 'mo' : 'yr'}
                                            </p>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                                {selectedPlan} · {seats} {seats === 1 ? 'seat' : 'seats'} · {selectedCycle}
                                            </p>
                                        </div>
                                    </div>

                                    {/* What Happens Next List */}
                                    <div className="space-y-3.5 my-5 bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-border/20 rounded-xl p-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                        {immediateEffect && (
                                            <div className="flex items-start gap-2">
                                                <span className="shrink-0 text-sm leading-none mt-0.5">⚡</span>
                                                <span>{immediateEffect}</span>
                                            </div>
                                        )}
                                        <div className="flex items-start gap-2">
                                            <span className="shrink-0 text-sm leading-none mt-0.5">📅</span>
                                            <span>
                                                Next renewal is on <strong className="font-semibold text-slate-800 dark:text-slate-100">{renewalDate}</strong>.
                                            </span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="shrink-0 text-sm leading-none mt-0.5">💳</span>
                                            <span>
                                                Future renewals will be{' '}
                                                <strong className="font-semibold text-slate-800 dark:text-slate-100">
                                                    ${renewalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/{selectedCycle === 'Monthly' ? 'month' : 'year'}
                                                </strong>{' '}
                                                for {seats} {seats === 1 ? 'seat' : 'seats'}.
                                            </span>
                                        </div>
                                        <div className="flex items-start gap-2">
                                            <span className="shrink-0 text-sm leading-none mt-0.5">🛡️</span>
                                            <span>No disruption to your service or data.</span>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="space-y-2 pt-1">
                                        <button
                                            type="button"
                                            onClick={handleConfirm}
                                            disabled={saving || !hasChanges || previewLoading}
                                            className="w-full bg-[#0B2559] hover:bg-[#091d47] dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-medium py-2.5 rounded-xl text-sm shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                                            {saving ? 'Processing…' : hasChanges ? 'Confirm Changes' : 'No Changes'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => navigate('/dashboard/settings/billing')}
                                            className="w-full text-center text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 py-2 block cursor-pointer transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </PageLayout>
    );
}
