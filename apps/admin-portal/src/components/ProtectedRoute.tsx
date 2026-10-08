import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AccessDenied } from '../components/AccessDenied';

interface ProtectedRouteProps {
    children: React.ReactNode;
    roles?: string[];
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
    const { profile, loading, session, aalLevel, nextAalLevel, error } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen bg-[#001338] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white/20 border-t-[#F7BC00] rounded-full animate-spin" />
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

    // 3. Force Onboarding IF profile exists but NO organization_id is assigned.
    if (profile && !profile.organization_id && location.pathname !== '/onboarding') {
        return <Navigate to="/onboarding" replace />;
    }

    // 5. No profile. There are two quite different reasons for that, and they
    //    must not be treated alike.
    if (!profile && !loading) {
        /**
         * The profile could not be fetched, rather than there being none.
         * AuthContext sets `error` only when the request itself failed — the
         * genuine "this email has no member row" path leaves it null — so it
         * is a reliable way to tell the two apart.
         *
         * Sending someone here to onboarding, which is what used to happen,
         * shows an existing customer a create-your-workspace form the moment
         * their connection drops. Fill it in and they get a second
         * organisation, with their real one still sitting there.
         */
        if (error) {
            return (
                <div className="min-h-screen bg-[#001338] flex items-center justify-center px-6">
                    <div className="max-w-sm text-center">
                        <h1 className="text-white text-lg font-bold mb-2">
                            Could not load your account
                        </h1>
                        <p className="text-white/60 text-[13px] mb-6">
                            We could not reach the server. Check your
                            connection and try again — nothing has been lost.
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="h-11 px-6 rounded-xl bg-[#F7BC00] text-[#001338] text-[13px] font-bold hover:brightness-110 active:scale-[0.98] transition-all"
                        >
                            Try again
                        </button>
                    </div>
                </div>
            );
        }

        // Genuinely no profile — a new signup that still needs a workspace.
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
