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
                                    ? 'border-[#F7BC00] bg-[#F7BC00]/5 shadow-[0_0_0_4px] shadow-[#F7BC00]/10 scale-105 z-10'
                                    : d
                                        ? 'border-slate-200 bg-white text-slate-900'
                                        : 'border-slate-200 bg-slate-50/50 text-transparent'
                                }`}
                >
                    {d || (value.length === i ? <span className="w-0.5 h-7 bg-[#F7BC00] animate-pulse rounded-full" /> : '')}
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
            const { error: loginError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (loginError) throw loginError;
        } catch (err: any) {
            setError(err.message || 'Authentication failed. Please check your credentials.');
        } finally {
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
            setError(err.message || 'Google authentication failed.');
            setLoading(false);
        }
    };

    const handleChallengeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (mfaCode.length !== 6) return;

        setLoading(true);
        setError(null);

        try {
            const totpFactor = factors[0];
            if (!totpFactor) throw new Error('No MFA factors registered');

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
            <div className="min-h-screen bg-[#001338] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white flex relative overflow-hidden w-full light [color-scheme:light]">
            
            {/* LEFT SIDE: FORM PANEL */}
            <div className="w-full lg:w-1/2 flex flex-col justify-between p-8 sm:p-12 md:p-20 relative z-20 overflow-y-auto min-h-screen">
                
                {/* Header Logo */}
                <div className="flex items-center gap-2 cursor-pointer mb-12 lg:mb-0" onClick={() => navigate('/')}>
                    <img src={LogoIcon} alt="TrackOwl" className="h-10 object-contain drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
                </div>

                {/* Form Main Wrapper */}
                <div className="w-full max-w-[440px] mx-auto my-auto py-8">
                    <div className="mb-8">
                        <h1 className="text-3xl font-black text-[#001338] tracking-tight mb-2">Welcome back</h1>
                        <p className="text-slate-500 font-semibold text-sm">
                            Access the control console to manage your workspace.
                        </p>
                    </div>

                    <div className="w-full">
                        {step === 'credentials' && (
                            <>
                                <button
                                    type="button"
                                    onClick={handleGoogleAuth}
                                    disabled={loading}
                                    className="w-full h-14 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-3 active:scale-[0.98] mb-6 shadow-sm"
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 shrink-0">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                    </svg>
                                    <span>Sign in with Google</span>
                                </button>

                                <div className="flex items-center gap-3 mb-6">
                                    <div className="h-px bg-slate-200 flex-1"></div>
                                    <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">or sign in with email</span>
                                    <div className="h-px bg-slate-200 flex-1"></div>
                                </div>

                                <form onSubmit={handleLogin} className="space-y-5">
                                    <Input
                                        label="Work Email"
                                        type="email"
                                        required
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        placeholder="name@company.com"
                                        className="h-12 rounded-xl text-sm px-4 bg-slate-50/50 border-slate-200 focus:border-[#F7BC00]/40 focus:ring-[#F7BC00]/5 transition-all text-slate-900"
                                        leftIcon={<Mail className="w-4 h-4 text-slate-400" />}
                                    />

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between px-1">
                                            <label className="text-xs font-bold text-slate-500">Password</label>
                                            <Link to="/forgot-password" className="text-xs font-bold text-[#F7BC00] hover:text-[#e5af00] transition-colors">Forgot password?</Link>
                                        </div>
                                        <div className="relative">
                                            <Input
                                                type={showPw ? 'text' : 'password'}
                                                required
                                                value={password}
                                                onChange={e => setPassword(e.target.value)}
                                                placeholder="••••••••••••"
                                                className="h-12 rounded-xl text-sm px-4 bg-slate-50/50 border-slate-200 pr-12 focus:border-[#F7BC00]/40 focus:ring-[#F7BC00]/5 transition-all text-slate-900"
                                                leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPw(!showPw)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                            >
                                                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    {error && (
                                        <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-550/5 border border-rose-500/20 text-rose-600 text-sm font-semibold animate-in zoom-in-95 duration-300">
                                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                            <p className="leading-relaxed">{error}</p>
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 border-0 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                                    >
                                        {loading ? 'Signing in...' : 'Sign in'}
                                        {!loading && <ArrowRight className="w-4 h-4" />}
                                    </button>
                                </form>
                            </>
                        )}

                        {step === 'mfa-challenge' && (
                            <form onSubmit={handleChallengeSubmit} className="space-y-6">
                                <div className="text-center space-y-2">
                                    <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-xl bg-[#F7BC00]/10 border border-[#F7BC00]/20 text-[#F7BC00]">
                                        <ShieldCheck className="w-7 h-7" />
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900">Security Check</h3>
                                    <p className="text-xs text-slate-500 leading-relaxed max-w-[320px] mx-auto">
                                        Enter the 6-digit verification code from your authenticator application to continue.
                                    </p>
                                </div>

                                <div className="py-2">
                                    <OtpInput value={mfaCode} onChange={setMfaCode} />
                                </div>

                                {error && (
                                    <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-500/5 border border-rose-500/20 text-rose-600 text-sm font-semibold animate-in zoom-in-95 duration-300">
                                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                        <p className="leading-relaxed">{error}</p>
                                    </div>
                                )}

                                <div className="flex flex-col gap-3">
                                    <Button
                                        type="submit"
                                        disabled={loading || mfaCode.length !== 6}
                                        className="w-full h-12 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-md transition-all border-0"
                                    >
                                        {loading ? 'Verifying...' : 'Verify Identity'}
                                    </Button>

                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={handleCancelMfa}
                                        className="w-full h-11 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all flex items-center justify-center gap-1"
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                        Cancel & Exit
                                    </Button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>

                {/* Footer Link section */}
                <div className="text-center pt-8 border-t border-slate-100">
                    <p className="text-sm font-semibold text-slate-500">
                        Don't have a workspace?{' '}
                        <span onClick={() => navigate('/signup')} className="text-[#F7BC00] hover:text-[#e5af00] font-bold cursor-pointer transition-colors">
                            Activate now
                        </span>
                    </p>
                </div>
            </div>

            {/* RIGHT SIDE: PREMIUM ILLUSTRATION PANEL */}
            <div className="hidden lg:flex lg:w-1/2 bg-[#001338] relative items-end p-20 z-10 overflow-hidden">
                {/* Background glowing shapes */}
                <div className="absolute top-[-10%] right-[-10%] w-[80%] h-[80%] bg-[#002766] blur-[150px] rounded-full pointer-events-none" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
                <div className="absolute top-[30%] left-[20%] w-[10%] h-[10%] bg-[#F7BC00]/10 blur-[50px] rounded-full pointer-events-none" />
                
                {/* Decorative Matrix Grid */}
                <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

                {/* Branding text at bottom */}
                <div className="relative z-20 text-white max-w-lg">
                    <span className="text-[#F7BC00] text-xs font-bold uppercase tracking-widest block mb-4">TrackOwl Suite</span>
                    <h2 className="text-4xl font-black leading-[1.2] mb-4">
                        Ethics, privacy, and precision in one platform.
                    </h2>
                    <p className="text-slate-300 font-medium text-base leading-relaxed">
                        TrackOwl provides deep operational clarity and team productivity analytics without resorting to invasive monitoring or spyware.
                    </p>
                </div>
            </div>
        </div>
    );
}
