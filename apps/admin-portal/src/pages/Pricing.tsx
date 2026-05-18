import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
    Check, 
    Zap, 
    Users, 
    Clock, 
    Camera, 
    BarChart3, 
    ShieldCheck,
    Calendar,
    ArrowRight,
    Minus,
    Plus,
    Crown,
    AlertTriangle
} from 'lucide-react';
import clsx from 'clsx';
import { PageLayout, Card } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const PREMIUM_FEATURES_LOST = [
    'Automated Screenshots',
    'App & URL Tracking',
    'Activity Monitoring',
    'Productivity Analysis',
    'Advanced Reports',
];

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function Pricing() {
    const [isMonthly, setIsMonthly] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<any>(null);
    const [seats, setSeats] = useState(5);
    const [loading, setLoading] = useState<string | null>(null);
    const [showDowngradeWarning, setShowDowngradeWarning] = useState(false);
    const { organization, refreshProfile, refreshOrganization, isPremium, session } = useAuth();
    const navigate = useNavigate();

    const currentPlanType = organization?.plan_type || 'Basic';
    const isDowngrade = selectedPlan?.planType === 'Basic' && isPremium;

    // Called after the user confirms their seat count
    const handleSelectPlan = async () => {
        if (!organization?.id || !selectedPlan) return;

        // If downgrading to Basic from Premium, show warning first
        if (isDowngrade && !showDowngradeWarning) {
            setShowDowngradeWarning(true);
            return;
        }

        setLoading(selectedPlan.planType);
        setShowDowngradeWarning(false);

        // STRIPE UPGRADE REDIRECT FOR PREMIUM PLAN
        if (selectedPlan.planType === 'Premium') {
            try {
                const res = await fetch(`${API}/api/billing/create-checkout-session`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session?.access_token}`
                    },
                    body: JSON.stringify({
                        planType: 'Premium',
                        billingCycle: isMonthly ? 'Monthly' : 'Yearly',
                        seatsCount: seats
                    })
                });

                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || 'Failed to create checkout session');
                }

                const data = await res.json();
                if (data.url) {
                    window.location.href = data.url;
                    return;
                }
            } catch (err: any) {
                console.error('Error starting Stripe checkout:', err);
                alert(err.message || 'Failed to start checkout. Stripe price keys may not be configured.');
                setLoading(null);
                return;
            }
        }

        try {
            const isTrial = selectedPlan.planType === 'Premium' && organization.subscription_status === 'None';
            const trialEndsAt = isTrial 
                ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
                : organization.trial_ends_at;

            const isBasicSelect = selectedPlan.planType === 'Basic';

            const { error } = await supabase
                .from('organizations')
                .update({
                    plan_type: selectedPlan.planType,
                    subscription_status: isBasicSelect ? 'Active' : (isTrial ? 'Trial' : 'Active'),
                    subscription_period: isMonthly ? 'Monthly' : 'Yearly',
                    trial_ends_at: trialEndsAt,
                    seats_purchased: seats
                })
                .eq('id', organization.id);

            if (error) throw error;

            // Use refreshOrganization for instant plan-flag update, fall back to full profile refresh
            await refreshOrganization();
            await refreshProfile();

            // Navigate: downgrade → dashboard (premium routes now locked); upgrade → billing
            if (isBasicSelect) {
                navigate('/dashboard');
            } else {
                navigate('/dashboard/settings/billing');
            }
        } catch (err) {
            console.error('Error updating plan:', err);
            alert('Failed to update plan. Please try again.');
        } finally {
            setLoading(null);
        }
    };

    const plans = [
        {
            name: 'Basic',
            price: isMonthly ? 3.99 : 2.99,
            displayPrice: isMonthly ? '$3.99' : '$2.99',
            period: '/seat/mo',
            description: 'Essential tracking tools for small teams and growing operations.',
            features: [
                { icon: <Clock className="w-4 h-4" />, text: 'Time tracking / Timesheets' },
                { icon: <Users className="w-4 h-4" />, text: 'Team member management' },
                { icon: <Calendar className="w-4 h-4" />, text: 'Weekly/hour limits' },
                { icon: <BarChart3 className="w-4 h-4" />, text: 'Basic dashboard' }
            ],
            buttonLabel: currentPlanType === 'Basic' ? 'Current Plan' : 'Switch to Basic',
            popular: false,
            planType: 'Basic'
        },
        {
            name: 'Premium',
            price: isMonthly ? 6.99 : 4.99,
            displayPrice: isMonthly ? '$6.99' : '$4.99',
            period: '/seat/mo',
            description: 'The complete employee monitoring suite with advanced transparency.',
            features: [
                { icon: <Check className="w-4 h-4" />, text: 'Everything in Basic' },
                { icon: <Camera className="w-4 h-4" />, text: 'Automated Screenshots' },
                { icon: <Zap className="w-4 h-4" />, text: 'App & URL Tracking' },
                { icon: <ShieldCheck className="w-4 h-4" />, text: 'Activity Monitoring' },
                { icon: <BarChart3 className="w-4 h-4" />, text: 'Productivity Analysis' }
            ],
            buttonLabel: isPremium
                ? (organization?.subscription_status === 'Trial' ? 'Current Plan (Trial)' : 'Current Plan')
                : (organization?.subscription_status === 'None' ? 'Start 7-Day Free Trial' : 'Upgrade to Premium'),
            popular: true,
            planType: 'Premium'
        }
    ];

    // ────────────────────────────────────────────────────────────────
    // Downgrade Warning Modal
    // ────────────────────────────────────────────────────────────────
    if (showDowngradeWarning) {
        return (
            <PageLayout title="Downgrade to Basic" description="Please review what you'll lose." maxWidth="7xl">
                <div className="max-w-lg mx-auto py-12">
                    <Card className="p-10 border border-warning/30 rounded-[40px] shadow-shell-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-warning/5 blur-[60px] rounded-full -mr-20 -mt-20" />
                        <div className="relative z-10 space-y-8">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-warning/10 flex items-center justify-center text-warning border border-warning/20">
                                    <AlertTriangle className="w-7 h-7" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-text-main tracking-tight">Downgrade to Basic?</h3>
                                    <p className="text-[13px] font-medium text-text-muted mt-1">The following premium features will be <span className="text-warning font-bold">immediately disabled</span>:</p>
                                </div>
                            </div>

                            <ul className="space-y-3">
                                {PREMIUM_FEATURES_LOST.map(feature => (
                                    <li key={feature} className="flex items-center gap-3 text-[13px] font-bold text-text-muted">
                                        <div className="w-5 h-5 rounded-md bg-warning/10 flex items-center justify-center text-warning border border-warning/20 shrink-0">
                                            <AlertTriangle className="w-3 h-3" />
                                        </div>
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            <p className="text-[12px] font-medium text-text-muted leading-relaxed p-4 bg-main/50 rounded-2xl border border-border">
                                Any active tracking sessions will continue until they naturally end. Screenshot and app data collection will stop on the <strong>next</strong> tracking session start.
                            </p>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => { setShowDowngradeWarning(false); setSelectedPlan(null); }}
                                    className="flex-1 h-14 bg-main border border-border text-text-main rounded-2xl text-[12px] font-black uppercase tracking-widest hover:bg-surface-hover transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSelectPlan}
                                    disabled={!!loading}
                                    className="flex-1 h-14 bg-warning text-white rounded-2xl text-[12px] font-black uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50"
                                >
                                    {loading ? 'Downgrading...' : 'Confirm Downgrade'}
                                </button>
                            </div>
                        </div>
                    </Card>
                </div>
            </PageLayout>
        );
    }

    // ────────────────────────────────────────────────────────────────
    // Seat Configuration Step
    // ────────────────────────────────────────────────────────────────
    if (selectedPlan) {
        const annualMultiplier = isMonthly ? 1 : 12;
        const paidSeats = Math.max(0, seats - 1);
        const totalPrice = (paidSeats * selectedPlan.price * annualMultiplier).toFixed(2);
        
        return (
            <PageLayout
                title={`Configure ${selectedPlan.name}`}
                description="Choose how many seats you need for your team."
                maxWidth="6xl"
            >
                <div className="max-w-xl mx-auto py-12">
                    <Card className="p-10 border border-border rounded-[40px] shadow-shell-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[60px] rounded-full -mr-20 -mt-20" />
                        
                        <button 
                            onClick={() => setSelectedPlan(null)}
                            className="text-[11px] font-bold text-text-muted hover:text-primary mb-8 transition-colors flex items-center gap-2"
                        >
                            ← Back to plans
                        </button>

                        <div className="space-y-10 relative z-10">
                            <div>
                                <h3 className="text-2xl font-black text-text-main tracking-tight mb-2">How many seats?</h3>
                                <p className="text-sm font-medium text-text-muted">Include yourself and your team members.</p>
                            </div>

                            <div className="flex items-center gap-8 p-4 bg-main rounded-[32px] border border-border w-full shadow-shell-sm">
                                <button 
                                    onClick={() => setSeats(Math.max(1, seats - 1))}
                                    className="w-16 h-16 flex items-center justify-center rounded-2xl bg-surface border border-border text-text-muted hover:text-primary transition-all active:scale-90"
                                >
                                    <Minus className="w-6 h-6" />
                                </button>
                                <div className="flex-1 text-center">
                                    <span className="text-5xl font-black text-text-main tabular-nums">
                                        {seats}
                                    </span>
                                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-text-muted mt-1">Total Seats</p>
                                </div>
                                <button 
                                    onClick={() => setSeats(seats + 1)}
                                    className="w-16 h-16 flex items-center justify-center rounded-2xl bg-surface border border-border text-text-muted hover:text-primary transition-all active:scale-90"
                                >
                                    <Plus className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="p-8 bg-primary/5 border border-primary/10 rounded-[32px]">
                                <div className="flex justify-between items-end">
                                    <div className="space-y-1">
                                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">Total Amount</p>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-4xl font-black text-text-main tracking-tighter">${totalPrice}</span>
                                            <span className="text-sm font-bold text-text-muted">{isMonthly ? '/mo' : '/year'}</span>
                                        </div>
                                        <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mt-1">1 Free Owner Seat Included</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest">{selectedPlan.name} Plan</p>
                                        <p className="text-[11px] font-bold text-primary uppercase tracking-widest">{isMonthly ? 'Monthly' : 'Yearly (25% Off)'}</p>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleSelectPlan}
                                disabled={!!loading}
                                className="w-full h-16 bg-primary text-white rounded-2xl text-[12px] font-black tracking-[0.2em] uppercase shadow-glow-primary hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Processing...' : (
                                    <>Confirm & Continue <ArrowRight className="w-4 h-4" /></>
                                )}
                            </button>
                        </div>
                    </Card>
                </div>
            </PageLayout>
        );
    }

    // ────────────────────────────────────────────────────────────────
    // Plan Selection Grid
    // ────────────────────────────────────────────────────────────────
    return (
        <PageLayout
            title="Pricing & Plans"
            description="Choose the right plan for your organization. Upgrade or downgrade at any time."
            maxWidth="6xl"
        >
            {/* Pricing Toggle */}
            <div className="flex justify-center items-center gap-6 mb-16">
                <div className="flex items-center gap-3">
                    <span className={clsx("text-sm font-bold tracking-tight transition-colors", !isMonthly ? "text-text-main" : "text-text-muted")}>Yearly</span>
                    {!isMonthly && (
                        <div className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                            Save 25%
                        </div>
                    )}
                </div>

                <button
                    onClick={() => setIsMonthly(!isMonthly)}
                    className="group relative w-16 h-8 rounded-full bg-surface border border-border p-1.5 transition-all hover:border-primary/30"
                >
                    <motion.div
                        animate={{ x: isMonthly ? 32 : 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        className="w-5 h-5 rounded-full bg-primary shadow-glow-primary"
                    />
                </button>

                <span className={clsx("text-sm font-bold tracking-tight transition-colors", isMonthly ? "text-text-main" : "text-text-muted")}>Monthly</span>
            </div>

            <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto pb-20">
                {plans.map((plan, i) => {
                    const isCurrentPlan = organization?.plan_type === plan.planType && (
                        plan.planType === 'Basic' ? !isPremium : isPremium
                    );

                    return (
                        <motion.div
                            key={plan.name}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                        >
                            <Card 
                                className={clsx(
                                    "relative flex flex-col h-full rounded-[40px] p-10 md:p-12 transition-all duration-500 border",
                                    plan.popular ? "border-primary/30 shadow-shell-lg" : "border-border shadow-shell-sm",
                                    isCurrentPlan && "ring-2 ring-primary/30"
                                )}
                            >

                                <div className="mb-10">
                                    {/* Plan name row with inline badge */}
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-text-muted">
                                            {plan.name}
                                        </h4>
                                        {isCurrentPlan && (
                                            <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full">
                                                <Crown className="w-3 h-3 text-primary" />
                                                <span className="text-[9px] font-black text-primary uppercase tracking-widest">Current Plan</span>
                                            </div>
                                        )}
                                        {plan.popular && !isCurrentPlan && (
                                            <div className="flex items-center gap-1.5 text-primary font-black text-[10px] tracking-[0.2em] uppercase">
                                                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                                Recommended
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-5xl font-black tracking-tighter text-text-main">{plan.displayPrice}</span>
                                        <span className="text-sm font-bold text-text-muted tracking-tight">{plan.period}</span>
                                    </div>
                                </div>

                                <p className="text-[13px] font-medium text-text-muted leading-relaxed mb-10 min-h-[40px]">
                                    {plan.description}
                                </p>

                                <div className="w-full h-px bg-gradient-to-r from-transparent via-border to-transparent mb-10" />

                                <ul className="space-y-5 mb-12 flex-1">
                                    {plan.features.map((f, idx) => (
                                        <li key={idx} className="flex items-center gap-4 text-[13px] font-bold text-text-main">
                                            <div className="w-8 h-8 rounded-xl bg-primary/5 flex items-center justify-center text-primary border border-primary/10">
                                                {f.icon}
                                            </div>
                                            {f.text}
                                        </li>
                                    ))}
                                </ul>

                                <button
                                    onClick={() => !isCurrentPlan && setSelectedPlan(plan)}
                                    disabled={isCurrentPlan}
                                    className={clsx(
                                        "w-full h-14 rounded-2xl text-[12px] font-black tracking-[0.2em] uppercase transition-all duration-300 flex items-center justify-center gap-2 group",
                                        isCurrentPlan
                                            ? "bg-primary/5 border border-primary/20 text-primary cursor-default"
                                            : plan.popular
                                                ? "bg-primary text-white shadow-glow-primary hover:brightness-110"
                                                : "bg-surface border border-border text-text-main hover:bg-surface-hover"
                                    )}
                                >
                                    {plan.buttonLabel}
                                    {!isCurrentPlan && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                                </button>
                            </Card>
                        </motion.div>
                    );
                })}
            </div>

            {/* Trial Note */}
            <div className="mt-8 text-center">
                <p className="text-[11px] font-bold text-text-muted uppercase tracking-[0.2em]">
                    * 7-day free trial applies to Premium plans only. Cancel anytime.
                </p>
            </div>
        </PageLayout>
    );
}
