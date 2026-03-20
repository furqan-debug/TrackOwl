import { useState } from 'react';
import { Mail, ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
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
        <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center p-8">
            <div className="absolute inset-0 bg-gradient-mesh opacity-40 z-0" />
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/5 blur-[160px] rounded-full z-0 animate-pulse" />
            
            <div className="relative z-10 w-full max-w-[480px] text-center">
                <Card className="p-12 shadow-glow bg-white/60 backdrop-blur-3xl border-black/[0.02] rounded-[56px] space-y-10 animate-in stagger-1">
                    <div className="w-24 h-24 bg-primary/[0.03] border border-primary/10 rounded-[40px] flex items-center justify-center mx-auto shadow-glow rotate-3 transition-transform hover:rotate-0 duration-700">
                        <CheckCircle2 className="w-12 h-12 text-primary" strokeWidth={2} />
                    </div>
                    
                    <div className="space-y-4">
                        <h1 className="text-4xl font-extrabold text-text-primary tracking-tight">Check your Email</h1>
                        <p className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.3em] font-mono leading-relaxed opacity-50">
                            A recovery link has been sent to<br/>
                            <span className="text-primary underline underline-offset-4 decoration-primary/20">{email}</span>
                        </p>
                    </div>

                    <div className="pt-10 border-t border-black/[0.02] animate-in stagger-2">
                        <p className="text-[10px] font-bold text-text-muted mb-8 uppercase tracking-[0.2em] font-mono opacity-40">
                            Didn't receive it? Check your spam folder or try another email.
                        </p>
                        <button
                            className="w-full py-5 rounded-[24px] border border-black/[0.05] text-text-primary text-[11px] font-bold uppercase tracking-[0.3em] font-mono hover:bg-white hover:shadow-glow transition-all active:scale-95"
                            onClick={() => { setStep('form'); setFormError(null); }}
                        >
                            Try Another Email
                        </button>
                    </div>
                </Card>
                
                <button
                    onClick={() => navigate('/login')}
                    className="mt-14 inline-flex items-center gap-4 text-[11px] font-bold text-text-muted hover:text-primary transition-all tracking-[0.3em] uppercase font-mono group opacity-60"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" strokeWidth={2} />
                    Return to Login
                </button>
            </div>
        </div>
        );
    }

    return (
        <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center p-8">
            <div className="absolute inset-0 bg-gradient-mesh opacity-40 z-0" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-violet-500/5 blur-[160px] rounded-full z-0 animate-pulse" />
            
            <div className="relative z-10 w-full max-w-[480px]">
                <div className="mb-12 text-center">
                    <button
                        type="button"
                        onClick={() => navigate('/login')}
                        className="inline-flex items-center gap-4 px-6 py-2.5 rounded-[24px] bg-white border border-black/[0.05] shadow-glow hover:scale-105 transition-all mb-10 group"
                    >
                        <ArrowLeft className="w-4 h-4 text-primary group-hover:-translate-x-1 transition-transform" strokeWidth={2} />
                        <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-text-primary font-mono">Back to Login</span>
                    </button>
                    
                    <h1 className="text-5xl font-extrabold tracking-tighter text-text-primary mb-6">
                        Reset <span className="text-primary">Password</span>
                    </h1>
                    <p className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.3em] font-mono leading-relaxed opacity-50">
                        We'll send you a link to get back into your account
                    </p>
                </div>

                <Card className="p-12 shadow-glow bg-white/60 backdrop-blur-3xl border-black/[0.02] rounded-[56px] animate-in stagger-1">
                    <form onSubmit={handleSubmit} className="space-y-10">
                        <Input
                            label="Email Address"
                            type="email"
                            required
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="you@company.com"
                            leftIcon={<Mail className="w-5 h-5 text-primary" strokeWidth={2} />}
                            autoFocus
                        />

                        {formError && (
                            <div className="p-5 rounded-[24px] bg-rose-500/[0.03] border border-rose-500/10 text-rose-600 text-xs font-bold uppercase tracking-wider font-mono">
                                {formError}
                            </div>
                        )}

                        <Button
                            type="submit"
                            disabled={submitting || !email.trim()}
                            className="w-full py-5 rounded-[24px] text-[12px] font-bold uppercase tracking-[0.3em] shadow-glow-primary hover:scale-[1.02] active:scale-95 transition-all"
                            rightIcon={!submitting && <ArrowRight className="w-5 h-5 stroke-[2]" />}
                        >
                            {submitting ? 'Sending...' : 'Send Reset Link'}
                        </Button>
                    </form>
                </Card>
                
                <p className="mt-14 text-center text-[10px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono px-8 leading-relaxed opacity-40">
                    Links expire in 60 minutes for security.
                </p>
            </div>
        </div>
    );
}
