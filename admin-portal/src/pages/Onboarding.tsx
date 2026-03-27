import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import {
    CreditCard,
    CheckCircle2,
    ArrowRight,
    Rocket,
    Check,
    ShieldCheck,
    Users,
    Activity,
    ChevronRight,
    Briefcase
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import clsx from 'clsx';

export function Onboarding() {
    const navigate = useNavigate();
    const location = useLocation();
    const { profile, refreshProfile } = useAuth();
    const selectedPlan = location.state?.plan || 'Starter';

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [orgName, setOrgName] = useState('');
    const [orgSize, setOrgSize] = useState('1-10');
    const [industry, setIndustry] = useState('');

    // Failsafe: If user is already active, skip to the last step immediately
    useEffect(() => {
        if (profile?.status === 'Active' && profile?.organization_id) {
            setStep(3);
        }
    }, [profile]);

    const industries = [
        'Marketing Agency',
        'Software Development',
        'Customer Support',
        'E-commerce',
        'Real Estate',
        'Fintech',
        'Other'
    ];

    const handleOrgSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setStep(2);
    };

    const handlePaymentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 1. Create Organization
            const { data: orgData, error: orgError } = await supabase
                .from('organizations')
                .insert({
                    name: orgName,
                    industry: industry,
                    size: orgSize
                })
                .select()
                .single();

            if (orgError) throw orgError;

            // 2. Update Member Record
            if (profile?.email && orgData) {
                const { error: memberError } = await supabase
                    .from('members')
                    .update({
                        status: 'Active',
                        organization_id: orgData.id
                    })
                    .eq('email', profile.email);

                if (memberError) throw memberError;
                
                // 3. Force Sync Profile
                const updatedProfile = await refreshProfile();
                
                // If the profile fetch didn't reflect the change yet (unlikely but possible), 
                // we'll still show step 3, and the useEffect will catch it later if it re-renders.
                console.log('Profile synced:', updatedProfile?.status);
            }

            setStep(3);
        } catch (err: any) {
            console.error('Onboarding error:', err);
            alert(err.message || 'Setup failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const steps = [
        { id: 1, label: 'Company' },
        { id: 2, label: 'Billing' },
        { id: 3, label: 'Finalize' }
    ];

    return (
        <div className="min-h-screen bg-[#F9FAFB] flex flex-col items-center">
            
            <div className="w-full max-w-[1200px] px-8 pt-8 flex items-center justify-between">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                         <Activity className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-lg font-bold text-slate-900 tracking-tight">Trackora</span>
                </div>
                <div className="text-xs font-semibold text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-200">
                    Step {step} of 3
                </div>
            </div>

            <div className="flex-1 w-full max-w-[1210px] grid lg:grid-cols-2 gap-12 items-center px-8 pb-12">
                
                <div className="hidden lg:flex flex-col space-y-8 pr-12">
                    <div className="space-y-4">
                        <h1 className="text-5xl font-extrabold text-slate-900 leading-[1.1] tracking-tight">
                            Build your workspace <br/>in minutes.
                        </h1>
                        <p className="text-lg text-slate-500 leading-relaxed max-w-[440px]">
                            Join 2,000+ teams using Trackora to streamline their operations and boost performance.
                        </p>
                    </div>

                    <div className="space-y-6">
                        {[
                            { icon: Check, text: "Unlimited projects & clients", color: "blue" },
                            { icon: Check, text: "Real-time activity monitoring", color: "blue" },
                            { icon: Check, text: "Instant report generation", color: "blue" }
                        ].map((feat, i) => (
                            <div key={i} className="flex items-center gap-4 group">
                                <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                                    <feat.icon className="w-3.5 h-3.5" strokeWidth={3} />
                                </div>
                                <span className="text-sm font-semibold text-slate-700">{feat.text}</span>
                            </div>
                        ))}
                    </div>

                    <div className="pt-8 mt-8 border-t border-slate-200">
                        <div className="flex items-center gap-4 p-4 rounded-3xl bg-white border border-slate-200 max-w-[340px] shadow-sm">
                            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
                                <Rocket className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest leading-none mb-1">Trial Plan</p>
                                <p className="text-sm font-bold text-slate-900">{selectedPlan} Plan (14 Days)</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="w-full max-w-[520px] mx-auto">
                    <Card className="p-8 md:p-12 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)] bg-white border-slate-200 rounded-[40px] relative overflow-hidden">
                        
                        <div className="flex items-center gap-4 mb-10 overflow-x-auto pb-1 no-scrollbar">
                            {steps.map((s) => (
                                <div key={s.id} className="flex items-center gap-2 group transition-all shrink-0">
                                    <div className={clsx(
                                        "w-2 h-2 rounded-full transition-all duration-300",
                                        step === s.id ? "bg-blue-600 w-6" : step > s.id ? "bg-slate-900" : "bg-slate-200"
                                    )} />
                                    <span className={clsx(
                                        "text-[10px] font-extrabold uppercase tracking-widest",
                                        step === s.id ? "text-blue-600" : step > s.id ? "text-slate-900" : "text-slate-300"
                                    )}>
                                        {s.label}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {step === 1 && (
                            <form onSubmit={handleOrgSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="space-y-2">
                                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">Your Organization</h2>
                                    <p className="text-slate-500 text-sm">Tell us about your company to tailor your dashboard.</p>
                                </div>

                                <div className="space-y-6">
                                    <Input
                                        label="Name"
                                        required
                                        value={orgName}
                                        onChange={e => setOrgName(e.target.value)}
                                        placeholder="e.g. Acme Corp"
                                        className="h-14 rounded-2xl text-base px-5 bg-slate-50/50"
                                    />

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Industry</label>
                                            <div className="relative">
                                                <select
                                                    required
                                                    value={industry}
                                                    onChange={e => setIndustry(e.target.value)}
                                                    className="w-full bg-slate-50/50 border border-slate-200 h-14 rounded-2xl px-5 text-slate-900 text-sm appearance-none focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 transition-all outline-none"
                                                >
                                                    <option value="">Choose...</option>
                                                    {industries.map(i => <option key={i} value={i}>{i}</option>)}
                                                </select>
                                                <Briefcase className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Team Size</label>
                                            <div className="relative">
                                                <select
                                                    value={orgSize}
                                                    onChange={e => setOrgSize(e.target.value)}
                                                    className="w-full bg-slate-50/50 border border-slate-200 h-14 rounded-2xl px-5 text-slate-900 text-sm appearance-none focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 transition-all outline-none"
                                                >
                                                    <option value="1-10">1-10</option>
                                                    <option value="11-50">11-50</option>
                                                    <option value="51-200">51-200</option>
                                                    <option value="201+">201+</option>
                                                </select>
                                                <Users className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full py-6 bg-blue-600 hover:bg-black shadow-xl shadow-blue-600/10 rounded-2xl font-bold group text-white border-0 transition-all duration-300"
                                >
                                    Proceed to Plan
                                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" />
                                </Button>
                            </form>
                        )}

                        {step === 2 && (
                            <form onSubmit={handlePaymentSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="space-y-2">
                                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">Access Granted</h2>
                                    <p className="text-slate-500 text-sm">Review your 14-day free trial on the {selectedPlan} plan.</p>
                                </div>

                                <div className="rounded-3xl bg-slate-900 p-8 text-white relative overflow-hidden group shadow-2xl">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 blur-3xl rounded-full" />
                                    <div className="relative z-10 space-y-6">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Plan</p>
                                                <p className="text-2xl font-black">{selectedPlan} Trial</p>
                                            </div>
                                            <div className="px-3 py-1 bg-blue-600 rounded-full text-[10px] font-bold uppercase tracking-widest">Active</div>
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-4xl font-extrabold">$0.00</span>
                                            <span className="text-slate-400 text-sm">/ first 14 days</span>
                                        </div>
                                        <div className="flex items-center gap-3 pt-6 border-t border-white/5 text-xs text-slate-400">
                                            <ShieldCheck className="w-4 h-4 text-blue-500" />
                                            No commitment. Cancel anytime.
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 flex items-center gap-4 group hover:border-blue-600 transition-all cursor-pointer">
                                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-300 group-hover:text-blue-600 transition-colors">
                                        <CreditCard className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs font-bold text-slate-900 mb-0.5">Stripe Secure Connection</p>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-widest">Connect to finalize setup</p>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                                </div>

                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-6 bg-slate-900 hover:bg-blue-600 shadow-xl rounded-2xl font-bold group text-white border-0 transition-all duration-300"
                                >
                                    {loading ? 'Initializing Workspace...' : 'Activate Free Trial'}
                                    {!loading && <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" />}
                                </Button>
                            </form>
                        )}

                        {step === 3 && (
                            <div className="animate-in zoom-in-95 duration-700 text-center py-10">
                                <div className="relative mb-10 w-fit mx-auto">
                                    <div className="absolute inset-0 bg-blue-100 blur-3xl rounded-full scale-110" />
                                    <div className="w-24 h-24 bg-blue-600 rounded-[32px] flex items-center justify-center relative z-10 shadow-2xl rotate-12 transition-transform hover:rotate-0 duration-500">
                                        <CheckCircle2 className="w-12 h-12 text-white" />
                                    </div>
                                </div>
                                
                                <h1 className="text-4xl font-extrabold text-slate-900 mb-3 tracking-tight">Organization Created</h1>
                                <p className="text-slate-500 mb-12 text-lg font-medium">
                                    Welcome home. <br/>
                                    <strong>{orgName || 'Your Workspace'}</strong> is ready for action.
                                </p>
                                
                                <Button
                                    onClick={() => navigate('/dashboard')}
                                    className="w-full py-6 bg-blue-600 hover:bg-black shadow-2xl shadow-blue-600/10 rounded-2xl font-bold group text-white border-0 transition-all duration-300 mb-6"
                                >
                                    Launch Dashboard
                                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" />
                                </Button>
                                
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Operational Sync Complete</p>
                            </div>
                        )}

                    </Card>
                </div>
            </div>
        </div>
    );
}
