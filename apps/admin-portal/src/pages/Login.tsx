import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
    Mail, Lock, Eye, EyeOff,
    ArrowRight, AlertCircle, ArrowLeft, ShieldCheck
} from 'lucide-react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';

import LogoIcon from '../assets/branding/3.svg';

export function Login() {
    const navigate = useNavigate();
    const { session, loading: authLoading, aalLevel, nextAalLevel, refreshAal, signOut } = useAuth();
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // MFA States
    const [factors, setFactors] = useState<any[]>([]);
    const [mfaCode, setMfaCode] = useState('');

    // Determine step reactively based on auth context state
    let step: 'credentials' | 'mfa-challenge' = 'credentials';
    if (session && aalLevel === 'aal1' && nextAalLevel === 'aal2') {
        step = 'mfa-challenge';
    }

    // Load factors for challenge
    useEffect(() => {
        if (step === 'mfa-challenge') {
            const getFactors = async () => {
                try {
                    const { data, error: factorsError } = await supabase.auth.mfa.listFactors();
                    if (factorsError) throw factorsError;
                    setFactors(data.all || []);
                } catch (err: any) {
                    setError(err.message || 'Failed to list authentication factors');
                }
            };
            getFactors();
        }
    }, [step]);

    // Reset verification code and error on step change
    useEffect(() => {
        setError(null);
        setMfaCode('');
    }, [step]);

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
            // The AuthContext will reactively load the session.
            // If the user has MFA enabled, the layout will shift to the mfa-challenge step.
            // If they do not have MFA, the top-level redirect will send them to /dashboard.
        } catch (err: any) {
            setError(err.message || 'Authentication failed. Please check your credentials.');
            setLoading(false);
        }
    };

    const handleChallengeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (mfaCode.length !== 6) {
            setError('Verification code must be exactly 6 digits');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const totpFactor = factors.find(f => f.factor_type === 'totp' && f.status === 'verified');
            if (!totpFactor) throw new Error('No verified authentication factor found');

            const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
                factorId: totpFactor.id,
            });
            if (challengeError) throw challengeError;

            const { error: verifyError } = await supabase.auth.mfa.verify({
                factorId: totpFactor.id,
                challengeId: challengeData.id,
                code: mfaCode,
            });
            if (verifyError) throw verifyError;

            const levels = await refreshAal();
            if (levels?.currentLevel === 'aal2') {
                navigate('/dashboard', { replace: true });
            } else {
                throw new Error('Verification completed but assurance level is insufficient');
            }
        } catch (err: any) {
            setError(err.message || 'Invalid verification code. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleCancelMfa = async () => {
        setError(null);
        setMfaCode('');
        await signOut();
    };

    // Automatically redirect if fully logged in and verified (compliance with rules of hooks)
    if (!authLoading && session && (aalLevel === 'aal2' || nextAalLevel === 'aal1')) {
        return <Navigate to="/dashboard" replace />;
    }

    if (authLoading) {
        return (
            <div className="min-h-screen bg-main flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
            </div>
        );
    }

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
                        {step === 'credentials' && (
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
                        )}

                        {step === 'mfa-challenge' && (
                            <form onSubmit={handleChallengeSubmit} className="space-y-8">
                                <div className="text-center space-y-3">
                                    <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
                                        <ShieldCheck className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-xl font-black tracking-tight text-text-main">Security Check</h3>
                                    <p className="text-sm text-text-muted leading-relaxed px-4">
                                        Enter the 6-digit verification code from your authenticator application to continue.
                                    </p>
                                </div>

                                <input
                                    type="text"
                                    required
                                    maxLength={6}
                                    pattern="[0-9]*"
                                    inputMode="numeric"
                                    value={mfaCode}
                                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                                    className="block w-full text-center text-3xl tracking-[0.75em] font-mono py-4 bg-surface/50 border border-border rounded-2xl shadow-soft focus:outline-none focus:border-primary/40 focus:ring-primary/5 transition-all"
                                    placeholder="000000"
                                />

                                {error && (
                                    <div className="flex items-start gap-4 p-6 rounded-2xl bg-rose-500/5 border border-rose-500/20 text-rose-500 text-sm font-bold animate-in zoom-in-95 duration-300">
                                        <AlertCircle className="w-5 h-5 shrink-0" />
                                        <p className="leading-relaxed">{error}</p>
                                    </div>
                                )}

                                <div className="flex flex-col gap-4">
                                    <Button
                                        type="submit"
                                        disabled={loading || mfaCode.length !== 6}
                                        className="w-full h-16 bg-primary text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-primary/20 active:scale-[0.98] transition-all duration-300 border-0"
                                    >
                                        {loading ? 'Verifying...' : 'Verify Identity'}
                                    </Button>

                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={handleCancelMfa}
                                        className="w-full h-14 rounded-2xl text-[13px] font-black border-border bg-surface/30 hover:bg-surface-hover text-text-main transition-all uppercase tracking-widest flex items-center justify-center gap-2"
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                        Cancel & Exit
                                    </Button>
                                </div>
                            </form>
                        )}

                        {step === 'credentials' && (
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
                        )}
                    </div>

                    <p className="mt-16 text-center text-[10px] font-black text-text-muted tracking-[0.3em] uppercase opacity-40 leading-relaxed max-w-[400px] mx-auto">
                        Authentication provided by <span className="text-text-main">TrackOwl Guard Pro</span>. Site integrity verified 2026.
                    </p>
                </div>
            </div>
        </div>
    );
}
