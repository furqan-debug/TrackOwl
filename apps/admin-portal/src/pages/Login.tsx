import { useState, useEffect, useRef } from 'react';
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

/* ─────────────────────────────────────────
   Individual digit box for OTP input
───────────────────────────────────────── */
function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const inputRef = useRef<HTMLInputElement>(null);
    const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? '');

    return (
        <div
            className="flex items-center justify-center gap-3 cursor-text"
            onClick={() => inputRef.current?.focus()}
        >
            <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={value}
                onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
                className="absolute opacity-0 w-0 h-0"
                autoComplete="one-time-code"
            />
            {digits.map((d, i) => (
                <div
                    key={i}
                    className={`w-12 h-16 sm:w-14 sm:h-[72px] rounded-2xl border-2 flex items-center justify-center
                                text-3xl font-bold font-mono transition-all duration-300
                                ${value.length === i
                                    ? 'border-primary bg-primary/5 shadow-[0_0_0_4px] shadow-primary/20 scale-105 z-10'
                                    : d
                                        ? 'border-border bg-surface text-text-main'
                                        : 'border-border/60 bg-surface/40 text-transparent'
                                }`}
                >
                    {d || (value.length === i ? <span className="w-0.5 h-7 bg-primary animate-pulse rounded-full" /> : '')}
                </div>
            ))}
        </div>
    );
}


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

    const handleGoogleAuth = async () => {
        setLoading(true);
        setError(null);
        try {
            const { error: authError } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/dashboard`
                }
            });
            if (authError) throw authError;
        } catch (err: any) {
            setError(err.message || 'Google Authentication failed.');
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
                            <>
                                <button
                                    type="button"
                                    onClick={handleGoogleAuth}
                                    disabled={loading}
                                    className="w-full h-16 bg-surface border border-border rounded-2xl text-[15px] font-bold text-text-main shadow-shell-sm hover:bg-surface-hover hover:shadow-md transition-all flex items-center justify-center gap-4 active:scale-[0.98] mb-8"
                                >
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 shrink-0">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                    </svg>
                                    <span>Continue with Google</span>
                                </button>

                                <div className="flex items-center gap-4 mb-8">
                                    <div className="h-px bg-border/80 flex-1"></div>
                                    <span className="text-[11px] font-black text-text-muted tracking-[0.2em] uppercase">Or sign in with email</span>
                                    <div className="h-px bg-border/80 flex-1"></div>
                                </div>

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
                            </>
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

                                <div className="py-2">
                                    <OtpInput value={mfaCode} onChange={setMfaCode} />
                                </div>

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
