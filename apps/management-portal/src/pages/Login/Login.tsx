import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { KeyRound, Lock, AlertCircle, ArrowLeft, QrCode } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import logoLight from '../../assets/branding/logo-light.svg';

export function Login() {
  const navigate = useNavigate();
  const { session, loading: authLoading, isSuperAdmin, aalLevel, nextAalLevel, refreshAal, signOut } = useAuth();

  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // MFA states
  const [enrollData, setEnrollData] = useState<any>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [factors, setFactors] = useState<any[]>([]);


  // Determine active step reactive to auth state
  let step: 'credentials' | 'mfa-challenge' | 'mfa-enroll' = 'credentials';
  if (session && isSuperAdmin && aalLevel === 'aal1') {
    if (nextAalLevel === 'aal2') {
      step = 'mfa-challenge';
    } else {
      step = 'mfa-enroll';
    }
  }

  // Load factors for challenge
  useEffect(() => {
    if (step === 'mfa-challenge') {
      const getFactors = async () => {
        try {
          const { data, error } = await supabase.auth.mfa.listFactors();
          if (error) throw error;
          setFactors(data.all || []);
        } catch (err: any) {
          setErrorMsg(err.message || 'Failed to list authentication factors');
        }
      };
      getFactors();
    }
  }, [step]);

  // Start enrollment
  useEffect(() => {
    if (step === 'mfa-enroll' && !enrollData) {
      const startEnroll = async () => {
        try {
          // 1. List any existing factors
          const { data: factorList, error: listError } = await supabase.auth.mfa.listFactors();
          if (listError) throw listError;
          
          // 2. Unenroll all existing factors to clean up stalled/unverified factors
          if (factorList?.all && factorList.all.length > 0) {
            for (const factor of factorList.all) {
              await supabase.auth.mfa.unenroll({ factorId: factor.id });
            }
          }

          // 3. Enroll a fresh factor
          const { data, error } = await supabase.auth.mfa.enroll({
            factorType: 'totp',
            issuer: 'TrackOwl',
            friendlyName: 'Super Admin',
          });
          if (error) throw error;
          setEnrollData(data);
        } catch (err: any) {
          setErrorMsg(err.message || 'Failed to initialize MFA enrollment');
        }
      };
      startEnroll();
    }
  }, [step, enrollData]);

  // Clear errors when step changes
  useEffect(() => {
    setErrorMsg('');
    setMfaCode('');
  }, [step]);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: 'developer@digireps.co',
        password,
      });

      if (signInError) throw signInError;

      const { data: isSuperAdmin, error: rpcError } = await supabase.rpc('is_super_admin');
        
      if (rpcError) throw rpcError;
        
      if (!isSuperAdmin) throw new Error('Unauthorized');
      
      // The AuthContext will handle checking super admin status and AAL transitions.
      // We don't need to manually navigate yet; the reactive state will take care of rendering the next step.
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to authenticate');
      setLoading(false);
    }
  };

  const handleChallengeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mfaCode.length !== 6) {
      setErrorMsg('Verification code must be exactly 6 digits');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const totpFactor = factors.find((f) => f.factor_type === 'totp' && f.status === 'verified');
      if (!totpFactor) throw new Error('No verified authentication factor found');

      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id,
      });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challengeData.id,
        code: mfaCode,
      });
      if (verifyError) throw verifyError;

      const levels = await refreshAal();
      if (levels?.currentLevel !== 'aal2') {
        throw new Error('Verification completed but assurance level is insufficient');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mfaCode.length !== 6) {
      setErrorMsg('Verification code must be exactly 6 digits');
      return;
    }
    if (!enrollData?.id) {
      setErrorMsg('Enrollment data is not initialized. Please try again.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: enrollData.id,
      });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: enrollData.id,
        challengeId: challengeData.id,
        code: mfaCode,
      });
      if (verifyError) throw verifyError;

      const levels = await refreshAal();
      if (levels?.currentLevel !== 'aal2') {
        throw new Error('Enrollment verified but assurance level is insufficient');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid code. Check your authenticator app and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelMfa = async () => {
    setErrorMsg('');
    setEnrollData(null);
    setMfaCode('');
    await signOut();
  };

  // Automatically redirect if fully logged in and verified
  if (!authLoading && session && isSuperAdmin && aalLevel === 'aal2') {
    return <Navigate to="/" replace />;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-2">
          <img src={logoLight} alt="TrackOwl Logo" className="h-12 w-auto" />
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
          
          {step === 'credentials' && (
            <form className="space-y-6" onSubmit={handleCredentialsSubmit}>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Cryptographic Access Key
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <KeyRound className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full pl-10 px-3 py-2.5 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-slate-900 focus:border-slate-900 sm:text-sm"
                    placeholder="••••••••••••••••"
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3 flex gap-2 items-start">
                  <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Secure Login'}
                </button>
              </div>
            </form>
          )}

          {step === 'mfa-challenge' && (
            <form className="space-y-6" onSubmit={handleChallengeSubmit}>
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-slate-100 text-slate-900 mb-4">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-medium text-slate-900">Two-Factor Authentication</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Enter the 6-digit verification code from your authenticator application.
                </p>
              </div>

              <div>
                <input
                  type="text"
                  required
                  maxLength={6}
                  pattern="[0-9]*"
                  inputMode="numeric"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  className="block w-full text-center text-2xl tracking-[0.75em] font-mono py-2.5 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-slate-900 focus:border-slate-900"
                  placeholder="000000"
                />
              </div>

              {errorMsg && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3 flex gap-2 items-start">
                  <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={loading || mfaCode.length !== 6}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Verify & Continue'}
                </button>

                <button
                  type="button"
                  onClick={handleCancelMfa}
                  className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-slate-200 rounded-lg shadow-sm text-sm font-medium text-slate-600 hover:bg-slate-50 focus:outline-none transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Login
                </button>
              </div>
            </form>
          )}

          {step === 'mfa-enroll' && (
            <form className="space-y-6" onSubmit={handleEnrollSubmit}>
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-slate-100 text-slate-900 mb-4">
                  <QrCode className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-medium text-slate-900">Set Up 2FA</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Scan this QR code with Google Authenticator or Microsoft Authenticator to configure 2-factor authentication.
                </p>
              </div>

              {enrollData ? (
                <div className="flex flex-col items-center gap-4 py-2">
                  <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-inner flex justify-center items-center">
                    <img
                      src={enrollData.totp.qr_code}
                      alt="TOTP QR Code"
                      className="w-44 h-44"
                    />
                  </div>
                  
                  <div className="w-full text-left">
                    <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Manual Setup Key
                    </span>
                    <code className="block w-full p-2 bg-slate-50 border border-slate-200 rounded-md text-xs font-mono select-all text-center text-slate-700 font-bold break-all">
                      {enrollData.totp.secret}
                    </code>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mb-2"></div>
                  <span className="text-xs text-slate-400">Loading QR Code...</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5 text-center">
                  Verification Code
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  pattern="[0-9]*"
                  inputMode="numeric"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  className="block w-full text-center text-2xl tracking-[0.75em] font-mono py-2.5 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-slate-900 focus:border-slate-900"
                  placeholder="000000"
                />
              </div>

              {errorMsg && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3 flex gap-2 items-start">
                  <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={loading || mfaCode.length !== 6 || !enrollData}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Verify & Enable 2FA'}
                </button>

                <button
                  type="button"
                  onClick={handleCancelMfa}
                  className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-slate-200 rounded-lg shadow-sm text-sm font-medium text-slate-600 hover:bg-slate-50 focus:outline-none transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Cancel Setup
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}

