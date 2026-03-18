import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type Step = 'loading' | 'form' | 'success' | 'error';

export function UpdatePassword() {
    const [step, setStep] = useState<Step>('loading');
    const [errorMsg, setErrorMsg] = useState('');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    useEffect(() => {
        // Supabase puts the recovery session in the URL hash after the user
        // clicks the password-reset email link. getSession() reads it automatically.
        supabase.auth.getSession().then(({ data: { session }, error }) => {
            if (error || !session) {
                setErrorMsg(
                    error?.message ||
                    'This reset link is invalid or has expired. Please request a new one.'
                );
                setStep('error');
                return;
            }
            setStep('form');
        });
    }, []);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setFormError(null);

        if (password.length < 8) return setFormError('Password must be at least 8 characters.');
        if (password !== confirmPassword) return setFormError('Passwords do not match.');

        setSubmitting(true);
        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw new Error(error.message);
            setStep('success');
        } catch (err: any) {
            setFormError(err.message);
        } finally {
            setSubmitting(false);
        }
    }

    const brand = (
        <div className="inline-flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">D</span>
            </div>
            <span className="text-white text-xl font-bold tracking-tight">Trackora</span>
        </div>
    );

    if (step === 'loading') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-white/60">
                    <div className="w-8 h-8 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
                    <p className="text-sm">Verifying reset link…</p>
                </div>
            </div>
        );
    }

    if (step === 'error') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center space-y-3">
                    <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto">
                        <span className="text-2xl">⚠️</span>
                    </div>
                    <h1 className="text-xl font-bold text-slate-900">Link expired</h1>
                    <p className="text-sm text-slate-500">{errorMsg}</p>
                    <a
                        href="/forgot-password"
                        className="inline-block mt-2 text-sm text-blue-600 underline hover:text-blue-700"
                    >
                        Request a new reset link
                    </a>
                </div>
            </div>
        );
    }

    if (step === 'success') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
                <div className="w-full max-w-md space-y-6">
                    <div className="text-center">{brand}</div>
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 shadow-2xl text-center space-y-4">
                        <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto">
                            <span className="text-3xl">✅</span>
                        </div>
                        <h1 className="text-xl font-bold text-white">Password updated!</h1>
                        <p className="text-sm text-blue-200/70">
                            Your password has been changed successfully. You can now sign in to the
                            Trackora (by DigiReps) desktop app with your new password.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // ── New-password form ─────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md space-y-6">
                <div className="text-center">
                    {brand}
                    <h1 className="text-2xl font-bold text-white">Set a new password</h1>
                    <p className="text-blue-200/70 text-sm mt-1">
                        Choose a strong password for your account.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 space-y-4 shadow-2xl">
                    {/* New Password */}
                    <div>
                        <label className="block text-xs font-semibold text-blue-200/80 uppercase tracking-wide mb-1.5">
                            New Password *
                        </label>
                        <div className="relative">
                            <input
                                type={showPw ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Min. 8 characters"
                                required
                                autoFocus
                                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 pr-10 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                            />
                            <button type="button" onClick={() => setShowPw(p => !p)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 text-xs">
                                {showPw ? 'Hide' : 'Show'}
                            </button>
                        </div>
                        {password.length > 0 && password.length < 8 && (
                            <p className="text-xs text-amber-400 mt-1">At least 8 characters required</p>
                        )}
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label className="block text-xs font-semibold text-blue-200/80 uppercase tracking-wide mb-1.5">
                            Confirm Password *
                        </label>
                        <input
                            type={showPw ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            placeholder="Repeat your password"
                            required
                            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                        />
                        {confirmPassword.length > 0 && password !== confirmPassword && (
                            <p className="text-xs text-rose-400 mt-1">Passwords don't match</p>
                        )}
                    </div>

                    {formError && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm px-4 py-2.5 rounded-xl">
                            {formError}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={submitting || password.length < 8 || password !== confirmPassword}
                        className="w-full bg-blue-500 hover:bg-blue-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3 text-sm transition-all duration-200 shadow-lg shadow-blue-500/25 mt-2"
                    >
                        {submitting ? 'Updating password…' : 'Update password'}
                    </button>
                </form>
            </div>
        </div>
    );
}
