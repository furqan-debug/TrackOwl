import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
    Mail, Lock, Eye, EyeOff,
    ArrowRight, AlertCircle
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import LogoIcon from '../assets/branding/icon.png';

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

            navigate('/dashboard', { replace: true });
        } catch (err: any) {
            setError(err.message || 'Authentication failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F9FAFB] flex flex-col items-center">

            {/* Header */}
            <div className="w-full max-w-[1200px] px-8 py-8 flex items-center justify-between animate-in fade-in duration-700">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
                    <div className="w-12 h-12 flex items-center justify-center overflow-hidden">
                        <img src={LogoIcon} alt="Trackora" className="w-full h-full object-contain" />
                    </div>
                    <span className="text-lg font-bold text-slate-900 tracking-tight">Trackora</span>
                </div>
                <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] bg-white px-4 py-2 rounded-full border border-slate-200">
                    Secure Gateway
                </div>
            </div>

            <div className="flex-1 w-full max-w-[1210px] flex items-center justify-center p-8">
                <div className="w-full max-w-[480px]">
                    <div className="mb-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <h1 className="text-5xl font-black text-slate-900 tracking-tight leading-none mb-4">Welcome Back</h1>
                        <p className="text-slate-500 font-medium text-lg leading-relaxed max-w-[340px] mx-auto">
                            Sign in to the <span className="text-blue-600 font-bold underline decoration-blue-600/30 underline-offset-4">Control Console</span> to manage your workspace.
                        </p>
                    </div>

                    <Card className="p-8 md:p-12 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)] bg-white border-slate-200 rounded-[40px] animate-in fade-in slide-in-from-bottom-8 duration-1000">
                        <form onSubmit={handleLogin} className="space-y-8">
                            <Input
                                label="Admin Email"
                                type="email"
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="name@company.com"
                                className="h-14 rounded-2xl text-base px-5 bg-slate-50/50"
                                leftIcon={<Mail className="w-5 h-5 text-slate-300" />}
                            />

                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Password</label>
                                    <Link to="/forgot-password" title="Forgot Password" className="text-[10px] font-bold text-blue-600 hover:text-black uppercase tracking-widest transition-colors">Recovery Required?</Link>
                                </div>
                                <div className="relative">
                                    <Input
                                        type={showPw ? 'text' : 'password'}
                                        required
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder="••••••••••••"
                                        className="h-14 rounded-2xl text-base px-5 bg-slate-50/50 pr-14"
                                        leftIcon={<Lock className="w-5 h-5 text-slate-300" />}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPw(!showPw)}
                                        className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-blue-600 transition-colors"
                                    >
                                        {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            {error && (
                                <div className="flex items-start gap-4 p-5 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm font-semibold animate-in zoom-in-95 duration-300">
                                    <AlertCircle className="w-5 h-5 shrink-0" />
                                    <p className="leading-relaxed">{error}</p>
                                </div>
                            )}

                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full py-6 bg-slate-900 hover:bg-blue-600 shadow-2xl shadow-slate-900/10 rounded-2xl font-bold group text-white border-0 transition-all duration-300"
                            >
                                {loading ? 'Authorizing...' : 'Enter Dashboard'}
                                {!loading && <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-2 transition-transform" />}
                            </Button>
                        </form>

                        <div className="mt-12 pt-8 border-t border-slate-100 text-center">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Unregistered Operator?</p>
                            <Button
                                onClick={() => navigate('/signup')}
                                variant="secondary"
                                className="w-full py-4 rounded-xl text-sm font-bold border-slate-100 hover:bg-slate-50 text-slate-600"
                            >
                                Activate New Workspace
                            </Button>
                        </div>
                    </Card>

                    <p className="mt-12 text-center text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] opacity-60 leading-relaxed max-w-[340px] mx-auto">
                        Authentication provided by <span className="text-slate-900">Trackora Guard Pro</span>. Site integrity verified 2026.
                    </p>
                </div>
            </div>
        </div>
    );
}
