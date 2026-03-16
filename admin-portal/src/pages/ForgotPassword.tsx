import { useState } from 'react';
import { supabase } from '../lib/supabase';

type Step = 'form' | 'sent';

export function ForgotPassword() {
    const [step, setStep] = useState<Step>('form');
    const [email, setEmail] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setFormError(null);
        if (!email.trim()) return;

        setSubmitting(true);
        try {
            // redirectTo must be the page that handles the password update.
            // Supabase will append #access_token=... to this URL.
            const redirectTo = `${window.location.origin}/update-password`;
            const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
            if (error) throw new Error(error.message);
            setStep('sent');
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

    if (step === 'sent') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
                <div className="w-full max-w-md space-y-6">
                    <div className="text-center">{brand}</div>
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 shadow-2xl text-center space-y-4">
                        <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto">
                            <span className="text-3xl">📧</span>
                        </div>
                        <h1 className="text-xl font-bold text-white">Check your email</h1>
                        <p className="text-sm text-blue-200/70">
                            We've sent a password reset link to{' '}
                            <span className="text-white font-medium">{email}</span>.
                            Open the email and click the link to set a new password.
                        </p>
                        <p className="text-xs text-white/30">
                            Didn't receive it? Check your spam folder or{' '}
                            <button
                                onClick={() => { setStep('form'); setFormError(null); }}
                                className="underline text-blue-300/60 hover:text-blue-300 transition-colors"
                            >
                                try again
                            </button>.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md space-y-6">
                <div className="text-center">
                    {brand}
                    <h1 className="text-2xl font-bold text-white">Forgot your password?</h1>
                    <p className="text-blue-200/70 text-sm mt-1">
                        Enter your email and we'll send you a reset link.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 space-y-4 shadow-2xl">
                    <div>
                        <label className="block text-xs font-semibold text-blue-200/80 uppercase tracking-wide mb-1.5">
                            Email address
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            required
                            autoFocus
                            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                        />
                    </div>

                    {formError && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm px-4 py-2.5 rounded-xl">
                            {formError}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={submitting || !email.trim()}
                        className="w-full bg-blue-500 hover:bg-blue-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3 text-sm transition-all duration-200 shadow-lg shadow-blue-500/25 mt-2"
                    >
                        {submitting ? 'Sending…' : 'Send reset link'}
                    </button>

                    <p className="text-center text-xs text-white/30">
                        Remembered it?{' '}
                        <a href="/" className="underline text-blue-300/60 hover:text-blue-300 transition-colors">
                            Back to sign-in
                        </a>
                    </p>
                </form>
            </div>
        </div>
    );
}
