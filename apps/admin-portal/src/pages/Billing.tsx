import { useState, useEffect } from 'react';
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
    ExternalLink,
    Crown
} from 'lucide-react';
import { PageLayout, Card, StatusBadge, LoadingState } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';

export function Billing() {
    const { organization, refreshProfile } = useAuth();
    const navigate = useNavigate();
    const [memberCount, setMemberCount] = useState(0);
    const [seatsToPurchase, setSeatsToPurchase] = useState(organization?.seats_purchased || 5);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (organization?.id) {
            fetchMemberCount();
            setSeatsToPurchase(organization.seats_purchased || 5);
        }
    }, [organization?.id, organization?.seats_purchased]);

    async function fetchMemberCount() {
        const { count } = await supabase
            .from('members')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', organization?.id);
        setMemberCount(count || 0);
    }

    const handleUpdateSeats = async () => {
        if (!organization?.id) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('organizations')
                .update({ seats_purchased: seatsToPurchase })
                .eq('id', organization.id);

            if (error) throw error;
            await refreshProfile();
            alert('Seats updated successfully!');
        } catch (err) {
            console.error('Error updating seats:', err);
            alert('Failed to update seats.');
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
            <div className="grid gap-8 lg:grid-cols-12 pb-20">
                {/* Left Column: Current Status */}
                <div className="lg:col-span-8 space-y-8">
                    {/* Active Plan Card */}
                    <Card className="p-10 border border-border rounded-[40px] shadow-shell-sm overflow-hidden relative">
                        {/* Decorative Background */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[60px] rounded-full -mr-20 -mt-20" />
                        
                        <div className="relative z-10">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted">Current Plan</p>
                                    <div className="flex items-center gap-4">
                                        <h2 className="text-4xl font-black text-text-main tracking-tight">
                                            {organization.plan_type || 'Free Account'}
                                        </h2>
                                        <StatusBadge 
                                            variant={organization.subscription_status === 'Active' || organization.subscription_status === 'Trial' ? 'success' : 'warning'}
                                            className="px-4 py-1 h-auto text-[10px] font-black uppercase tracking-widest"
                                        >
                                            {organization.subscription_status}
                                        </StatusBadge>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-3">
                                    <button 
                                        onClick={() => navigate('/dashboard/pricing')}
                                        className="px-6 h-12 bg-primary text-white rounded-xl text-[11px] font-bold shadow-glow-primary hover:brightness-110 active:scale-95 transition-all flex items-center gap-2"
                                    >
                                        <ArrowUpCircle className="w-4 h-4" />
                                        Upgrade Plan
                                    </button>
                                    <button className="p-3 bg-surface border border-border rounded-xl text-text-muted hover:text-primary hover:border-primary/30 transition-all shadow-shell-sm">
                                        <ExternalLink className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-3 gap-8 p-8 bg-main/50 rounded-3xl border border-border/50">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest flex items-center gap-2">
                                        <Users className="w-3.5 h-3.5" /> Seats Used
                                    </p>
                                    <p className="text-2xl font-black text-text-main">
                                        {memberCount} <span className="text-lg text-text-muted font-bold">/ {organization.seats_purchased}</span>
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest flex items-center gap-2">
                                        <Calendar className="w-3.5 h-3.5" /> Renewal Date
                                    </p>
                                    <p className="text-xl font-black text-text-main">
                                        {organization.trial_ends_at 
                                            ? new Date(organization.trial_ends_at).toLocaleDateString()
                                            : 'No active renewal'}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest flex items-center gap-2">
                                        <CreditCard className="w-3.5 h-3.5" /> Billing Cycle
                                    </p>
                                    <p className="text-xl font-black text-text-main">{organization.subscription_period}</p>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Seat Management */}
                    <Card className="p-10 border border-border rounded-[40px] shadow-shell-sm">
                        <div className="mb-8">
                            <h3 className="text-xl font-black text-text-main tracking-tight mb-2">Manage Seats</h3>
                            <p className="text-[13px] font-medium text-text-muted">Purchase additional seats to invite more team members.</p>
                        </div>

                        <div className="flex flex-col md:flex-row items-center gap-10">
                            <div className="flex items-center gap-6 p-2 bg-main rounded-[24px] border border-border w-fit shadow-shell-sm">
                                <button 
                                    onClick={() => setSeatsToPurchase(Math.max(1, seatsToPurchase - 1))}
                                    className="w-12 h-12 flex items-center justify-center rounded-xl bg-surface border border-border text-text-muted hover:text-primary transition-all active:scale-90"
                                >
                                    <Minus className="w-5 h-5" />
                                </button>
                                <span className="text-2xl font-black text-text-main w-12 text-center tabular-nums">
                                    {seatsToPurchase}
                                </span>
                                <button 
                                    onClick={() => setSeatsToPurchase(seatsToPurchase + 1)}
                                    className="w-12 h-12 flex items-center justify-center rounded-xl bg-surface border border-border text-text-muted hover:text-primary transition-all active:scale-90"
                                >
                                    <Plus className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex-1 space-y-1">
                                <p className="text-[11px] font-bold text-text-muted uppercase tracking-[0.2em]">Estimated Total</p>
                                <p className="text-3xl font-black text-text-main tracking-tight">
                                    ${(seatsToPurchase * (organization.plan_type === 'Premium' ? (organization.subscription_period === 'Monthly' ? 6.99 : 4.99) : (organization.subscription_period === 'Monthly' ? 3.99 : 2.99))).toFixed(2)}
                                    <span className="text-sm font-bold text-text-muted"> / mo</span>
                                </p>
                            </div>

                            <button 
                                onClick={handleUpdateSeats}
                                disabled={saving || seatsToPurchase === organization.seats_purchased}
                                className={clsx(
                                    "px-10 h-16 bg-primary text-white rounded-2xl text-[12px] font-black uppercase tracking-widest shadow-glow-primary hover:brightness-110 active:scale-95 transition-all",
                                    (saving || seatsToPurchase === organization.seats_purchased) && "opacity-50 cursor-not-allowed"
                                )}
                            >
                                {saving ? 'Saving...' : 'Update Seats'}
                            </button>
                        </div>
                    </Card>

                    {/* Billing History */}
                    <Card className="p-10 border border-border rounded-[40px] shadow-shell-sm">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-xl font-black text-text-main tracking-tight mb-2">Billing History</h3>
                                <p className="text-[13px] font-medium text-text-muted">View and download your recent invoices.</p>
                            </div>
                            <History className="w-6 h-6 text-text-muted opacity-30" />
                        </div>

                        <div className="overflow-hidden border border-border rounded-3xl">
                            <table className="w-full text-left">
                                <thead className="bg-main/50">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-text-muted">Date</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-text-muted">Description</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-text-muted">Amount</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-text-muted">Status</th>
                                        <th className="px-6 py-4 text-right"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    <tr className="hover:bg-main/30 transition-colors">
                                        <td className="px-6 py-4 text-[13px] font-bold text-text-main">May 7, 2026</td>
                                        <td className="px-6 py-4 text-[13px] font-medium text-text-muted">Premium Plan (Trial Started)</td>
                                        <td className="px-6 py-4 text-[13px] font-bold text-text-main">$0.00</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 text-emerald-500 font-bold text-[10px] uppercase">
                                                <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="text-primary text-[11px] font-black hover:underline uppercase tracking-widest">Download</button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>

                {/* Right Column: Comparison & Info */}
                <div className="lg:col-span-4 space-y-8">
                    {/* Payment Method */}
                    <Card className="p-8 border border-border rounded-[32px] shadow-shell-sm">
                        <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-text-muted mb-6">Payment Method</h4>
                        <div className="p-6 bg-main rounded-[24px] border border-border flex items-center gap-4 mb-6 relative group cursor-pointer overflow-hidden">
                            {/* Decorative Sparkle */}
                            <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 blur-xl group-hover:bg-primary/20 transition-colors" />
                            
                            <div className="w-12 h-10 bg-surface border border-border rounded-lg flex items-center justify-center text-text-main shadow-shell-sm">
                                <CreditCard className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <p className="text-[13px] font-black text-text-main">Visa ending in 4242</p>
                                <p className="text-[11px] font-medium text-text-muted">Expires 12/28</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-text-muted" />
                        </div>
                        <button className="w-full h-12 bg-main border border-border text-[11px] font-bold text-text-main rounded-xl hover:bg-surface-hover transition-all">
                            Update Payment Method
                        </button>
                    </Card>

                    {/* Features Comparison Mini */}
                    <Card className="p-8 border border-border rounded-[32px] shadow-shell-sm bg-gradient-to-b from-surface to-main/30">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-glow-primary border border-primary/20">
                                <Crown className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="text-[15px] font-black text-text-main tracking-tight leading-none mb-1">Premium Perks</h4>
                                <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Active during trial</p>
                            </div>
                        </div>

                        <ul className="space-y-4">
                            {[
                                'Automated Screenshots',
                                'App & URL Monitoring',
                                'Productivity Analytics',
                                'Advanced Data Retention',
                                'Priority Expert Support'
                            ].map(feature => (
                                <li key={feature} className="flex items-center gap-3 text-[12px] font-bold text-text-muted">
                                    <Zap className="w-3.5 h-3.5 text-primary" />
                                    {feature}
                                </li>
                            ))}
                        </ul>
                    </Card>

                    {/* Support Alert */}
                    <div className="p-8 bg-blue-500/5 border border-blue-500/10 rounded-[32px] flex items-start gap-4">
                        <AlertCircle className="w-6 h-6 text-blue-500 shrink-0" />
                        <div className="space-y-2">
                            <p className="text-[13px] font-black text-blue-900 tracking-tight">Need a custom plan?</p>
                            <p className="text-[11px] font-medium text-blue-800/70 leading-relaxed">
                                For teams larger than 50 members, we offer enterprise pricing with custom SLA and dedicated support.
                            </p>
                            <button className="text-[11px] font-black text-blue-500 hover:underline uppercase tracking-widest pt-2">
                                Talk to Sales
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </PageLayout>
    );
}
