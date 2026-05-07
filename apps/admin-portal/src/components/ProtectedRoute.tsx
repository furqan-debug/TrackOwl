import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
    roles?: string[];
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
    const { profile, loading, session, signOut } = useAuth();
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

    // 3. Strictly block 'User' role from Admin Portal
    // If we have a profile and the role is 'User', they don't belong here.
    if (profile?.role === 'User') {
        return (
            <div className="min-h-screen bg-surface-hover flex items-center justify-center p-4">
                <div className="bg-surface rounded-2xl shadow-xl w-full max-w-md p-8 text-center border border-border">
                    <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="text-3xl">🚫</span>
                    </div>
                    <h1 className="text-xl font-bold text-text-main mb-2">Admin Portal Access Restricted</h1>
                    <p className="text-text-muted text-sm mb-8">
                        This portal is for Admins and Managers only. Please use the TrackOwl desktop app for tracking.
                    </p>
                    <button 
                        onClick={() => signOut()}
                        className="w-full bg-slate-900 text-white py-3 rounded-lg text-sm font-bold hover:bg-slate-800 transition-all"
                    >
                        Sign Out
                    </button>
                </div>
            </div>
        );
    }

    // 4. Force Onboarding IF profile exists but NO organization_id is assigned.
    if (profile && !profile.organization_id && location.pathname !== '/onboarding') {
        return <Navigate to="/onboarding" replace />;
    }

    // 5. Handle cases where profile is missing/null (Identity failure)
    // If no profile exists, we assume it's a new signup that needs onboarding.
    if (!profile && !loading) {
        if (location.pathname === '/onboarding') return <>{children}</>;
        return <Navigate to="/onboarding" replace />;
    }

    if (roles && profile && !roles.includes(profile.role)) {
        // Specific route role restriction
        return (
            <div className="min-h-screen bg-surface-hover flex items-center justify-center p-4">
                <div className="bg-surface rounded-2xl shadow-xl w-full max-w-md p-8 text-center border border-border">
                    <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="text-3xl">🚫</span>
                    </div>
                    <h1 className="text-xl font-bold text-text-main mb-2">Access Denied</h1>
                    <p className="text-text-muted text-sm mb-8">
                        You do not have permission to view this specific page.
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
