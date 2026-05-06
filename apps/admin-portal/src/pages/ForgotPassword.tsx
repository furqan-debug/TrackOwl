import { useState } from 'react';
import { Mail, ArrowLeft, ArrowRight, CheckCircle2, ShieldAlert } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useNavigate } from 'react-router-dom';

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

    if (step === 'sent') {
        return (
            <div className="min-h-screen bg-main flex flex-col items-center relative overflow-hidden flex items-center justify-center p-8">
                {/* Subtle Premium Background Decoration */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-40">
                    <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-primary/5 blur-[120px]" />
                    <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-accent/10 blur-[120px]" />
                </div>
                
                <div className="relative z-10 w-full max-w-[520px] text-center animate-in fade-in zoom-in duration-1000">
                    <div className="glass-panel p-12 shadow-premium border border-border rounded-[56px] space-y-10 relative overflow-hidden">
                        <div className="w-24 h-24 bg-emerald-500/5 border border-emerald-500/10 rounded-[40px] flex items-center justify-center mx-auto shadow-shell-sm transition-all duration-700">
                            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                        </div>
                        
                        <div className="space-y-6">
                            <h1 className="text-4xl md:text-5xl font-black heading-gradient">Dispatch Complete</h1>
                            <p className="text-text-muted font-medium text-lg leading-relaxed max-w-[380px] mx-auto tracking-tight">
                                A secure recovery vector has been dispatched to:<br/>
                                <span className="text-primary font-bold underline underline-offset-8 decoration-primary/30 mt-4 inline-block">{email}</span>
                            </p>
                        </div>

                        <div className="pt-10 border-t border-border/50">
                            <p className="text-[11px] font-black text-text-muted mb-8 tracking-[0.2em] uppercase opacity-40 leading-relaxed">
                                No dispatch received? Conduct a verification of your junk directory or initialize a secondary request.
                            </p>
                            <Button
                                variant="secondary"
                                className="w-full h-14 rounded-2xl text-[13px] font-black border-border bg-surface/30 hover:bg-surface-hover text-text-main transition-all uppercase tracking-widest"
                                onClick={() => { setStep('form'); setFormError(null); }}
                            >
                                Retry Transmission
                            </Button>
                        </div>
                    </div>
                    
                    <button
                        onClick={() => navigate('/login')}
                        className="mt-12 inline-flex items-center gap-4 text-[11px] font-black text-text-muted hover:text-primary transition-all tracking-[0.3em] uppercase group opacity-60 hover:opacity-100"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Return to Login
                    </button>
                </div>
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

            <div className="flex-1 w-full max-w-[1210px] flex items-center justify-center p-8 relative z-20">
                <div className="w-full max-w-[520px]">
                    <div className="mb-12 text-center animate-in fade-in slide-in-from-bottom-6 duration-1000">
                        <button
                            type="button"
                            onClick={() => navigate('/login')}
                            className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-surface/50 backdrop-blur-md border border-border shadow-soft hover:shadow-shell-md hover:scale-105 transition-all mb-10 group"
                        >
                            <ArrowLeft className="w-4 h-4 text-primary group-hover:-translate-x-1 transition-transform" />
                            <span className="text-[11px] font-black tracking-widest text-text-main uppercase">Back to Login</span>
                        </button>
                        
                        <h1 className="text-5xl md:text-6xl font-black heading-gradient mb-6">Recover Access</h1>
                        <p className="text-text-muted font-medium text-lg leading-relaxed max-w-[400px] mx-auto tracking-tight">
                            Initialize a secure credential override protocol for your operator account.
                        </p>
                    </div>

                    <div className="glass-panel p-8 md:p-12 shadow-premium rounded-[40px] border border-border animate-in fade-in slide-in-from-bottom-10 duration-1000">
                        <form onSubmit={handleSubmit} className="space-y-10 relative z-10">
                            <Input
                                label="Operator Email Identity"
                                type="email"
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="name@company.com"
                                className="h-16 rounded-2xl text-base px-6 bg-surface/50 border-border focus:border-primary/40 focus:ring-primary/5 transition-all"
                                leftIcon={<Mail className="w-5 h-5 text-text-muted" />}
                                autoFocus
                            />

                            {formError && (
                                <div className="flex items-start gap-4 p-6 rounded-2xl bg-rose-500/5 border border-rose-500/20 text-rose-500 text-sm font-bold animate-in zoom-in-95 duration-300">
                                    <ShieldAlert className="w-5 h-5 shrink-0" />
                                    <p className="leading-relaxed">{formError}</p>
                                </div>
                            )}

                            <Button
                                type="submit"
                                disabled={submitting || !email.trim()}
                                className="w-full h-16 bg-primary text-white rounded-2xl font-bold text-lg group shadow-lg hover:shadow-primary/20 active:scale-[0.98] transition-all duration-300 border-0"
                            >
                                {submitting ? 'Authenticating...' : 'Initialize Dispatch'}
                                <ArrowRight className="w-5 h-5 ml-4 group-hover:translate-x-2 transition-transform" />
                            </Button>
                        </form>
                    </div>
                    
                    <p className="mt-16 text-center text-[10px] font-black text-text-muted tracking-[0.3em] uppercase opacity-40 leading-relaxed max-w-[400px] mx-auto">
                        Security override links expire in 3600 seconds. <br/>
                        Verified operator access required.
                    </p>
                </div>
            </div>
        </div>
    );
}
