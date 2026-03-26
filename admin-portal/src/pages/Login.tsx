import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
    Mail, Lock, Eye, EyeOff, 
    ArrowRight, AlertCircle, Diamond
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';

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

            const { data: member, error: dbError } = await supabase
                .from('members')
                .select('role')
                .eq('email', email)
                .single();

            if (dbError || !member) {
                navigate('/dashboard', { replace: true });
            } else {
                navigate('/dashboard', { replace: true });
            }
        } catch (err: any) {
            setError(err.message || 'Failed to sign in. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center p-8">
            {/* Background Elements - Reduced and more solid */}
            <div className="absolute inset-0 bg-surface-subtle/20 z-0" />
            <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full z-0" />
            
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
                        System <span className="text-primary">Authentication</span>
                    </h1>
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono leading-relaxed opacity-60 max-w-[300px] mx-auto">
                        Secure gateway for organizational coordination & monitoring
                    </p>
                </div>

                <Card className="p-10 shadow-2xl bg-surface-solid border-border rounded-[48px] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/[0.02] rounded-full translate-x-16 -translate-y-16" />
                    
                    <form onSubmit={handleLogin} className="space-y-8 relative z-10">
                        <Input
                            label="Verification Identity (Email)"
                            type="email"
                            required
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="OPERATOR@TRACKORA.AI"
                            className="font-mono text-[13px] font-bold"
                            leftIcon={<Mail className="w-5 h-5 text-primary" strokeWidth={2.5} />}
                        />

                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-1">
                                <label className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] font-mono opacity-80">Security Protocol (Password)</label>
                                <Link to="/forgot-password" title="Forgot Password" className="text-[9px] font-bold text-primary hover:text-primary-hover uppercase tracking-[0.2em] transition-colors font-mono italic">Recovery Options</Link>
                            </div>
                            <div className="relative">
                                <Input
                                    type={showPw ? 'text' : 'password'}
                                    required
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••••••"
                                    className="pr-14 font-mono"
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
                            {loading ? 'Executing Linkage...' : 'Authorize Access'}
                            <ArrowRight className="w-5 h-5 ml-4 group-hover:translate-x-1 transition-transform" strokeWidth={3} />
                        </Button>
                    </form>

                    <div className="mt-12 pt-10 border-t border-border/50 text-center">
                        <p className="text-[9px] font-bold text-text-muted uppercase tracking-[0.3em] mb-6 font-mono opacity-40 italic">New operational assignment?</p>
                        <Button 
                            onClick={() => navigate('/signup')}
                            variant="secondary"
                            className="w-full py-4 rounded-xl text-[10px] font-mono font-bold uppercase tracking-[0.2em]"
                        >
                            Initialize New Account
                        </Button>
                    </div>
                </Card>

                <p className="mt-12 text-center text-[9px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono px-12 leading-relaxed opacity-40">
                    Encrypted via <span className="text-primary">Trackora Guard Pro</span>. Site integrity verified. Deployment 2026.03.26
                </p>
            </div>
        </div>
    );
}
