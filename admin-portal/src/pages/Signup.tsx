import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Mail, Lock, User, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';
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
            // 1. Sign up user in Supabase Auth
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
                // Member row creation is now handled automatically by a Postgres Trigger in Supabase
                // 3. Move to onboarding
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
            {/* Background Elements */}
            <div className="absolute inset-0 bg-gradient-mesh opacity-40 z-0" />
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/5 blur-[160px] rounded-full z-0 animate-pulse" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-violet-500/5 blur-[160px] rounded-full z-0 animate-pulse" style={{ animationDelay: '2s' }} />
            
            <div className="relative z-10 w-full max-w-[480px]">
                <div className="mb-12 text-center">
                    <button
                        type="button"
                        onClick={() => navigate('/')}
                        className="inline-flex items-center gap-4 px-5 py-2.5 rounded-[24px] bg-white border border-black/[0.05] shadow-xl hover:shadow-2xl hover:scale-105 transition-all mb-10 group"
                    >
                        <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 group-hover:rotate-12 transition-transform">
                             <div className="w-4 h-4 border-4 border-white rounded-[2px] rotate-45" />
                        </div>
                        <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-text-primary font-mono italic">Trackora</span>
                    </button>
                    
                    <h1 className="text-5xl font-extrabold tracking-tighter text-text-primary mb-6">
                        Create <span className="text-primary">Account</span>
                    </h1>
                    <p className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.3em] font-mono leading-relaxed opacity-50">
                        Start your 14-day free trial on the <span className="text-primary underline underline-offset-4 decoration-primary/30">{selectedPlan}</span> plan
                    </p>
                </div>

                <Card className="p-12 shadow-glow bg-white/60 backdrop-blur-3xl border-black/[0.02] rounded-[56px] animate-in stagger-1">
                    <form onSubmit={handleSignup} className="space-y-8">
                        <Input
                            label="Full Name"
                            type="text"
                            required
                            value={fullName}
                            onChange={e => setFullName(e.target.value)}
                            placeholder="John Doe"
                            leftIcon={<User className="w-5 h-5 text-primary" strokeWidth={2} />}
                        />

                        <Input
                            label="Email Address"
                            type="email"
                            required
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="you@company.com"
                            leftIcon={<Mail className="w-5 h-5 text-primary" strokeWidth={2} />}
                        />

                        <div className="space-y-4">
                            <label className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.2em] font-mono opacity-50 pl-1">Password</label>
                            <div className="relative">
                                <Input
                                    type={showPw ? 'text' : 'password'}
                                    required
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="At least 8 characters"
                                    leftIcon={<Lock className="w-5 h-5 text-primary" strokeWidth={2} />}
                                    className="pr-14"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPw(!showPw)}
                                    className="absolute right-6 top-1/2 -translate-y-1/2 text-text-muted hover:text-primary transition-all mt-4"
                                >
                                    {showPw ? <EyeOff className="w-5 h-5" strokeWidth={2} /> : <Eye className="w-5 h-5" strokeWidth={2} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-start gap-4 p-5 rounded-[28px] bg-rose-500/[0.03] border border-rose-500/10 text-rose-600 text-xs font-bold uppercase tracking-wider font-mono">
                                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" strokeWidth={2} />
                                <p>{error}</p>
                            </div>
                        )}

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full py-5 rounded-[24px] text-[12px] font-bold uppercase tracking-[0.3em] shadow-glow-primary hover:scale-[1.02] active:scale-95 transition-all"
                            rightIcon={!loading && <ArrowRight className="w-5 h-5 stroke-[2]" />}
                        >
                            {loading ? 'Creating...' : 'Create Account'}
                        </Button>
                    </form>

                    <p className="mt-10 text-[10px] font-bold text-text-muted text-center uppercase tracking-widest font-mono opacity-40 leading-relaxed">
                        By signing up, you agree to our <a href="#" className="text-primary hover:underline underline-offset-4">Terms of Service</a> and <a href="#" className="text-primary hover:underline underline-offset-4">Privacy Policy</a>.
                    </p>

                    <div className="mt-12 pt-10 border-t border-black/[0.03] flex flex-col items-center gap-6 text-center animate-in stagger-2">
                        <p className="text-[11px] font-bold text-text-muted uppercase tracking-[0.2em] font-mono opacity-50">
                            Already have an account?
                        </p>
                        <button 
                            onClick={() => navigate('/login')}
                            className="w-full py-5 rounded-[24px] border border-black/[0.05] bg-white/50 text-text-primary text-[11px] font-bold uppercase tracking-[0.3em] font-mono hover:bg-white hover:shadow-glow transition-all active:scale-95 shadow-sm"
                        >
                            Sign In
                        </button>
                    </div>
                </Card>

                <div className="mt-14 flex flex-wrap justify-center gap-x-12 gap-y-6 px-4">
                    <div className="flex items-center gap-3 group">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary/40 shadow-glow-sm group-hover:scale-150 transition-all group-hover:bg-primary" />
                        <span className="text-[11px] font-bold text-text-muted uppercase tracking-[0.2em] font-mono opacity-50">No Card Required</span>
                    </div>
                    <div className="flex items-center gap-3 group">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary/40 shadow-glow-sm group-hover:scale-150 transition-all group-hover:bg-primary" />
                        <span className="text-[11px] font-bold text-text-muted uppercase tracking-[0.2em] font-mono opacity-50">Cancel Anytime</span>
                    </div>
                    <div className="flex items-center gap-3 group">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary/40 shadow-glow-sm group-hover:scale-150 transition-all group-hover:bg-primary" />
                        <span className="text-[11px] font-bold text-text-muted uppercase tracking-[0.2em] font-mono opacity-50">Cloud Sync</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
