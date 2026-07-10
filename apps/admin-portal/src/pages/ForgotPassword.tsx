import { useState } from 'react';
import { Mail, ArrowLeft, ArrowRight, CheckCircle2, ShieldAlert } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Input } from '../components/ui/Input';
import { useNavigate } from 'react-router-dom';

import LogoIcon from '../assets/branding/3.svg';

type Step = 'form' | 'sent';

export function ForgotPassword() {
    const navigate = useNavigate();
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
                    {step === 'sent' ? (
                        <div className="text-center py-8 animate-in fade-in zoom-in-95 duration-500">
                            <div className="w-16 h-16 bg-green-500/10 rounded-xl flex items-center justify-center mx-auto mb-6 border border-green-500/20 text-green-500">
                                <CheckCircle2 className="w-8 h-8" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 mb-3">Reset link sent</h3>
                            <p className="text-slate-500 text-sm font-medium leading-relaxed mb-6">
                                A secure recovery link has been dispatched to:<br/>
                                <span className="text-[#F7BC00] font-bold underline underline-offset-4 mt-2 inline-block">{email}</span>
                            </p>
                            <button
                                onClick={() => { setStep('form'); setFormError(null); }}
                                className="w-full h-12 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-md transition-all border-0 mb-4 cursor-pointer"
                            >
                                Resend Email
                            </button>
                            <button
                                onClick={() => navigate('/login')}
                                className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1 mx-auto"
                            >
                                <ArrowLeft className="w-4 h-4" /> Return to sign in
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="mb-8">
                                <button
                                    type="button"
                                    onClick={() => navigate('/login')}
                                    className="inline-flex items-center gap-2 text-xs font-bold text-[#F7BC00] hover:text-[#e5af00] transition-colors mb-6"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    <span>Back to login</span>
                                </button>
                                <h1 className="text-3xl font-black text-[#001338] tracking-tight mb-2">Reset password</h1>
                                <p className="text-slate-500 font-semibold text-sm">
                                    We'll send a password reset link to your email.
                                </p>
                            </div>

                            <div className="w-full">
                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <Input
                                        label="Work Email"
                                        type="email"
                                        required
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        placeholder="name@company.com"
                                        className="h-12 rounded-xl text-sm px-4 bg-slate-50/50 border-slate-200 focus:border-[#F7BC00]/40 focus:ring-[#F7BC00]/5 transition-all text-slate-900"
                                        leftIcon={<Mail className="w-4 h-4 text-slate-400" />}
                                        autoFocus
                                    />

                                    {formError && (
                                        <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-550/5 border border-rose-500/20 text-rose-600 text-sm font-semibold animate-in zoom-in-95 duration-300">
                                            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                                            <p className="leading-relaxed">{formError}</p>
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={submitting || !email.trim()}
                                        className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 border-0 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                                    >
                                        {submitting ? 'Sending link...' : 'Send reset link'}
                                        {!submitting && <ArrowRight className="w-4 h-4" />}
                                    </button>
                                </form>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer Link section */}
                <div className="text-center pt-8 border-t border-slate-100">
                    <p className="text-sm font-semibold text-slate-500">
                        Need help?{' '}
                        <a href="mailto:contact@trackowl.io" className="text-[#F7BC00] hover:text-[#e5af00] font-bold transition-colors">
                            Contact support
                        </a>
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
                    <span className="text-[#F7BC00] text-xs font-bold uppercase tracking-widest block mb-4">Security override</span>
                    <h2 className="text-4xl font-black leading-[1.2] mb-4">
                        Secure access recovery.
                    </h2>
                    <p className="text-slate-300 font-medium text-base leading-relaxed">
                        Verify your identity to initiate an automated credential override link. Security links expire within 60 minutes.
                    </p>
                </div>
            </div>
        </div>
    );
}
