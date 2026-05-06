import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
    Mail, Lock, Eye, EyeOff,
    ArrowRight, AlertCircle
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

import LogoIcon from '../assets/branding/3.svg';

export function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) navigate('/dashboard', { replace: true });
        });
    }, [navigate]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) throw authError;

            navigate('/dashboard', { replace: true });
        } catch (err: any) {
            setError(err.message || 'Authentication failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-main flex flex-col items-center relative overflow-hidden">
            {/* Subtle Premium Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-40">
                <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-primary/5 blur-[120px]" />
                <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-accent/10 blur-[120px]" />
            </div>

            {/* Header */}
            <div className="w-full max-w-[1400px] px-8 py-10 flex items-center justify-between relative z-20 animate-in fade-in duration-1000">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
                    <div className="w-80 h-32 flex items-center justify-center overflow-hidden">
                        <img src={LogoIcon} alt="TrackOwl" className="w-full h-full object-contain" />
                    </div>
                </div>
                <div className="text-[10px] font-extrabold text-text-muted tracking-[0.2em] uppercase bg-surface/50 backdrop-blur-sm px-6 py-2.5 rounded-full border border-border shadow-soft">
                    Secure Operator Gateway
                </div>
            </div>

            <div className="flex-1 w-full max-w-[1210px] flex items-center justify-center p-8 relative z-20">
                <div className="w-full max-w-[520px]">
                    <div className="mb-12 text-center animate-in fade-in slide-in-from-bottom-6 duration-1000">
                        <h1 className="text-5xl md:text-6xl font-black heading-gradient mb-6">Welcome Back</h1>
                        <p className="text-text-muted font-medium text-lg leading-relaxed max-w-[380px] mx-auto tracking-tight">
                            Access the <span className="text-primary font-bold">Control Console</span> to oversee workspace intelligence.
                        </p>
                    </div>

                    <div className="glass-panel p-8 md:p-12 shadow-premium rounded-[40px] border border-border animate-in fade-in slide-in-from-bottom-10 duration-1000">
                        <form onSubmit={handleLogin} className="space-y-8">
                            <Input
                                label="Admin Email"
                                type="email"
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="name@company.com"
                                className="h-16 rounded-2xl text-base px-6 bg-surface/50 border-border focus:border-primary/40 focus:ring-primary/5 transition-all"
                                leftIcon={<Mail className="w-5 h-5 text-text-muted" />}
                            />

                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-1">
                                    <label className="text-[11px] font-black text-text-muted uppercase tracking-widest">Password</label>
                                    <Link to="/forgot-password" title="Forgot Password" className="text-[11px] font-black text-primary hover:text-text-main transition-all uppercase tracking-widest">Recovery Required?</Link>
                                </div>
                                <div className="relative">
                                    <Input
                                        type={showPw ? 'text' : 'password'}
                                        required
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder="••••••••••••"
                                        className="h-16 rounded-2xl text-base px-6 bg-surface/50 border-border pr-16 focus:border-primary/40 focus:ring-primary/5 transition-all"
                                        leftIcon={<Lock className="w-5 h-5 text-text-muted" />}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPw(!showPw)}
                                        className="absolute right-6 top-1/2 -translate-y-1/2 text-text-muted hover:text-primary transition-colors"
                                    >
                                        {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            {error && (
                                <div className="flex items-start gap-4 p-6 rounded-2xl bg-rose-500/5 border border-rose-500/20 text-rose-500 text-sm font-bold animate-in zoom-in-95 duration-300">
                                    <AlertCircle className="w-5 h-5 shrink-0" />
                                    <p className="leading-relaxed">{error}</p>
                                </div>
                            )}

                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full h-16 bg-primary text-white rounded-2xl font-bold text-lg group shadow-lg hover:shadow-primary/20 active:scale-[0.98] transition-all duration-300 border-0"
                            >
                                {loading ? 'Authorizing...' : 'Enter Dashboard'}
                                {!loading && <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" />}
                            </Button>
                        </form>

                        <div className="mt-12 pt-10 border-t border-border/50 text-center">
                            <p className="text-[11px] font-black text-text-muted uppercase tracking-[0.2em] mb-6">Unregistered Operator?</p>
                            <Button
                                onClick={() => navigate('/signup')}
                                variant="secondary"
                                className="w-full h-14 rounded-2xl text-[13px] font-black border-border bg-surface/30 hover:bg-surface-hover text-text-main transition-all uppercase tracking-widest"
                            >
                                Activate New Workspace
                            </Button>
                        </div>
                    </div>

                    <p className="mt-16 text-center text-[10px] font-black text-text-muted tracking-[0.3em] uppercase opacity-40 leading-relaxed max-w-[400px] mx-auto">
                        Authentication provided by <span className="text-text-main">TrackOwl Guard Pro</span>. Site integrity verified 2026.
                    </p>
                </div>
            </div>
        </div>
    );
}
