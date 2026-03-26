import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Mail, Lock, User, Eye, EyeOff, AlertCircle, ArrowRight, Diamond } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';

export function Signup() {
    const navigate = useNavigate();
    const location = useLocation();
    const selectedPlan = location.state?.plan || 'Starter';

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                    }
                }
            });

            if (authError) throw authError;

            if (authData.user) {
                navigate('/onboarding', { state: { plan: selectedPlan } });
            }
        } catch (err: any) {
            setError(err.message || 'Signup failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center p-8">
            <div className="absolute inset-0 bg-surface-subtle/20 z-0" />
            <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full z-0" />
            
            <div className="relative z-10 w-full max-w-[480px] animate-in fade-in slide-in-from-bottom-8 duration-1000">
                <div className="mb-12 text-center">
                    <button
                        type="button"
                        onClick={() => navigate('/')}
                        className="inline-flex items-center gap-4 px-6 py-3 rounded-2xl bg-surface-solid border border-border shadow-sm hover:shadow-xl hover:scale-105 transition-all mb-10 group"
                    >
                        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 group-hover:rotate-12 transition-transform">
                             <Diamond className="w-5 h-5 text-white" strokeWidth={2.5} />
                        </div>
                        <div className="flex flex-col items-start">
                            <span className="text-[10px] font-bold text-primary uppercase tracking-[0.3em] font-mono leading-none mb-1">TRACKORA</span>
                            <span className="text-[8px] font-bold text-text-muted uppercase tracking-widest font-mono opacity-60">ADMIN PORTAL</span>
                        </div>
                    </button>
                    
                    <h1 className="text-4xl font-black tracking-tight text-text-primary mb-4 italic font-mono uppercase">
                        Initialize <span className="text-primary">Registry</span>
                    </h1>
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono leading-relaxed opacity-60 max-w-[340px] mx-auto">
                        Deployment Phase: <span className="text-primary underline underline-offset-4 decoration-primary/30 uppercase">{selectedPlan}</span> protocol activation
                    </p>
                </div>

                <Card className="p-10 shadow-2xl bg-surface-solid border-border rounded-[48px] relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-32 h-32 bg-primary/[0.02] rounded-full -translate-x-16 -translate-y-16" />
                    
                    <form onSubmit={handleSignup} className="space-y-8 relative z-10">
                        <Input
                            label="Legal Identity (Full Name)"
                            type="text"
                            required
                            value={fullName}
                            onChange={e => setFullName(e.target.value)}
                            placeholder="JOHN DOE"
                            className="font-mono text-[13px] font-bold uppercase"
                            leftIcon={<User className="w-5 h-5 text-primary" strokeWidth={2.5} />}
                        />

                        <Input
                            label="Verification Identity (Email)"
                            type="email"
                            required
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="OPERATOR@COMPANY.COM"
                            className="font-mono text-[13px] font-bold uppercase"
                            leftIcon={<Mail className="w-5 h-5 text-primary" strokeWidth={2.5} />}
                        />

                        <div className="space-y-4">
                            <label className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] font-mono opacity-80 pl-1">Security Protocol (Password)</label>
                            <div className="relative">
                                <Input
                                    type={showPw ? 'text' : 'password'}
                                    required
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="MINIMUM 8 CHARACTERS"
                                    className="pr-14 font-mono text-[13px] font-bold"
                                    leftIcon={<Lock className="w-5 h-5 text-primary" strokeWidth={2.5} />}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPw(!showPw)}
                                    className="absolute right-6 top-[22px] text-text-muted hover:text-primary transition-all"
                                >
                                    {showPw ? <EyeOff className="w-5 h-5" strokeWidth={2.5} /> : <Eye className="w-5 h-5" strokeWidth={2.5} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-start gap-4 p-5 rounded-2xl bg-rose-500/5 border border-rose-500/20 text-rose-600 text-[10px] font-bold uppercase tracking-wider font-mono italic">
                                <AlertCircle className="w-5 h-5 shrink-0" strokeWidth={2.5} />
                                <p className="leading-relaxed">{error}</p>
                            </div>
                        )}

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full py-5 rounded-2xl text-[11px] font-mono font-bold uppercase tracking-[0.3em] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all italic"
                        >
                            {loading ? 'Initializing Protocol...' : 'Create Master Account'}
                            <ArrowRight className="w-5 h-5 ml-4 group-hover:translate-x-1 transition-transform" strokeWidth={3} />
                        </Button>
                    </form>

                    <p className="mt-10 text-[9px] font-bold text-text-muted text-center uppercase tracking-[0.2em] font-mono opacity-40 leading-relaxed italic">
                        By initializing, you confirm adherence to the <a href="#" className="text-primary hover:underline underline-offset-4 decoration-primary/30">Terms of Governance</a> and <a href="#" className="text-primary hover:underline underline-offset-4 decoration-primary/30">Privacy Guidelines</a>.
                    </p>

                    <div className="mt-12 pt-10 border-t border-border/50 text-center">
                        <p className="text-[9px] font-bold text-text-muted uppercase tracking-[0.3em] mb-6 font-mono opacity-40 italic">Existing operational clearance?</p>
                        <Button 
                            onClick={() => navigate('/login')}
                            variant="secondary"
                            className="w-full py-4 rounded-xl text-[10px] font-mono font-bold uppercase tracking-[0.2em]"
                        >
                            Return to Login
                        </Button>
                    </div>
                </Card>

                <div className="mt-12 flex flex-wrap justify-center gap-x-10 gap-y-6 px-4">
                    {['Zero Credentials Req', 'Instant Termination', 'Cloud Synchronization'].map((txt) => (
                        <div key={txt} className="flex items-center gap-3 group">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary/40 group-hover:scale-150 transition-all group-hover:bg-primary shadow-[0_0_10px_rgba(var(--color-primary-rgb),0.5)]" />
                            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest font-mono opacity-40 group-hover:opacity-100 transition-all">{txt}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
