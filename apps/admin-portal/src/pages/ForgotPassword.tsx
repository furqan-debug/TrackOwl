import { useState } from 'react';
import { Mail, ArrowLeft, ArrowRight, CheckCircle2, ShieldAlert } from 'lucide-react';
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
            <div className="absolute inset-0 bg-surface-subtle/20 z-0" />
            
            <div className="relative z-10 w-full max-w-[480px] text-center animate-in fade-in zoom-in duration-700">
                <Card className="p-12 shadow-2xl bg-surface-solid border-border rounded-[56px] space-y-10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/[0.03] rounded-full translate-x-16 -translate-y-16" />
                    
                    <div className="w-24 h-24 bg-emerald-500/5 border border-emerald-500/10 rounded-[40px] flex items-center justify-center mx-auto shadow-shell-sm rotate-3 transition-transform hover:rotate-0 duration-700">
                        <CheckCircle2 className="w-12 h-12 text-emerald-500" strokeWidth={2.5} />
                    </div>
                    
                    <div className="space-y-4">
                        <h1 className="text-4xl font-black text-text-primary tracking-tight font-mono italic">Transmission <span className="text-emerald-500">Complete</span></h1>
                        <p className="text-[10px] font-bold text-text-muted tracking-[0.3em] font-mono leading-relaxed opacity-60">
                            A recovery vector has been dispatched to:<br/>
                            <span className="text-primary underline underline-offset-8 decoration-primary/30 mt-4 inline-block">{email.toUpperCase()}</span>
                        </p>
                    </div>

                    <div className="pt-10 border-t border-border/50">
                        <p className="text-[9px] font-bold text-text-muted mb-8 tracking-[0.2em] font-mono opacity-40 italic">
                            No dispatch received? Conduct a verification of your junk directory or initialize a secondary request.
                        </p>
                        <Button
                            variant="secondary"
                            className="w-full py-4 rounded-xl text-[10px] font-mono font-bold tracking-[0.2em]"
                            onClick={() => { setStep('form'); setFormError(null); }}
                        >
                            Retry Transmission
                        </Button>
                    </div>
                </Card>
                
                <button
                    onClick={() => navigate('/login')}
                    className="mt-12 inline-flex items-center gap-4 text-[10px] font-bold text-text-muted hover:text-primary transition-all tracking-[0.3em] font-mono group opacity-40 hover:opacity-100"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" strokeWidth={3} />
                    Return to Operator Login
                </button>
            </div>
        </div>
        );
    }

    return (
        <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center p-8">
            <div className="absolute inset-0 bg-surface-subtle/20 z-0" />
            <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full z-0" />
            
            <div className="relative z-10 w-full max-w-[480px] animate-in fade-in slide-in-from-bottom-8 duration-1000">
                <div className="mb-12 text-center">
                    <button
                        type="button"
                        onClick={() => navigate('/login')}
                        className="inline-flex items-center gap-4 px-6 py-3 rounded-2xl bg-surface-solid border border-border shadow-shell-sm hover:shadow-xl hover:scale-105 transition-all mb-10 group"
                    >
                        <ArrowLeft className="w-4 h-4 text-primary group-hover:-translate-x-1 transition-transform" strokeWidth={3} />
                        <span className="text-[10px] font-bold tracking-[0.3em] text-text-primary font-mono italic">Back to Identity Verification</span>
                    </button>
                    
                    <h1 className="text-4xl font-black tracking-tight text-text-primary mb-4 italic font-mono ">
                        Credential <span className="text-primary">Recovery</span>
                    </h1>
                    <p className="text-[10px] font-bold text-text-muted tracking-[0.3em] font-mono leading-relaxed opacity-60">
                        Initialize password override protocol via secure email linkage
                    </p>
                </div>

                <Card className="p-10 shadow-2xl bg-surface-solid border-border rounded-[48px] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/[0.02] rounded-full translate-x-16 -translate-y-16" />
                    
                    <form onSubmit={handleSubmit} className="space-y-10 relative z-10">
                        <Input
                            label="Verification Identity (Email)"
                            type="email"
                            required
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="OPERATOR@TrackOwl.AI"
                            className="font-mono text-[13px] font-bold "
                            leftIcon={<Mail className="w-5 h-5 text-primary" strokeWidth={2.5} />}
                            autoFocus
                        />

                        {formError && (
                            <div className="flex items-start gap-4 p-5 rounded-2xl bg-rose-500/5 border border-rose-500/20 text-rose-500 text-[10px] font-bold font-mono italic">
                                <ShieldAlert className="w-5 h-5 shrink-0" strokeWidth={2.5} />
                                <p className="leading-relaxed">{formError}</p>
                            </div>
                        )}

                        <Button
                            type="submit"
                            disabled={submitting || !email.trim()}
                            className="w-full py-5 rounded-2xl text-[11px] font-mono font-bold tracking-[0.3em] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all italic"
                        >
                            {submitting ? 'Authenticating...' : 'Initialize Dispatch'}
                            <ArrowRight className="w-5 h-5 ml-4 group-hover:translate-x-1 transition-transform" strokeWidth={3} />
                        </Button>
                    </form>
                </Card>
                
                <p className="mt-12 text-center text-[9px] font-bold text-text-muted tracking-[0.3em] font-mono px-12 leading-relaxed opacity-40">
                    Security override links expire in 3600 seconds. <br/>
                    Verified operator access required.
                </p>
            </div>
        </div>
    );
}
