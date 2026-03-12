import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
    roles?: string[];
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
    const { profile, loading, session } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
            </div>
        );
    }

    if (!session) {
        // Redirect to login but save the current location
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // New: If user is Pending, they MUST go to onboarding (unless already there)
    if (profile?.status === 'Pending' && location.pathname !== '/onboarding') {
        return <Navigate to="/onboarding" replace />;
    }

    // If user is Active but trying to go to onboarding, send them to dashboard
    if (profile?.status === 'Active' && location.pathname === '/onboarding') {
        return <Navigate to="/dashboard" replace />;
    }

    if (roles && profile && !roles.includes(profile.role)) {
        // Role not authorized
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center border border-slate-100">
                    <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="text-3xl">🚫</span>
                    </div>
                    <h1 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h1>
                    <p className="text-slate-500 text-sm mb-8">
                        You do not have permission to view this page. Please contact your administrator if you believe this is an error.
                    </p>
                    <button 
                        onClick={() => window.history.back()}
                        className="w-full bg-slate-900 text-white py-3 rounded-lg text-sm font-bold hover:bg-slate-800 transition-all"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
