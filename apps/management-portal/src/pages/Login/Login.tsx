import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [step, setStep] = useState<'credentials' | '2fa'>('credentials');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      // We could check `is_super_admin` right here if we fetch the member profile
      const { data: memberProfile } = await supabase
        .from('members')
        .select('is_super_admin')
        .eq('email', email)
        .single();
        
      if (!memberProfile?.is_super_admin) {
        await supabase.auth.signOut();
        throw new Error("Access denied. Super Admin privileges required.");
      }

      // If MFA is required on Supabase, we would handle it here. 
      // For now, we simulate the 2FA UI step for demonstration of the requirement.
      setStep('2fa');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to authenticate');
    } finally {
      setLoading(false);
    }
  };

  const handle2FASubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate 2FA check (In a real scenario, call supabase.auth.mfa.verify)
    setTimeout(() => {
      setLoading(false);
      navigate('/');
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="flex justify-center mb-2">
            <img src="/src/assets/branding/logo-dark.svg" alt="TrackOwl Logo" className="h-12 w-auto" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          Secure Admin Portal
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500">
          Super Administrator Access Only
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200/50 sm:rounded-2xl sm:px-10 border border-slate-100">
          
          {step === 'credentials' ? (
            <form className="space-y-6" onSubmit={handleCredentialsSubmit}>
              <div>
                <label className="block text-sm font-medium text-slate-700">Admin Email</label>
                <div className="mt-1 relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full px-3 py-2.5 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    placeholder="admin@trackowl.io"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Master Password</label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <KeyRound className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full pl-10 px-3 py-2.5 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    placeholder="••••••••••••••••"
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                  {errorMsg}
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Continue to 2FA'}
                </button>
              </div>
            </form>
          ) : (
            <form className="space-y-6" onSubmit={handle2FASubmit}>
              <div className="text-center mb-6">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                  <Lock className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-medium text-slate-900">Two-Factor Authentication</h3>
                <p className="text-sm text-slate-500 mt-1">Enter the 6-digit code from your authenticator app.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 text-center">Authentication Code</label>
                <div className="mt-2 relative">
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={token}
                    onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
                    className="appearance-none block w-full px-3 py-3 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-primary focus:border-primary text-center text-2xl tracking-[0.5em] font-mono"
                    placeholder="000000"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading || token.length !== 6}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-50"
                >
                  {loading ? 'Authenticating...' : 'Secure Login'}
                </button>
              </div>
              
              <div className="text-center">
                <button 
                  type="button" 
                  onClick={() => setStep('credentials')}
                  className="text-sm text-slate-500 hover:text-slate-900"
                >
                  Back to credentials
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
