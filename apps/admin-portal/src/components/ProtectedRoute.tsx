import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AccessDenied } from '../components/AccessDenied';

interface ProtectedRouteProps {
    children: React.ReactNode;
    roles?: string[];
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
    const { profile, loading, session, signOut, aalLevel, nextAalLevel } = useAuth();
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

    if (session && aalLevel === 'aal1' && nextAalLevel === 'aal2') {
        // Redirect to login to complete MFA verification challenge
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // 3. Strictly block 'User' role from Admin Portal
    // If we have a profile and the role is 'User', they don't belong here.
    if (profile?.role === 'User') {
        return (
            <AccessDenied
              title="Admin Portal Access Restricted"
              message="This portal is for Admins and Managers only. Please use the TrackOwl desktop app for tracking."
              buttonLabel="Sign Out"
              onButtonClick={signOut}
            />
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
            <AccessDenied
              title="Access Denied"
              message="You do not have permission to view this specific page."
              buttonLabel="Go Back"
              onButtonClick={() => window.history.back()}
            />
        );
    }

    return <>{children}</>;
}
