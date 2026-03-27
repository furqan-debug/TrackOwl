import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import {
    Building2,
    CreditCard,
    CheckCircle2,
    ArrowRight,
    Rocket,
    Check,
    Lock,
    ShieldCheck,
    Zap,
    ChevronRight,
    Layout,
    Users,
    Activity
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

    const industries = [
        'Marketing Agency',
        'Software Development',
        'Customer Support',
        'E-commerce',
        'Real Estate',
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
            // Simulate a brief delay for a better UX
            await new Promise(resolve => setTimeout(resolve, 1500));

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

            if (profile?.email && orgData) {
                const { error: memberError } = await supabase
                    .from('members')
                    .update({
                        status: 'Active',
                        organization_id: orgData.id
                    })
                    .eq('email', profile.email);

                if (memberError) throw memberError;
                await refreshProfile();
            }

            setStep(3);
        } catch (err) {
            console.error('Onboarding update error:', err);
            alert('Failed to complete setup. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const steps = [
        { id: 1, title: 'Company', icon: Building2, desc: 'Basic info' },
        { id: 2, title: 'Billing', icon: CreditCard, desc: 'Plan setup' },
        { id: 3, title: 'Finish', icon: Rocket, desc: 'Get started' }
    ];

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 md:p-8">
            <Card className="w-full max-w-5xl overflow-hidden border-slate-200 shadow-2xl flex flex-col md:flex-row min-h-[600px] rounded-3xl p-0 bg-white">
                
                {/* Left Sidebar: Progress */}
                <div className="md:w-[320px] bg-slate-900 p-10 flex flex-col text-white">
                    <div className="flex items-center gap-3 mb-16">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                             <Activity className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-xl font-bold tracking-tight">Trackora</span>
                    </div>

                    <div className="space-y-10 flex-1">
                        {steps.map((s) => (
                            <div key={s.id} className="flex items-start gap-5 relative">
                                {s.id < 3 && (
                                    <div className={clsx(
                                        "absolute left-5 top-10 w-[2px] h-10 transition-all duration-500",
                                        step > s.id ? "bg-blue-500" : "bg-slate-800"
                                    )} />
                                )}
                                <div className={clsx(
                                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 shrink-0",
                                    step > s.id ? "bg-blue-500 border-blue-500 text-white" : 
                                    step === s.id ? "bg-slate-900 border-blue-500 text-blue-500" : "bg-slate-900 border-slate-800 text-slate-600"
                                )}>
                                    {step > s.id ? <Check className="w-5 h-5" strokeWidth={3} /> : <s.icon className="w-5 h-5" />}
                                </div>
                                <div className="pt-0.5">
                                    <p className={clsx("font-semibold leading-none mb-1 transition-colors", step >= s.id ? "text-white" : "text-slate-600")}>
                                        {s.title}
                                    </p>
                                    <p className={clsx("text-xs transition-colors", step >= s.id ? "text-slate-400" : "text-slate-700")}>{s.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 pt-8 border-t border-slate-800">
                        <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-800">
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Selected Plan</p>
                            <div className="flex items-center gap-3">
                                <Zap className="w-4 h-4 text-blue-400" />
                                <p className="text-lg font-bold">{selectedPlan}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Area: Content */}
                <div className="flex-1 p-8 md:p-16 lg:p-24 overflow-y-auto bg-white relative">
                    {step === 1 && (
                        <div className="max-w-md mx-auto animate-in fade-in slide-in-from-right-8 duration-500">
                            <h2 className="text-3xl font-bold text-slate-900 mb-2">Setup Your Workspace</h2>
                            <p className="text-slate-500 mb-10">Tell us a bit about your organization to customize your experience.</p>

                            <form onSubmit={handleOrgSubmit} className="space-y-8">
                                <Input
                                    label="Organization Name"
                                    required
                                    value={orgName}
                                    onChange={e => setOrgName(e.target.value)}
                                    placeholder="e.g. Acme Corp"
                                    leftIcon={<Building2 className="w-5 h-5 text-slate-400" />}
                                />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700 ml-1">Industry</label>
                                        <div className="relative group">
                                            <select
                                                required
                                                value={industry}
                                                onChange={e => setIndustry(e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none pr-10 hover:bg-slate-100"
                                            >
                                                <option value="">Select industry</option>
                                                {industries.map(ind => <option key={ind} value={ind}>{ind}</option>)}
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                <Layout className="w-4 h-4" />
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-700 ml-1">Team Size</label>
                                        <div className="relative group">
                                            <select
                                                value={orgSize}
                                                onChange={e => setOrgSize(e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none pr-10 hover:bg-slate-100"
                                            >
                                                <option value="1-10">1-10 employees</option>
                                                <option value="11-50">11-50 employees</option>
                                                <option value="51-200">51-200 employees</option>
                                                <option value="201+">201+ employees</option>
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                <Users className="w-4 h-4" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 rounded-xl font-bold group"
                                    rightIcon={<ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />}
                                >
                                    Continue to Billing
                                </Button>
                            </form>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="max-w-md mx-auto animate-in fade-in slide-in-from-right-8 duration-500">
                            <h2 className="text-3xl font-bold text-slate-900 mb-2">Finalize Your Plan</h2>
                            <p className="text-slate-500 mb-10">Start your free trial today. You won&apos;t be charged until your trial ends.</p>

                            <div className="bg-blue-600 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl mb-10 group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-2xl rounded-full translate-x-8 -translate-y-8" />
                                <div className="relative z-10 space-y-4">
                                    <p className="text-xs font-bold uppercase tracking-widest text-blue-100/60">Selected Subscription</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl font-bold">$0.00</span>
                                        <span className="text-blue-100/60">for 14 days</span>
                                    </div>
                                    <div className="pt-6 border-t border-white/10 flex items-start gap-3">
                                        <div className="bg-white/10 p-2 rounded-lg shrink-0 mt-0.5">
                                            <ShieldCheck className="w-4 h-4 text-blue-100" />
                                        </div>
                                        <p className="text-sm text-blue-50 font-medium leading-relaxed">
                                            Enjoy 14 days of full access to the {selectedPlan} plan. Cancel anytime before the trial ends.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <form onSubmit={handlePaymentSubmit} className="space-y-6">
                                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-5 group hover:bg-white hover:border-blue-500 hover:shadow-md transition-all cursor-pointer">
                                    <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-blue-600 group-hover:border-blue-100 transition-all shadow-sm">
                                        <Lock className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-slate-900 mb-0.5">Payment Verification</p>
                                        <p className="text-xs text-slate-500">Securely connect via Stripe</p>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                                </div>

                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 rounded-xl font-bold"
                                >
                                    {loading ? 'Setting up...' : 'Start My Free Trial'}
                                    {!loading && <Rocket className="w-5 h-5 ml-2" />}
                                </Button>
                                
                                <p className="text-[11px] text-slate-400 text-center leading-relaxed font-medium mt-6">
                                    By clicking above, you agree to our Terms of Service and Privacy Policy. Your trial begins immediately.
                                </p>
                            </form>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="max-w-md mx-auto animate-in zoom-in-95 duration-700 text-center flex flex-col items-center justify-center min-h-[480px]">
                            <div className="relative mb-10">
                                <div className="absolute inset-0 bg-blue-100 blur-2xl rounded-full scale-110" />
                                <div className="w-24 h-24 bg-white border border-blue-100 rounded-[32px] flex items-center justify-center relative z-10 shadow-xl">
                                    <CheckCircle2 className="w-12 h-12 text-blue-600" />
                                </div>
                            </div>
                            
                            <h2 className="text-3xl font-bold text-slate-900 mb-3">You&apos;re All Set!</h2>
                            <p className="text-slate-500 mb-12 leading-relaxed">
                                Welcome, <span className="text-slate-900 font-bold">{profile?.full_name}</span>. Your workspace for <span className="text-blue-600 font-bold">{orgName}</span> is ready for tracking.
                            </p>
                            
                            <Button
                                onClick={() => navigate('/dashboard')}
                                className="w-full py-4 bg-slate-900 hover:bg-slate-800 shadow-lg rounded-xl font-bold group"
                            >
                                Go to Dashboard
                                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" />
                            </Button>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}
