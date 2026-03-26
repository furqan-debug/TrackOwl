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
    Diamond,
    Target,
    Layers,
    ChevronRight
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
            await new Promise(resolve => setTimeout(resolve, 2000));

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
            alert('Failed to complete onboarding. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const steps = [
        { id: 1, title: 'Identity', icon: Building2, desc: 'Org Registry' },
        { id: 2, title: 'Activation', icon: CreditCard, desc: 'Plan Linkage' },
        { id: 3, title: 'Deployment', icon: Rocket, desc: 'Operational' }
    ];

    return (
        <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center p-4 md:p-8">
            <div className="absolute inset-0 bg-surface-subtle/20 z-0" />
            
            <Card className="relative z-10 w-full max-w-5xl overflow-hidden border-border shadow-2xl flex flex-col md:flex-row min-h-[680px] rounded-[56px] p-0 bg-surface-solid">
                
                {/* Left Sidebar: Progress */}
                <div className="md:w-[360px] bg-surface-subtle border-r border-border p-12 flex flex-col relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-primary shadow-[0_0_20px_rgba(var(--color-primary-rgb),0.3)]" />
                    <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-primary/[0.03] rounded-full blur-3xl" />
                    
                    <div className="flex items-center gap-4 mb-20 relative z-10">
                        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                             <Diamond className="w-5 h-5 text-white" strokeWidth={2.5} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-black tracking-tight text-text-primary font-mono italic uppercase">Trackora</span>
                            <span className="text-[8px] font-bold text-text-muted tracking-[0.3em] font-mono uppercase opacity-60">Provisioning</span>
                        </div>
                    </div>

                    <div className="space-y-12 flex-1 relative z-10 font-mono">
                        {steps.map((s) => (
                            <div key={s.id} className="flex items-start gap-6 group relative">
                                {s.id < 3 && (
                                    <div className={clsx(
                                        "absolute left-[23px] top-12 w-[2px] h-12 transition-all duration-700",
                                        step > s.id ? "bg-primary" : "bg-border"
                                    )} />
                                )}
                                <div className={clsx(
                                    "w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all duration-700 shrink-0 shadow-sm",
                                    step > s.id ? "bg-primary border-primary text-white shadow-primary/20 scale-110" : 
                                    step === s.id ? "bg-surface-solid border-primary text-primary" : "bg-surface-solid border-border text-text-muted/40"
                                )}>
                                    {step > s.id ? <Check className="w-6 h-6" strokeWidth={3} /> : <s.icon className={clsx("w-5 h-5", step === s.id && "animate-pulse")} strokeWidth={2.5} />}
                                </div>
                                <div className="pt-1">
                                    <span className={clsx("block text-[9px] font-bold uppercase tracking-[0.2em] mb-1.5 transition-colors duration-700", step >= s.id ? "text-primary" : "text-text-muted/40")}>
                                        Protocol 0{s.id}
                                    </span>
                                    <p className={clsx("text-base font-black transition-colors duration-700 uppercase italic tracking-tighter", step === s.id ? "text-text-primary" : "text-text-muted/60")}>
                                        {s.title}
                                    </p>
                                    <p className="text-[10px] font-bold text-text-muted/40 uppercase tracking-widest">{s.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-auto pt-12 relative z-10">
                        <div className="p-6 rounded-3xl bg-surface-solid border border-border overflow-hidden relative group shadow-sm">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/[0.03] blur-xl rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-1000" />
                            <p className="text-[9px] text-text-muted uppercase font-bold tracking-[0.2em] mb-3 opacity-40 font-mono">Assigned Protocol Plan</p>
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-primary/10">
                                    <Zap className="w-4 h-4 text-primary" strokeWidth={3} />
                                </div>
                                <p className="text-lg font-black text-text-primary font-mono italic uppercase tracking-tighter">{selectedPlan}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Area: Content */}
                <div className="flex-1 bg-surface-solid p-12 md:p-24 overflow-y-auto relative">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/[0.01] rounded-full blur-3xl -mr-32 -mt-32" />
                    
                    {step === 1 && (
                        <div className="max-w-md mx-auto animate-in fade-in slide-in-from-right-12 duration-1000">
                             <div className="inline-flex items-center gap-3 px-4 py-2 rounded-2xl bg-surface-subtle border border-border mb-12 shadow-sm font-mono">
                                <Building2 className="w-5 h-5 text-primary" strokeWidth={2.5} />
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-primary italic">Initialization Matrix</span>
                            </div>
                            
                            <h2 className="text-4xl font-black text-text-primary mb-4 italic tracking-tight font-mono uppercase">Setup <span className="text-primary">Workspace</span></h2>
                            <p className="text-text-muted text-sm mb-12 font-bold uppercase font-mono tracking-widest opacity-60 leading-relaxed">Configure organizational baseline for system integration.</p>

                            <form onSubmit={handleOrgSubmit} className="space-y-10">
                                <Input
                                    label="Organizational Designation (Entity Name)"
                                    required
                                    value={orgName}
                                    onChange={e => setOrgName(e.target.value)}
                                    placeholder="ACME DYNAMICS CORP"
                                    leftIcon={<Building2 className="w-5 h-5 text-primary" strokeWidth={2.5} />}
                                    className="font-mono text-[13px] font-bold uppercase"
                                />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] pl-1 font-mono opacity-80">Industry Segment</label>
                                        <div className="relative group">
                                            <select
                                                required
                                                value={industry}
                                                onChange={e => setIndustry(e.target.value)}
                                                className="w-full bg-surface-subtle border border-border rounded-2xl px-6 py-4 text-[13px] font-bold text-text-primary focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-mono appearance-none hover:bg-surface-solid uppercase italic"
                                            >
                                                <option value="" className="bg-surface-solid">SELECT SECTOR</option>
                                                {industries.map(ind => <option key={ind} value={ind} className="bg-surface-solid">{ind.toUpperCase()}</option>)}
                                            </select>
                                            <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-primary group-hover:scale-125 transition-transform">
                                                <Layers className="w-4 h-4" strokeWidth={3} />
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] pl-1 font-mono opacity-80">Personnel Volume</label>
                                        <div className="relative group">
                                            <select
                                                value={orgSize}
                                                onChange={e => setOrgSize(e.target.value)}
                                                className="w-full bg-surface-subtle border border-border rounded-2xl px-6 py-4 text-[13px] font-bold text-text-primary focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-mono appearance-none hover:bg-surface-solid uppercase italic"
                                            >
                                                <option value="1-10" className="bg-surface-solid">1-10 OPERATORS</option>
                                                <option value="11-50" className="bg-surface-solid">11-50 OPERATORS</option>
                                                <option value="51-200" className="bg-surface-solid">51-200 OPERATORS</option>
                                                <option value="201+" className="bg-surface-solid">201+ OPERATORS</option>
                                            </select>
                                            <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-primary group-hover:scale-125 transition-transform">
                                                <Target className="w-4 h-4" strokeWidth={3} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full py-5 text-[11px] font-mono font-bold uppercase tracking-[0.3em] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all italic mt-4"
                                    rightIcon={<ArrowRight className="w-5 h-5 ml-4 group-hover:translate-x-2 transition-transform" strokeWidth={3} />}
                                >
                                    Review & Commit Configuration
                                </Button>
                            </form>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="max-w-md mx-auto animate-in fade-in slide-in-from-right-12 duration-1000">
                             <div className="inline-flex items-center gap-3 px-4 py-2 rounded-2xl bg-surface-subtle border border-border mb-12 shadow-sm font-mono">
                                <CreditCard className="w-5 h-5 text-primary" strokeWidth={2.5} />
                                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-primary italic">Activation Linkage</span>
                            </div>

                            <h2 className="text-4xl font-black text-text-primary mb-4 italic tracking-tight font-mono uppercase">Plan <span className="text-primary">Activation</span></h2>
                            <p className="text-text-muted text-sm mb-12 font-bold uppercase font-mono tracking-widest opacity-60 leading-relaxed">Secure linkage of organizational billing properties.</p>

                            <div className="bg-primary rounded-[40px] p-10 text-white relative overflow-hidden shadow-2xl shadow-primary/30 mb-12 group">
                                <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 blur-3xl rounded-full translate-x-12 -translate-y-12 group-hover:scale-150 transition-transform duration-1000" />
                                <div className="relative z-10 flex justify-between items-start mb-10">
                                    <div className="space-y-2">
                                         <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/60 font-mono">Activation Matrix Total</p>
                                         <p className="text-5xl font-black font-mono italic tracking-tighter">$0.00</p>
                                    </div>
                                    <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10 shadow-inner group-hover:rotate-12 transition-transform duration-500">
                                        <Zap className="w-8 h-8 text-white/50" strokeWidth={2.5} />
                                    </div>
                                </div>
                                <div className="pt-8 border-t border-white/20 flex items-start gap-4">
                                    <div className="bg-white/10 p-2 rounded-lg shrink-0">
                                        <ShieldCheck className="w-5 h-5 text-white/80" strokeWidth={3} />
                                    </div>
                                    <p className="text-[11px] font-bold font-mono uppercase tracking-wider leading-relaxed text-white/90 italic">
                                        Trial Protocol: 14-day zero-cost entry on <span className="text-white underline decoration-white/40 decoration-2 underline-offset-4">{selectedPlan.toUpperCase()} PHASE</span>. No immediate commitment.
                                    </p>
                                </div>
                            </div>

                            <form onSubmit={handlePaymentSubmit} className="space-y-8">
                                <div className="p-6 rounded-3xl bg-surface-subtle border border-border flex items-center gap-6 group hover:bg-surface-solid transition-all cursor-pointer border-dashed hover:shadow-inner">
                                    <div className="w-14 h-14 rounded-2xl bg-surface-solid border border-border flex items-center justify-center text-text-muted group-hover:text-primary transition-all shadow-sm group-hover:scale-110 group-hover:rotate-3">
                                        <Lock className="w-6 h-6" strokeWidth={2.5} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-black text-text-primary mb-1 font-mono uppercase italic tracking-tighter">Secure Handshake Portal</p>
                                        <p className="text-[10px] text-text-muted font-bold uppercase font-mono tracking-widest opacity-60">Initialize Stripe Secure Environment</p>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-text-muted opacity-40 group-hover:translate-x-2 transition-all" />
                                </div>

                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-5 text-[12px] font-mono font-bold uppercase tracking-[0.3em] shadow-2xl shadow-primary/30 italic mt-4"
                                >
                                    {loading ? 'SYNCHRONIZING...' : 'Deploy Activation Protocol'}
                                    {!loading && <Rocket className="w-5 h-5 ml-4 group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" strokeWidth={3} />}
                                </Button>
                                
                                <p className="text-[9px] text-text-muted text-center px-10 leading-relaxed font-bold font-mono uppercase tracking-widest opacity-40 italic">
                                    By proceeding, you authorize Trackora to initialize the 14-day trial sequence. Protocols can be dissolved at any moment within the Command Center.
                                </p>
                            </form>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="max-w-md mx-auto animate-in zoom-in-95 duration-1000 text-center flex flex-col items-center justify-center min-h-[520px]">
                            <div className="relative mb-12 group">
                                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-110 group-hover:scale-150 transition-transform duration-1000" />
                                <div className="w-32 h-32 bg-surface-solid border border-primary/20 rounded-[44px] flex items-center justify-center relative z-10 shadow-2xl rotate-12 group-hover:rotate-0 transition-all duration-700">
                                    <CheckCircle2 className="w-16 h-16 text-primary" strokeWidth={2.5} />
                                </div>
                            </div>
                            
                            <h2 className="text-5xl font-black text-text-primary mb-6 italic tracking-tight font-mono uppercase">System <span className="text-primary">Online</span></h2>
                            <p className="text-text-muted mb-16 max-w-sm mx-auto text-[11px] font-bold font-mono uppercase tracking-[0.1em] leading-loose opacity-60 italic px-8">
                                Welcome, Lead Operator <span className="text-primary">{profile?.full_name?.toUpperCase()}</span>. Organizational Registry <span className="text-text-primary underline decoration-primary/40 decoration-2 underline-offset-8">{orgName.toUpperCase()}</span> has been fully integrated.
                            </p>
                            
                            <Button
                                onClick={() => navigate('/dashboard')}
                                className="w-full py-5 text-[11px] font-mono font-bold uppercase tracking-[0.4em] shadow-2xl shadow-primary/30 italic group"
                            >
                                Enter Command Center
                                <ArrowRight className="w-6 h-6 ml-6 group-hover:translate-x-3 transition-transform" strokeWidth={3} />
                            </Button>
                            
                            <p className="mt-12 text-[9px] font-bold text-text-muted font-mono tracking-[0.4em] uppercase opacity-30 animate-pulse">
                                Core Services Operational • Ready for Tracking
                            </p>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}
