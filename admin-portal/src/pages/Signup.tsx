import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Mail, Lock, User, Eye, EyeOff, AlertCircle, ArrowRight, Activity } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';

export function Signup() {
    const navigate = useNavigate();
    const location = useLocation();
    const selectedPlan = location.state?.plan || 'Starter';

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                    }
                }
            });

            if (authError) throw authError;

            if (authData.user) {
                navigate('/onboarding', { state: { plan: selectedPlan } });
            }
        } catch (err: any) {
            setError(err.message || 'Signup failed. Please try again.');
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
                    
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Create Your Account</h1>
                    <p className="text-slate-500 text-sm">Join Trackora and start tracking your team efficiently.</p>
                </div>

                <Card className="p-8 shadow-xl bg-white border-slate-200 rounded-3xl">
                    <form onSubmit={handleSignup} className="space-y-6">
                        <Input
                            label="Full Name"
                            type="text"
                            required
                            value={fullName}
                            onChange={e => setFullName(e.target.value)}
                            placeholder="John Doe"
                            leftIcon={<User className="w-5 h-5 text-slate-400" />}
                        />

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
                            <label className="text-sm font-medium text-slate-700 ml-1">Password</label>
                            <div className="relative">
                                <Input
                                    type={showPw ? 'text' : 'password'}
                                    required
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="Create a strong password"
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
                            {loading ? 'Creating account...' : 'Get Started'}
                            <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                        </Button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                        <p className="text-sm text-slate-500 mb-4">Already have an account?</p>
                        <Button 
                            onClick={() => navigate('/login')}
                            variant="secondary"
                            className="w-full py-3 rounded-xl text-sm font-semibold border-slate-200 hover:bg-slate-50"
                        >
                            Sign In
                        </Button>
                    </div>
                </Card>

                <p className="mt-8 text-center text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                    By signing up, you agree to our Terms of Service and Privacy Policy.
                </p>
            </div>
        </div>
    );
}
