import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function Login() {
    const navigate = useNavigate();

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) navigate('/', { replace: true });
        });
    }, [navigate]);

    const brand = (
        <div className="inline-flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">D</span>
            </div>
            <span className="text-white text-xl font-bold tracking-tight">DigiReps</span>
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md space-y-6">
                <div className="text-center">
                    {brand}
                    <h1 className="text-2xl font-bold text-white">Sign in</h1>
                    <p className="text-blue-200/70 text-sm mt-1">
                        You have been logged out. Sign in again or reset your password.
                    </p>
                </div>

                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 space-y-4 shadow-2xl">
                    <Link
                        to="/"
                        className="block w-full bg-blue-500 hover:bg-blue-400 text-white font-semibold rounded-xl py-3 text-sm text-center transition-colors"
                    >
                        Go to dashboard
                    </Link>
                    <Link
                        to="/forgot-password"
                        className="block w-full text-center text-sm text-blue-300/80 hover:text-blue-300 transition-colors"
                    >
                        Forgot password?
                    </Link>
                </div>
            </div>
        </div>
    );
}
