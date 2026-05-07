import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
    Check, 
    Zap, 
    Crown, 
    ChevronRight, 
    Users, 
    Clock, 
    Camera, 
    BarChart3, 
    ShieldCheck,
    Calendar,
    ArrowRight
} from 'lucide-react';
import clsx from 'clsx';
import { PageLayout, Card } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function Pricing() {
    const [isMonthly, setIsMonthly] = useState(true);
    const [loading, setLoading] = useState<string | null>(null);
    const { organization, refreshProfile } = useAuth();
    const navigate = useNavigate();

    const handleSelectPlan = async (planType: string) => {
        if (!organization?.id) return;
        setLoading(planType);
        try {
            const isTrial = planType === 'Premium' && organization.subscription_status === 'None';
            const trialEndsAt = isTrial 
                ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
                : organization.trial_ends_at;

            const { error } = await supabase
                .from('organizations')
                .update({
                    plan_type: planType,
                    subscription_status: isTrial ? 'Trial' : 'Active',
                    subscription_period: isMonthly ? 'Monthly' : 'Yearly',
                    trial_ends_at: trialEndsAt,
                    seats_purchased: organization.seats_purchased || 5 // Default to 5 seats if none
                })
                .eq('id', organization.id);

            if (error) throw error;

            await refreshProfile();
            navigate('/dashboard/settings/billing');
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
            price: isMonthly ? '$3.99' : '$2.99',
            period: '/seat/mo',
            description: 'Essential tracking tools for small teams and growing operations.',
            features: [
                { icon: <Clock className="w-4 h-4" />, text: 'Time tracking / Timesheets' },
                { icon: <Users className="w-4 h-4" />, text: 'Team member management' },
                { icon: <Calendar className="w-4 h-4" />, text: 'Weekly/hour limits' },
                { icon: <BarChart3 className="w-4 h-4" />, text: 'Basic dashboard' }
            ],
            buttonLabel: 'Select Basic',
            popular: false,
            planType: 'Basic'
        },
        {
            name: 'Premium',
            price: isMonthly ? '$6.99' : '$4.99',
            period: '/seat/mo',
            description: 'The complete employee monitoring suite with advanced transparency.',
            features: [
                { icon: <Check className="w-4 h-4" />, text: 'Everything in Basic' },
                { icon: <Camera className="w-4 h-4" />, text: 'Automated Screenshots' },
                { icon: <Zap className="w-4 h-4" />, text: 'App & URL Tracking' },
                { icon: <ShieldCheck className="w-4 h-4" />, text: 'Activity Monitoring' },
                { icon: <BarChart3 className="w-4 h-4" />, text: 'Productivity Analysis' }
            ],
            buttonLabel: organization?.subscription_status === 'None' ? 'Start 7-Day Free Trial' : 'Upgrade to Premium',
            popular: true,
            planType: 'Premium'
        }
    ];

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
                    <div className={clsx(
                        "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-colors duration-300",
                        isMonthly ? "bg-rose-500/10 text-rose-500 border-rose-500/20" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                    )}>
                        Save 25%
                    </div>
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
                {plans.map((plan, i) => (
                    <motion.div
                        key={plan.name}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                    >
                        <Card 
                            className={clsx(
                                "relative flex flex-col h-full rounded-[40px] p-10 md:p-12 transition-all duration-500 border",
                                plan.popular ? "border-primary/30 shadow-shell-lg" : "border-border shadow-shell-sm"
                            )}
                        >
                            {plan.popular && (
                                <div className="absolute top-8 right-8 flex items-center gap-2 text-primary font-black text-[10px] tracking-[0.2em] uppercase">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                    Recommended
                                </div>
                            )}

                            <div className="mb-10">
                                <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-text-muted mb-4">
                                    {plan.name}
                                </h4>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-5xl font-black tracking-tighter text-text-main">{plan.price}</span>
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
                                onClick={() => handleSelectPlan(plan.planType)}
                                disabled={!!loading}
                                className={clsx(
                                    "w-full h-14 rounded-2xl text-[12px] font-black tracking-[0.2em] uppercase transition-all duration-300 flex items-center justify-center gap-2 group",
                                    loading === plan.planType && "opacity-50 cursor-wait",
                                    plan.popular
                                        ? "bg-primary text-white shadow-glow-primary hover:brightness-110"
                                        : "bg-surface border border-border text-text-main hover:bg-surface-hover"
                                )}
                            >
                                {loading === plan.planType ? 'Processing...' : plan.buttonLabel}
                                <ArrowRight className={clsx("w-4 h-4 group-hover:translate-x-1 transition-transform", loading === plan.planType && "hidden")} />
                            </button>
                        </Card>
                    </motion.div>
                ))}
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
