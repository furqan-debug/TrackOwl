import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Mail, Lock, User, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';
import { Input } from '../components/ui/Input';

import LogoIcon from '../assets/branding/3.svg';

export function Signup() {
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMsg(null);

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
                if (!authData.session) {
                    setSuccessMsg('A confirmation link has been sent to your email address. Please check your inbox and click the link to activate your account.');
                } else {
                    navigate('/onboarding');
                }
            }
        } catch (err: any) {
            setError(err.message || 'Signup failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleAuth = async () => {
        setLoading(true);
        setError(null);
        try {
            const { error: authError } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/dashboard`
                }
            });
            if (authError) throw authError;
        } catch (err: any) {
            setError(err.message || 'Google Authentication failed.');
            setLoading(false);
        }
    };

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
                    {successMsg ? (
                        <div className="text-center py-8 animate-in fade-in zoom-in-95 duration-500">
                            <div className="w-16 h-16 bg-green-500/10 rounded-xl flex items-center justify-center mx-auto mb-6 border border-green-500/20 text-green-500">
                                <Mail className="w-8 h-8" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 mb-3">Check your email</h3>
                            <p className="text-slate-500 text-sm font-medium leading-relaxed mb-6">{successMsg}</p>
                            <button 
                                onClick={() => navigate('/login')}
                                className="w-full h-12 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-md transition-all border-0 cursor-pointer"
                            >
                                Proceed to Login
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="mb-8">
                                <h1 className="text-3xl font-black text-[#001338] tracking-tight mb-2">Create workspace</h1>
                                <p className="text-slate-500 font-semibold text-sm">
                                    Set up your TrackOwl control console for free.
                                </p>
                            </div>

                            <div className="w-full">
                                <button
                                    type="button"
                                    onClick={handleGoogleAuth}
                                    disabled={loading}
                                    className="w-full h-14 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-3 active:scale-[0.98] mb-6 shadow-sm"
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 shrink-0">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                    </svg>
                                    <span>Sign up with Google</span>
                                </button>

                                <div className="flex items-center gap-3 mb-6">
                                    <div className="h-px bg-slate-200 flex-1"></div>
                                    <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">or sign up with email</span>
                                    <div className="h-px bg-slate-200 flex-1"></div>
                                </div>

                                <form onSubmit={handleSignup} className="space-y-5">
                                    <Input
                                        label="Full Name"
                                        type="text"
                                        required
                                        value={fullName}
                                        onChange={e => setFullName(e.target.value)}
                                        placeholder="Full Name"
                                        className="h-12 rounded-xl text-sm px-4 bg-slate-50/50 border-slate-200 focus:border-[#F7BC00]/40 focus:ring-[#F7BC00]/5 transition-all text-slate-900"
                                        leftIcon={<User className="w-4 h-4 text-slate-400" />}
                                    />

                                    <Input
                                        label="Work Email"
                                        type="email"
                                        required
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        placeholder="name@company.com"
                                        className="h-12 rounded-xl text-sm px-4 bg-slate-50/50 border-slate-200 focus:border-[#F7BC00]/40 focus:ring-[#F7BC00]/5 transition-all text-slate-900"
                                        leftIcon={<Mail className="w-4 h-4 text-slate-400" />}
                                    />

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500">Secure Password</label>
                                        <div className="relative">
                                            <Input
                                                type={showPw ? 'text' : 'password'}
                                                required
                                                value={password}
                                                onChange={e => setPassword(e.target.value)}
                                                placeholder="Minimum 8 characters"
                                                className="h-12 rounded-xl text-sm px-4 bg-slate-50/50 border-slate-200 pr-12 focus:border-[#F7BC00]/40 focus:ring-[#F7BC00]/5 transition-all text-slate-900"
                                                leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPw(!showPw)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                            >
                                                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    {error && (
                                        <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-550/5 border border-rose-500/20 text-rose-600 text-sm font-semibold animate-in zoom-in-95 duration-300">
                                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                            <p className="leading-relaxed">{error}</p>
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 border-0 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                                    >
                                        {loading ? 'Creating workspace...' : 'Create workspace'}
                                        {!loading && <ArrowRight className="w-4 h-4" />}
                                    </button>
                                </form>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer Link section */}
                <div className="text-center pt-8 border-t border-slate-100">
                    <p className="text-sm font-semibold text-slate-500">
                        Already have a workspace?{' '}
                        <span onClick={() => navigate('/login')} className="text-[#F7BC00] hover:text-[#e5af00] font-bold cursor-pointer transition-colors">
                            Sign in
                        </span>
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
                    <span className="text-[#F7BC00] text-xs font-bold uppercase tracking-widest block mb-4">Workspace Activation</span>
                    <h2 className="text-4xl font-black leading-[1.2] mb-4">
                        Unlock deep operational visibility.
                    </h2>
                    <p className="text-slate-300 font-medium text-base leading-relaxed">
                        Create your free TrackOwl workspace and build a culture of operational precision, accountability, and team performance.
                    </p>
                </div>
            </div>
        </div>
    );
}
