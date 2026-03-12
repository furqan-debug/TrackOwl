import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Mail, Lock, User, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';

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
            // 1. Sign up user in Supabase Auth
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
                // 2. detecting if user was already invited (pre-registered in members)
                const { data: existingMember } = await supabase
                    .from('members')
                    .select('id, role')
                    .eq('email', email)
                    .single();

                const { error: profileError } = await supabase
                    .from('members')
                    .upsert({
                        ...(existingMember ? { id: existingMember.id } : {}),
                        email,
                        full_name: fullName,
                        role: existingMember?.role || 'Admin', // Keep invited role or default to Admin
                        status: 'Pending'
                    });

                if (profileError) {
                    console.error('Profile update error:', profileError);
                }

                // 3. Move to onboarding
                navigate('/onboarding', { state: { plan: selectedPlan } });
            }
        } catch (err: any) {
            setError(err.message || 'Signup failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const brand = (
        <div 
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2.5 mb-8 cursor-pointer"
        >
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">D</span>
            </div>
            <span className="text-slate-900 text-2xl font-bold tracking-tight text-left">DigiReps</span>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
            {/* Left Side: Illustration / Info */}
            <div className="hidden md:flex md:w-1/2 bg-slate-900 p-12 flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 blur-[120px] rounded-full" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-slate-600/10 blur-[100px] rounded-full" />
                
                <div className="relative z-10">
                   <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center mb-12">
                        <span className="text-white font-bold text-xl">D</span>
                    </div>
                    <h2 className="text-4xl font-bold text-white mb-6 leading-tight">
                        Start managing your<br />remote team like a pro.
                    </h2>
                    <p className="text-slate-400 text-lg mb-8 max-w-md">
                        Join thousands of companies who build trust and productivity with DigiReps.
                    </p>
                </div>

                <div className="relative z-10 bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm max-w-sm">
                    <div className="flex items-center gap-1 mb-3">
                        {[1, 2, 3, 4, 5].map(i => (
                            <span key={i} className="text-yellow-400 text-lg">★</span>
                        ))}
                    </div>
                    <p className="text-slate-300 text-sm italic mb-4">
                        "DigiReps has completely changed how we handle our distributed team. The level of insight is unprecedented."
                    </p>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-white">JD</div>
                        <div>
                            <p className="text-white text-xs font-bold">John Doe</p>
                            <p className="text-slate-500 text-[10px]">CEO at TechScale</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side: Form */}
            <div className="flex-1 flex items-center justify-center p-6 md:p-12">
                <div className="w-full max-w-md">
                    <div className="md:hidden flex justify-center">{brand}</div>
                    
                    <div className="mb-10 text-center md:text-left">
                        <h1 className="text-3xl font-bold text-slate-900 mb-2">Create your account</h1>
                        <p className="text-slate-500 text-sm">
                            You've selected the <span className="font-bold text-blue-600 underline decoration-blue-200 decoration-2 underline-offset-4">{selectedPlan}</span> plan.
                        </p>
                    </div>

                    <form onSubmit={handleSignup} className="space-y-5">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                    Full Name
                                </label>
                                <div className="relative group">
                                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                                    <input
                                        type="text"
                                        required
                                        value={fullName}
                                        onChange={e => setFullName(e.target.value)}
                                        placeholder="Enter your name"
                                        className="w-full bg-white border border-slate-200 rounded-xl px-10 py-3 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all shadow-sm"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                    Work Email
                                </label>
                                <div className="relative group">
                                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        placeholder="name@company.com"
                                        className="w-full bg-white border border-slate-200 rounded-xl px-10 py-3 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all shadow-sm"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                    Password
                                </label>
                                <div className="relative group">
                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                                    <input
                                        type={showPw ? 'text' : 'password'}
                                        required
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder="Create a strong password"
                                        className="w-full bg-white border border-slate-200 rounded-xl px-10 py-3 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all shadow-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPw(!showPw)}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 bg-rose-50 border border-rose-100 text-rose-600 text-xs px-4 py-3 rounded-xl animate-in fade-in slide-in-from-top-1">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl py-4 text-sm transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                        >
                            {loading ? 'Creating account...' : (
                                <>
                                    Complete Signup
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-8 border-t border-slate-100 flex flex-col items-center gap-4">
                        <p className="text-center text-sm text-slate-500">
                            Already have an account?{' '}
                            <Link to="/login" className="font-bold text-blue-600 hover:text-blue-700 transition-colors">
                                Sign in
                            </Link>
                        </p>
                        <p className="text-[11px] text-slate-400 text-center leading-relaxed max-w-xs">
                            By signing up, you agree to our <a href="#" className="underline">Terms of Service</a> and <a href="#" className="underline">Privacy Policy</a>.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
