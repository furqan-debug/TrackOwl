import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Shield } from 'lucide-react';

interface RepRouteProps {
    children: React.ReactNode;
}

/**
 * RepRoute — blocks User-role (rep/employee) accounts from admin-only pages.
 *
 * Wrap any route that should be inaccessible to regular employees.
 * Does NOT block Owner, Admin, Manager, Viewer, or Client roles.
 *
 * Usage in App.tsx:
 *   <Route path="/people" element={<RepRoute><People /></RepRoute>} />
 */
export function RepRoute({ children }: RepRouteProps) {
    const { profile, isRep } = useAuth();
    const navigate = useNavigate();

    if (!isRep) return <>{children}</>;

    // Personalise the message with the member's first name if available
    const firstName = (() => {
        const name = profile?.full_name || '';
        if (name.includes('@')) return name.split('@')[0];
        return name.split(' ')[0] || 'there';
    })();

    return (
        <div className="min-h-[calc(100vh-120px)] flex items-center justify-center p-6">
            <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
                <div className="w-14 h-14 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-5">
                    <Shield className="w-6 h-6 text-accent" />
                </div>
                <h2 className="text-xl font-bold text-text-main mb-2">
                    Admin-only area
                </h2>
                <p className="text-sm text-text-muted mb-6 leading-relaxed">
                    Hi {firstName} — this section is for account administrators.
                    Your personal activity, timesheets, and reports are available
                    in the navigation on the left.
                </p>
                <button
                    onClick={() => navigate('/dashboard')}
                    className="w-full px-4 py-2.5 bg-accent hover:bg-accent/90 text-white font-semibold text-sm rounded-xl transition-colors"
                >
                    Go to My Dashboard
                </button>
            </div>
        </div>
    );
}
