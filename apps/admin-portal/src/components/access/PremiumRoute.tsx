import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LoadingState } from '../ui';

interface PremiumRouteProps {
    children: React.ReactNode;
    /** Where to redirect Basic/locked users. Defaults to /dashboard/pricing */
    redirectTo?: string;
}

/**
 * PremiumRoute — route-level hard redirect guard.
 *
 * Unlike PremiumGate (which shows a blur overlay in-place), this component
 * performs a full Navigate redirect so that Basic plan users who type a
 * premium URL directly are always bounced to the Pricing page.
 *
 * Usage in App.tsx:
 *   <Route path="activity" element={<PremiumRoute><Activity /></PremiumRoute>} />
 */
export function PremiumRoute({ children, redirectTo = '/dashboard/pricing' }: PremiumRouteProps) {
    const { isPremium, loading } = useAuth();

    // Don't make a decision until auth has resolved
    if (loading) return <LoadingState />;

    // Hard redirect for non-premium orgs
    if (!isPremium) {
        return <Navigate to={redirectTo} replace />;
    }

    return <>{children}</>;
}
