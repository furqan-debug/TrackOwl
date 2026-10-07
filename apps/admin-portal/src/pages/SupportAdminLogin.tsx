import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function SupportAdminLogin() {
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSecret = secret.trim();
    if (!cleanSecret) {
      setError('Please enter a valid access key');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: rpcError } = await supabase.rpc('admin_get_tickets', { secret: cleanSecret });
      if (rpcError) {
        throw rpcError;
      }
      localStorage.setItem('support_admin_token', cleanSecret);
      navigate('/support-admin/dashboard');
    } catch (err: any) {
      console.error('Support login error:', err);
      setError('Invalid access key or unauthorized');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="h-12 w-12 bg-blue-600 rounded-xl flex items-center justify-center">
            <Lock className="h-6 w-6 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Support Agent Portal
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Restricted access. Authorized personnel only.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-200">
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="secret" className="block text-sm font-medium text-gray-700">
                Agent Access Key
              </label>
              <div className="mt-1">
                <input
                  id="secret"
                  name="secret"
                  type="password"
                  required
                  disabled={loading}
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-50"
                  placeholder="Enter secret key..."
                />
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded-md">
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
