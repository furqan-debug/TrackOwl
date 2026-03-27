import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
    Mail, Lock, Eye, EyeOff, 
    ArrowRight, AlertCircle, Activity
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';

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

            // Navigation handled by onAuthStateChange in AuthContext, 
            // but we'll manually push just in case
            navigate('/dashboard', { replace: true });
        } catch (err: any) {
            setError(err.message || 'Failed to sign in. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="w-full max-w-[440px] animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="mb-8 text-center">
                    <div className="inline-flex items-center gap-3 mb-6 bg-white p-2 px-4 rounded-2xl shadow-sm border border-slate-200">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                             <Activity className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-lg font-bold text-slate-900 tracking-tight">Trackora</span>
                    </div>
                    
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome Back</h1>
                    <p className="text-slate-500 text-sm">Sign in to manage your organization.</p>
                </div>

                <Card className="p-8 shadow-xl bg-white border-slate-200 rounded-3xl">
                    <form onSubmit={handleLogin} className="space-y-6">
                        <Input
                            label="Email Address"
                            type="email"
                            required
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="name@company.com"
                            leftIcon={<Mail className="w-5 h-5 text-slate-400" />}
                        />

                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between px-1">
                                <label className="text-sm font-medium text-slate-700">Password</label>
                                <Link to="/forgot-password" title="Forgot Password" className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">Forgot Password?</Link>
                            </div>
                            <div className="relative">
                                <Input
                                    type={showPw ? 'text' : 'password'}
                                    required
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••••••"
                                    className="pr-12"
                                    leftIcon={<Lock className="w-5 h-5 text-slate-400" />}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPw(!showPw)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                                >
                                    {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                <p>{error}</p>
                            </div>
                        )}

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 rounded-xl font-bold group"
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                        </Button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                        <p className="text-sm text-slate-500 mb-4">New to Trackora?</p>
                        <Button 
                            onClick={() => navigate('/signup')}
                            variant="secondary"
                            className="w-full py-3 rounded-xl text-sm font-semibold border-slate-200 hover:bg-slate-50"
                        >
                            Create Account
                        </Button>
                    </div>
                </Card>

                <p className="mt-8 text-center text-xs text-slate-400 px-8 leading-relaxed">
                    Secure access powered by Trackora Guard.
                </p>
            </div>
        </div>
    );
}
