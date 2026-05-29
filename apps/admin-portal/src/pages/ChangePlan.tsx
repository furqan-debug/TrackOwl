import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { PageLayout, Card } from '../components/ui';
import { Zap, CheckCircle2, RefreshCw, Plus, Minus, ArrowRight, ShieldCheck, Percent, Info } from 'lucide-react';
import { clsx } from 'clsx';

export function ChangePlan() {
    const { organization, refreshOrganization } = useAuth();
    const navigate = useNavigate();

    // State
    const [selectedPlan, setSelectedPlan] = useState<'Basic' | 'Premium'>(organization?.plan_type || 'Basic');
    const [selectedCycle, setSelectedCycle] = useState<'Monthly' | 'Yearly'>(organization?.subscription_period || 'Monthly');
    const [seatsToPurchase, setSeatsToPurchase] = useState<number>(organization?.seats_purchased || 5);
    const [memberCount, setMemberCount] = useState<number>(0);
    
    // Preview state
    const [previewLoading, setPreviewLoading] = useState(true);
    const [previewData, setPreviewData] = useState<any>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!organization?.id) return;
        fetchMemberCount();
    }, [organization?.id]);

    useEffect(() => {
        if (!organization?.id) return;
        
        // Don't preview if nothing changed
        if (
            selectedPlan === organization.plan_type &&
            selectedCycle === organization.subscription_period &&
            seatsToPurchase === organization.seats_purchased
        ) {
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
                console.error("Preview error:", err);
            } finally {
                setPreviewLoading(false);
            }
        };

        const timeoutId = setTimeout(fetchPreview, 300); // debounce
        return () => clearTimeout(timeoutId);
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
            // Check if it's purely a seat update with no plan/cycle change
            if (selectedPlan === organization?.plan_type && selectedCycle === organization?.subscription_period) {
                const { error } = await supabase.functions.invoke('update-subscription-seats', {
                    body: { seatsCount: seatsToPurchase }
                });
                if (error) throw error;
            } else {
                // Changing plan or cycle (and optionally seats along with it)
                if (seatsToPurchase !== organization?.seats_purchased) {
                     await supabase.functions.invoke('update-subscription-seats', {
                        body: { seatsCount: seatsToPurchase }
                    });
                }
                
                const { error } = await supabase.functions.invoke('change-subscription-plan', {
                    body: {
                        action: "changePlan",
                        planType: selectedPlan,
                        billingCycle: selectedCycle
                    }
                });
                if (error) throw error;
            }

            await refreshOrganization();
            alert("Subscription updated successfully!");
            navigate('/dashboard/settings/billing');

        } catch (err: any) {
            alert(err.message || "Failed to update subscription");
            setSaving(false);
        }
    };

    if (!organization) return null;

    const isUpgrade = selectedPlan === 'Premium' && organization.plan_type === 'Basic';
    const isDowngrade = selectedPlan === 'Basic' && organization.plan_type === 'Premium';
    const isMonthlyToYearly = selectedCycle === 'Yearly' && organization.subscription_period === 'Monthly';
    const isYearlyToMonthly = selectedCycle === 'Monthly' && organization.subscription_period === 'Yearly';
    const isSeatIncrease = seatsToPurchase > organization.seats_purchased;
    const isSeatDecrease = seatsToPurchase < organization.seats_purchased;

    const hasChanges = selectedPlan !== organization.plan_type || 
                       selectedCycle !== organization.subscription_period || 
                       seatsToPurchase !== organization.seats_purchased;

    const newPricePerSeat = selectedPlan === 'Premium'
        ? (selectedCycle === 'Monthly' ? 6.99 : 4.99)
        : (selectedCycle === 'Monthly' ? 3.99 : 2.99);

    // Helper to format pricing display correctly
    const getPriceLabel = (plan: 'Basic' | 'Premium', cycle: 'Monthly' | 'Yearly') => {
        if (plan === 'Premium') {
            return cycle === 'Monthly' ? '$6.99 / seat / mo' : '$4.99 / seat / mo (billed annually)';
        } else {
            return cycle === 'Monthly' ? '$3.99 / seat / mo' : '$2.99 / seat / mo (billed annually)';
        }
    };

    const currentPriceLabel = getPriceLabel(organization.plan_type || 'Basic', organization.subscription_period || 'Monthly');
    const newPriceLabel = getPriceLabel(selectedPlan, selectedCycle);

    return (
        <PageLayout 
            title="Change your plan" 
            description="Modify your subscription tier, billing cycle, or seat allocation."
            backButton={{ onClick: () => navigate('/dashboard/settings/billing'), label: "Back to Billing" }}
        >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative">
                {/* LEFT COLUMN: Controls & Explanation */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Plan & Cycle Selection */}
                    <Card className="p-6 border border-border/30 bg-surface rounded-2xl shadow-sm space-y-6">
                        {/* Visual Flow Indicator: Current -> New */}
                        <div className="flex flex-col md:flex-row items-center gap-4 border-b border-border/20 pb-6">
                            {/* Current Plan Indicator */}
                            <div className="flex-1 w-full bg-main/50 border border-border/20 rounded-xl p-4 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-lg bg-surface flex items-center justify-center border border-border/30 shadow-sm">
                                    <div className="text-2xl">{organization.plan_type === 'Basic' ? '🌱' : '💎'}</div>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Current Plan</p>
                                    <h4 className="text-base font-black text-text-main">{organization.plan_type}</h4>
                                    <p className="text-xs font-semibold text-slate-500">{currentPriceLabel}</p>
                                </div>
                            </div>
                            
                            <ArrowRight className="w-5 h-5 text-slate-400 hidden md:block shrink-0" />
                            
                            {/* New Plan Preview */}
                            <div className={clsx(
                                "flex-1 w-full border rounded-xl p-4 flex items-center gap-4 transition-all",
                                selectedPlan !== organization.plan_type || selectedCycle !== organization.subscription_period ? "bg-primary/5 border-primary/30" : "bg-surface border-border/20"
                            )}>
                                <div className="w-12 h-12 rounded-lg bg-main flex items-center justify-center border border-border/30 shadow-sm">
                                    <div className="text-2xl">{selectedPlan === 'Basic' ? '🌱' : '💎'}</div>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">New Plan Preview</p>
                                    <h4 className="text-base font-black text-text-main">{selectedPlan} Plan</h4>
                                    <p className="text-xs font-semibold text-slate-500">{newPriceLabel}</p>
                                </div>
                            </div>
                        </div>

                        {/* Interactive Plan Selector */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Select Plan Tier</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setSelectedPlan('Basic')}
                                    className={clsx(
                                        "p-4 rounded-xl border-2 text-left transition-all relative overflow-hidden flex items-center justify-between cursor-pointer group",
                                        selectedPlan === 'Basic' 
                                            ? "border-primary bg-primary/5 text-text-main" 
                                            : "border-border/30 bg-surface hover:bg-main text-slate-400"
                                    )}
                                >
                                    <div>
                                        <h5 className="text-sm font-black text-text-main">Basic Plan</h5>
                                        <p className="text-xs font-semibold text-slate-500 mt-1">
                                            {selectedCycle === 'Monthly' ? '$3.99' : '$2.99'} / seat / mo
                                        </p>
                                    </div>
                                    <span className="text-2xl group-hover:scale-110 transition-transform">🌱</span>
                                </button>
                                
                                <button
                                    type="button"
                                    onClick={() => setSelectedPlan('Premium')}
                                    className={clsx(
                                        "p-4 rounded-xl border-2 text-left transition-all relative overflow-hidden flex items-center justify-between cursor-pointer group",
                                        selectedPlan === 'Premium' 
                                            ? "border-primary bg-primary/5 text-text-main" 
                                            : "border-border/30 bg-surface hover:bg-main text-slate-400"
                                    )}
                                >
                                    <div>
                                        <h5 className="text-sm font-black text-text-main flex items-center gap-1.5">
                                            Premium Plan
                                            <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                                Popular
                                            </span>
                                        </h5>
                                        <p className="text-xs font-semibold text-slate-500 mt-1">
                                            {selectedCycle === 'Monthly' ? '$6.99' : '$4.99'} / seat / mo
                                        </p>
                                    </div>
                                    <span className="text-2xl group-hover:scale-110 transition-transform">💎</span>
                                </button>
                            </div>
                        </div>

                        {/* Interactive Billing Cycle Selector */}
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-main/30 rounded-xl border border-border/20">
                            <div>
                                <h5 className="text-sm font-black text-text-main">Billing Cycle</h5>
                                <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                                    Switch to yearly billing to save 25% on your subscription.
                                </p>
                            </div>
                            <div className="flex bg-surface p-1 rounded-lg border border-border/30 shadow-sm shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setSelectedCycle('Monthly')}
                                    className={clsx(
                                        "px-4 py-1.5 text-xs font-black rounded-md transition-all cursor-pointer",
                                        selectedCycle === 'Monthly'
                                            ? "bg-primary text-white shadow-sm"
                                            : "text-slate-400 hover:text-text-main"
                                    )}
                                >
                                    Monthly
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedCycle('Yearly')}
                                    className={clsx(
                                        "px-4 py-1.5 text-xs font-black rounded-md transition-all cursor-pointer flex items-center gap-1.5",
                                        selectedCycle === 'Yearly'
                                            ? "bg-primary text-white shadow-sm"
                                            : "text-slate-400 hover:text-text-main"
                                    )}
                                >
                                    Yearly
                                    <span className={clsx(
                                        "text-[9px] font-extrabold uppercase tracking-wide px-1.5 py-0.5 rounded transition-all",
                                        selectedCycle === 'Yearly'
                                            ? "bg-white/20 text-white dark:bg-slate-950/15 dark:text-slate-950"
                                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                    )}>
                                        -25%
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Seat Management */}
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-main/30 rounded-xl border border-border/20">
                            <div>
                                <h5 className="text-sm font-black text-text-main">Active Seats</h5>
                                <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 mt-1">
                                    <Info className="w-3 h-3" /> The selected plan will apply to all billable seats (total seats minus 1 free owner seat).
                                </p>
                            </div>
                            <div className="flex items-center gap-3 px-3 py-1.5 bg-surface rounded-lg border border-border/30 shadow-sm">
                                <button
                                    type="button"
                                    onClick={() => setSeatsToPurchase(Math.max(Math.max(1, memberCount), seatsToPurchase - 1))}
                                    disabled={seatsToPurchase <= Math.max(1, memberCount)}
                                    className="w-7 h-7 flex items-center justify-center rounded bg-main text-text-main hover:text-primary transition-colors disabled:opacity-30 cursor-pointer"
                                >
                                    <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="text-sm font-black w-6 text-center tabular-nums">
                                    {seatsToPurchase}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setSeatsToPurchase(seatsToPurchase + 1)}
                                    className="w-7 h-7 flex items-center justify-center rounded bg-main text-text-main hover:text-primary transition-colors cursor-pointer"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </Card>

                    {/* What happens next section */}
                    <Card className="p-6 border border-border/30 bg-surface rounded-2xl shadow-sm">
                        <h3 className="text-[13px] font-black uppercase tracking-widest text-slate-500 mb-5">What happens next?</h3>
                        
                        <div className="space-y-5">
                            {/* Dynamic rules based on user selection */}
                            
                            {!hasChanges && (
                                <div className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                        <CheckCircle2 className="w-4 h-4 text-slate-500" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-text-main">No changes selected</h4>
                                        <p className="text-[12px] font-medium text-slate-500 mt-1">Adjust your plan, cycle, or seats to see what happens.</p>
                                    </div>
                                </div>
                            )}

                            {isUpgrade && (
                                <div className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                                        <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-text-main">Premium access starts immediately</h4>
                                        <p className="text-[12px] font-medium text-slate-500 mt-1">You'll get instant access to all Premium features for your team.</p>
                                    </div>
                                </div>
                            )}

                            {isDowngrade && (
                                <div className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                                        <RefreshCw className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-text-main">Downgrade scheduled for next renewal</h4>
                                        <p className="text-[12px] font-medium text-slate-500 mt-1">You will maintain full Premium access until the end of your current billing cycle. No prorated refunds are issued.</p>
                                    </div>
                                </div>
                            )}

                            {(isUpgrade || isSeatIncrease || isMonthlyToYearly) && (
                                <div className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                                        <RefreshCw className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-text-main">Immediate charge applied today</h4>
                                        <p className="text-[12px] font-medium text-slate-500 mt-1">
                                            {isMonthlyToYearly 
                                                ? "You will be charged the new yearly rate immediately, minus a credit for any unused time on your monthly plan."
                                                : "You'll only pay the prorated difference for the remainder of your current billing cycle."}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {isSeatDecrease && (
                                <div className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                                        <Minus className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-text-main">Seat reduction takes effect at renewal</h4>
                                        <p className="text-[12px] font-medium text-slate-500 mt-1">Your billing quantity remains unchanged until your next renewal date. No credits or refunds are issued for removed seats.</p>
                                    </div>
                                </div>
                            )}

                            {isYearlyToMonthly && (
                                <div className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                                        <RefreshCw className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-text-main">Cycle switch scheduled</h4>
                                        <p className="text-[12px] font-medium text-slate-500 mt-1">You will remain on Yearly billing until your current year expires, then switch to Monthly. No refunds are issued.</p>
                                    </div>
                                </div>
                            )}

                            {hasChanges && (
                                <>
                                    <div className="flex gap-4">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                            <ShieldCheck className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-text-main">No disruption to your service</h4>
                                            <p className="text-[12px] font-medium text-slate-500 mt-1">Your current data, settings, and team assignments will remain completely safe and unchanged.</p>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </Card>
                </div>

                {/* RIGHT COLUMN: Order Summary */}
                <div className="lg:col-span-1">
                    <div className="sticky top-6 space-y-4">
                        <Card className="p-6 border border-border/30 bg-surface rounded-2xl shadow-premium">
                            <h3 className="text-base font-black text-text-main mb-6">Order summary</h3>

                            <div className="space-y-4 text-sm font-medium">
                                <div className="flex justify-between border-b border-border/20 pb-4">
                                    <div>
                                        <p className="font-bold text-text-main">{selectedPlan} Plan</p>
                                        <p className="text-xs text-slate-500 mt-0.5">Per seat / {selectedCycle === 'Monthly' ? 'month' : 'month (billed annually)'}</p>
                                    </div>
                                    <div className="font-black text-text-main">${newPricePerSeat}</div>
                                </div>

                                <div className="flex justify-between border-b border-border/20 pb-4">
                                    <div>
                                        <p className="font-bold text-text-main">Billable seats</p>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            {selectedCycle === 'Monthly' 
                                                ? `$${newPricePerSeat} × ${Math.max(1, seatsToPurchase - 1)} seats` 
                                                : `$${newPricePerSeat}/mo × 12 mo = $${(newPricePerSeat * 12).toFixed(2)}/yr × ${Math.max(1, seatsToPurchase - 1)} seats`}
                                        </p>
                                    </div>
                                    <div className="font-black text-text-main">{Math.max(1, seatsToPurchase - 1)}</div>
                                </div>

                                <div className="flex justify-between pt-2">
                                    <p className="font-bold text-text-main">{selectedCycle} subtotal</p>
                                    <div className="font-black text-text-main">${(Math.max(1, seatsToPurchase - 1) * newPricePerSeat * (selectedCycle === 'Yearly' ? 12 : 1)).toFixed(2)}</div>
                                </div>

                                {hasChanges && (
                                    <div className="mt-6 bg-main/50 border border-border/30 rounded-xl p-4 animate-in fade-in zoom-in-95">
                                        <div className="flex justify-between items-baseline mb-2">
                                            <p className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                                                {previewData?.isScheduled ? "Effective Date" : "Charge Today"}
                                            </p>
                                        </div>
                                        
                                        {previewLoading ? (
                                            <div className="h-8 flex items-center text-xs text-slate-500">Calculating...</div>
                                        ) : (
                                            <>
                                                {previewData?.isScheduled ? (
                                                    <div>
                                                        <p className="text-lg font-black text-text-main">
                                                            {new Date(previewData.effectiveDate).toLocaleDateString()}
                                                        </p>
                                                        <p className="text-[11px] text-slate-500 mt-1">No payment due today. Changes take effect on your next renewal.</p>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <p className="text-3xl font-black text-emerald-500 tracking-tight">
                                                            ${previewData?.amountDueToday?.toFixed(2) || "0.00"}
                                                        </p>
                                                        
                                                        {previewData?.prorationDetails && previewData.prorationDetails.length > 0 && (
                                                            <div className="mt-3 space-y-1 pt-3 border-t border-border/20">
                                                                <p className="text-[10px] font-bold text-text-muted uppercase">Adjustments Applied:</p>
                                                                {previewData.prorationDetails.map((p: any, i: number) => (
                                                                    <div key={i} className="flex justify-between text-[11px]">
                                                                        <span className="text-text-secondary truncate pr-2" title={p.description}>{p.description}</span>
                                                                        <span className={p.amount < 0 ? "text-emerald-500 font-bold" : "text-text-main"}>
                                                                            {p.amount < 0 ? "-" : ""}${Math.abs(p.amount).toFixed(2)}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}

                                <div className="mt-4 pt-4 border-t border-border/20">
                                    <div className="flex justify-between items-baseline">
                                        <div>
                                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Next Renewal</p>
                                            <p className="text-[10px] text-slate-400 mt-0.5">
                                                {previewData?.nextRenewalDate 
                                                    ? new Date(previewData.nextRenewalDate).toLocaleDateString() 
                                                    : new Date(organization.current_period_end!).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-emerald-500">
                                                ${previewData?.nextRenewalAmount?.toFixed(2) || (Math.max(1, seatsToPurchase - 1) * newPricePerSeat * (selectedCycle === 'Yearly' ? 12 : 1)).toFixed(2)}
                                                <span className="text-[10px] text-slate-500 font-bold ml-1 uppercase">{selectedCycle === 'Monthly' ? '/ mo' : '/ yr'}</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Upsell to Yearly if Monthly */}
                        {selectedCycle === 'Monthly' && (
                            <button 
                                onClick={() => setSelectedCycle('Yearly')}
                                className="w-full bg-primary/10 border border-primary/20 p-4 rounded-xl flex items-center justify-between hover:bg-primary/15 transition-colors cursor-pointer group"
                            >
                                <div className="flex items-center gap-3 text-left">
                                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                        <Percent className="w-4 h-4 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-primary">Save 25% with yearly</p>
                                        <p className="text-[11px] font-medium text-primary/80 mt-0.5">Switch to yearly billing to lock in discounts.</p>
                                    </div>
                                </div>
                                <div className="text-[10px] font-bold text-primary uppercase bg-surface px-2 py-1 rounded shadow-sm border border-primary/10 group-hover:scale-105 transition-transform">
                                    Switch
                                </div>
                            </button>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => navigate('/dashboard/settings/billing')}
                                className="h-11 px-4 bg-main border border-border/30 text-text-main font-bold uppercase tracking-wider rounded-xl hover:bg-surface-hover transition-all cursor-pointer text-xs"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={saving || !hasChanges || previewLoading}
                                className={clsx(
                                    "flex-1 h-11 bg-primary text-white hover:bg-primary-hover font-black uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center cursor-pointer text-xs",
                                    (saving || !hasChanges || previewLoading) && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                {saving ? "Processing..." : "Confirm Changes"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </PageLayout>
    );
}
