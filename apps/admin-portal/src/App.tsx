import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { Dashboard } from './components/Dashboard';
import { Activity } from './pages/Activity';
import { Timesheets } from './pages/Timesheets';
import { Reports } from './pages/Reports';

import { DailyTotals } from './pages/DailyTotals';
import { AmountsOwed } from './pages/AmountsOwed';
import { PaymentsReport } from './pages/PaymentsReport';
import { People } from './pages/People';
import { Projects } from './pages/Projects';
import { Schedules } from './pages/Schedules';
import { UrlTracking } from './pages/UrlTracking';
import { Locations } from './pages/Locations';
import { JobSites } from './pages/JobSites';
import { Todos } from './pages/Todos';
import { Clients } from './pages/Clients';
import { Approvals } from './pages/Approvals';
import { AppUsage } from './pages/AppUsage';
import { SettingsPage } from './pages/Settings';
import { SecurityPage } from './pages/Security';
import { ProfilePage } from './pages/Profile';
import { Landing } from './pages/Landing';
import { Privacy } from './pages/Privacy';
import { Terms } from './pages/Terms';
import { SecurityPolicy } from './pages/SecurityPolicy';
import { About } from './pages/About';
import { Signup } from './pages/Signup';
import { Onboarding } from './pages/Onboarding';
import { AcceptInvite } from './pages/AcceptInvite';
import { Login } from './pages/Login';
import { ForgotPassword } from './pages/ForgotPassword';
import { UpdatePassword } from './pages/UpdatePassword';
import { MemberTimeline } from './pages/MemberTimeline';
import { Teams } from './pages/Teams';
import { ChangePlan } from './pages/ChangePlan';
import { Calendar } from './pages/Calendar';

import { ProjectFormPage } from './pages/ProjectFormPage';
import { MemberFormPage } from './pages/MemberFormPage';
import { Billing } from './pages/Billing';
import { Pricing } from './pages/Pricing';
import { MockCheckout } from './pages/MockCheckout';
import { PremiumRoute } from './components/access/PremiumRoute';

import { SupportAdminLogin } from './pages/SupportAdminLogin';
import { SupportAdminDashboard } from './pages/SupportAdminDashboard';
import { SupportWidget } from './components/SupportWidget';
import { SupportPage } from './pages/SupportPage';

import { FavoritesProvider } from './context/FavoritesContext';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function AuthRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;

    const params = new URLSearchParams(hash.replace(/^#/, ''));
    const type = params.get('type');
    const accessToken = params.get('access_token');
    const error = params.get('error');
    const errorCode = params.get('error_code');

    if (error || errorCode) {
      navigate(`/accept-invite${hash}`, { replace: true });
      return;
    }

    if (accessToken && type === 'invite') {
      navigate(`/accept-invite${hash}`, { replace: true });
    } else if (accessToken && type === 'recovery') {
      navigate(`/update-password${hash}`, { replace: true });
    } else if (accessToken) {
      // Fallback for OAuth logins (which don't have a type param) or general signups
      navigate(`/dashboard${hash}`, { replace: true });
    }
  }, []);

  return null;
}

function App() {
  return (
    <AuthProvider>
      <FavoritesProvider>
        <Router>
          <Routes>
            <Route path="/" element={<><AuthRedirect /><Landing /></>} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/security" element={<SecurityPolicy />} />
            <Route path="/about" element={<About />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/accept-invite" element={<AcceptInvite />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/update-password" element={<UpdatePassword />} />
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />

            {/* Support Agent Routes */}
            <Route path="/support-admin/login" element={<SupportAdminLogin />} />
            <Route path="/support-admin" element={<Navigate to="/support-admin/login" replace />} />
            <Route path="/support-admin/dashboard" element={<SupportAdminDashboard />} />

            {/* Public Help Center Support Page */}
            <Route path="/support/*" element={<SupportPage />} />
            <Route path="/help/*" element={<Navigate to="/support" replace />} />
            <Route path="/help" element={<Navigate to="/support" replace />} />

            <Route path="/dashboard/*" element={
              <ProtectedRoute>
                <AppShell>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/activity" element={<PremiumRoute><Activity /></PremiumRoute>} />
                    <Route path="/timesheets" element={<Timesheets />} />
                    <Route path="/reports" element={<PremiumRoute><Reports /></PremiumRoute>} />
                    <Route path="/people" element={<People />} />
                    <Route path="/people/:id/edit" element={<MemberFormPage />} />
                    <Route path="/projects" element={<Projects />} />
                    <Route path="/projects/new" element={<ProjectFormPage />} />
                    <Route path="/projects/:id/edit" element={<ProjectFormPage />} />
                    <Route path="/schedules" element={<Schedules />} />
                    <Route path="/url-tracking" element={<PremiumRoute><UrlTracking /></PremiumRoute>} />

                    <Route path="/member-timeline" element={<PremiumRoute><MemberTimeline /></PremiumRoute>} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/settings/security" element={<SecurityPage />} />
                    <Route path="/timesheets/approvals" element={<Approvals />} />
                    <Route path="/activity/apps" element={<PremiumRoute><AppUsage /></PremiumRoute>} />
                    <Route path="/locations" element={<Locations />} />
                    <Route path="/locations/job-sites" element={<JobSites />} />
                    <Route path="/projects/todos" element={<Todos />} />
                    <Route path="/projects/clients" element={<Clients />} />
                    <Route path="/calendar" element={<Calendar />} />

                    <Route path="/reports/daily" element={<PremiumRoute><DailyTotals /></PremiumRoute>} />
                    <Route path="/reports/owed" element={<PremiumRoute><AmountsOwed /></PremiumRoute>} />
                    <Route path="/reports/payments" element={<PremiumRoute><PaymentsReport /></PremiumRoute>} />

                    <Route path="/people/teams" element={<Teams />} />
                    <Route path="/settings/billing" element={<Billing />} />
                    <Route path="/settings/billing/change-plan" element={<ChangePlan />} />
                    <Route path="/pricing" element={<Pricing />} />
                    <Route path="/pricing/mock-checkout" element={<MockCheckout />} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </AppShell>
              </ProtectedRoute>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <SupportWidget />
        </Router>
      </FavoritesProvider>
    </AuthProvider>
  );
}

export default App;
