import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { PremiumRoute } from './components/access/PremiumRoute';
import { RepRoute } from './components/access/RepRoute';
import { ProtectedRoute } from './components/ProtectedRoute';
import { FavoritesProvider } from './context/FavoritesContext';
import { AuthProvider } from './context/AuthContext';
import { OfflineBanner, LoadingState, ErrorBoundary } from './components/ui';
import { useEffect, lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const lazyPage = <T extends Record<string, any>>(
  importer: () => Promise<T>,
  namedExport: keyof T
) =>
  lazy(async () => {
    try {
      const mod = await importer();
      const component = (mod[namedExport] ?? mod.default) as React.ComponentType<any>;
      return { default: component };
    } catch (error) {
      const storageKey = 'vite_chunk_reload_attempt';
      const lastReload = sessionStorage.getItem(storageKey);
      if (!lastReload || Date.now() - Number(lastReload) > 10000) {
        sessionStorage.setItem(storageKey, String(Date.now()));
        window.location.reload();
      }
      throw error;
    }
  });

// Lazy loaded page components
const Dashboard = lazyPage(() => import('./components/Dashboard'), 'Dashboard');
const Activity = lazyPage(() => import('./pages/Activity'), 'Activity');
const Timesheets = lazyPage(() => import('./pages/Timesheets'), 'Timesheets');
const Reports = lazyPage(() => import('./pages/Reports'), 'Reports');
const DailyTotals = lazyPage(() => import('./pages/DailyTotals'), 'DailyTotals');
const AmountsOwed = lazyPage(() => import('./pages/AmountsOwed'), 'AmountsOwed');
const PaymentsReport = lazyPage(() => import('./pages/PaymentsReport'), 'PaymentsReport');
const People = lazyPage(() => import('./pages/People'), 'People');
const Projects = lazyPage(() => import('./pages/Projects'), 'Projects');
const Schedules = lazyPage(() => import('./pages/Schedules'), 'Schedules');
const UrlTracking = lazyPage(() => import('./pages/UrlTracking'), 'UrlTracking');
const Locations = lazyPage(() => import('./pages/Locations'), 'Locations');
const JobSites = lazyPage(() => import('./pages/JobSites'), 'JobSites');
const Todos = lazyPage(() => import('./pages/Todos'), 'Todos');
const Clients = lazyPage(() => import('./pages/Clients'), 'Clients');
const Approvals = lazyPage(() => import('./pages/Approvals'), 'Approvals');
const AppUsage = lazyPage(() => import('./pages/AppUsage'), 'AppUsage');
const ActivityBlocks = lazyPage(() => import('./pages/ActivityBlocks'), 'ActivityBlocks');
const SettingsPage = lazyPage(() => import('./pages/Settings'), 'SettingsPage');
const SecurityPage = lazyPage(() => import('./pages/Security'), 'SecurityPage');
const ProfilePage = lazyPage(() => import('./pages/Profile'), 'ProfilePage');
const Landing = lazyPage(() => import('./pages/Landing'), 'Landing');
const Privacy = lazyPage(() => import('./pages/Privacy'), 'Privacy');
const Terms = lazyPage(() => import('./pages/Terms'), 'Terms');
const SecurityPolicy = lazyPage(() => import('./pages/SecurityPolicy'), 'SecurityPolicy');
const About = lazyPage(() => import('./pages/About'), 'About');
const Signup = lazyPage(() => import('./pages/Signup'), 'Signup');
const Onboarding = lazyPage(() => import('./pages/Onboarding'), 'Onboarding');
const AcceptInvite = lazyPage(() => import('./pages/AcceptInvite'), 'AcceptInvite');
const Login = lazyPage(() => import('./pages/Login'), 'Login');
const ForgotPassword = lazyPage(() => import('./pages/ForgotPassword'), 'ForgotPassword');
const UpdatePassword = lazyPage(() => import('./pages/UpdatePassword'), 'UpdatePassword');
const MemberTimeline = lazyPage(() => import('./pages/MemberTimeline'), 'MemberTimeline');
const Teams = lazyPage(() => import('./pages/Teams'), 'Teams');
const ChangePlan = lazyPage(() => import('./pages/ChangePlan'), 'ChangePlan');
const Calendar = lazyPage(() => import('./pages/Calendar'), 'Calendar');
const ProjectFormPage = lazyPage(() => import('./pages/ProjectFormPage'), 'ProjectFormPage');
const MemberFormPage = lazyPage(() => import('./pages/MemberFormPage'), 'MemberFormPage');
const Billing = lazyPage(() => import('./pages/Billing'), 'Billing');
const Pricing = lazyPage(() => import('./pages/Pricing'), 'Pricing');
const MockCheckout = lazyPage(() => import('./pages/MockCheckout'), 'MockCheckout');
const SupportAdminLogin = lazyPage(() => import('./pages/SupportAdminLogin'), 'SupportAdminLogin');
const SupportAdminDashboard = lazyPage(() => import('./pages/SupportAdminDashboard'), 'SupportAdminDashboard');
const SupportPage = lazyPage(() => import('./pages/SupportPage'), 'SupportPage');
const SupportWidget = lazyPage(() => import('./components/SupportWidget'), 'SupportWidget');

function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center p-8 min-h-[350px]">
      <LoadingState message="Loading..." className="min-h-0" />
    </div>
  );
}

function FullScreenLoader() {
  return (
    <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-6">
      <LoadingState message="Loading..." />
    </div>
  );
}


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

/**
 * Routing keeps the window's scroll position across navigations, so following a
 * link from halfway down one page dropped you halfway down the next. Reset to
 * the top on every path change, while still honouring in-page #anchors.
 */
function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const target = document.getElementById(hash.slice(1));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <FavoritesProvider>
          <Router>
            <ScrollToTop />
            {/* Once, at the root, so every page is covered — including sign-in
                and onboarding, which a visitor can reach before anything else
                has loaded. */}
            <OfflineBanner />
            <Suspense fallback={<FullScreenLoader />}>
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
                      <Suspense fallback={<PageLoader />}>
                        <Routes>
                          <Route path="/" element={<Dashboard />} />

                          {/* ── Pages open to all roles (data scoped per role) ─────── */}
                          <Route path="/timesheets" element={<Timesheets />} />
                          <Route path="/activity" element={<PremiumRoute><Activity /></PremiumRoute>} />
                          <Route path="/activity/apps" element={<PremiumRoute><AppUsage /></PremiumRoute>} />
                          <Route path="/activity/blocks" element={<PremiumRoute><ActivityBlocks /></PremiumRoute>} />
                          <Route path="/calendar" element={<Calendar />} />
                          <Route path="/profile" element={<ProfilePage />} />
                          <Route path="/settings/security" element={<SecurityPage />} />
                          <Route path="/reports" element={<PremiumRoute><Reports /></PremiumRoute>} />
                          <Route path="/reports/daily" element={<PremiumRoute><DailyTotals /></PremiumRoute>} />
                          <Route path="/pricing" element={<Pricing />} />
                          <Route path="/pricing/mock-checkout" element={<MockCheckout />} />

                          {/* ── Admin-only pages (User role sees RepRoute AccessDenied) */}
                          <Route path="/people" element={<RepRoute><People /></RepRoute>} />
                          <Route path="/people/:id/edit" element={<RepRoute><MemberFormPage /></RepRoute>} />
                          <Route path="/people/teams" element={<RepRoute><Teams /></RepRoute>} />
                          <Route path="/timesheets/approvals" element={<RepRoute><Approvals /></RepRoute>} />
                          <Route path="/schedules" element={<RepRoute><Schedules /></RepRoute>} />
                          <Route path="/locations" element={<RepRoute><Locations /></RepRoute>} />
                          <Route path="/locations/job-sites" element={<RepRoute><JobSites /></RepRoute>} />
                          <Route path="/projects" element={<RepRoute><Projects /></RepRoute>} />
                          <Route path="/projects/todos" element={<RepRoute><Todos /></RepRoute>} />
                          <Route path="/projects/clients" element={<RepRoute><Clients /></RepRoute>} />
                          <Route path="/projects/new" element={<RepRoute><ProjectFormPage /></RepRoute>} />
                          <Route path="/projects/:id/edit" element={<RepRoute><ProjectFormPage /></RepRoute>} />
                          <Route path="/settings" element={<RepRoute><SettingsPage /></RepRoute>} />
                          <Route path="/settings/billing" element={<RepRoute><Billing /></RepRoute>} />
                          <Route path="/settings/billing/change-plan" element={<RepRoute><ChangePlan /></RepRoute>} />
                          <Route path="/member-timeline" element={<RepRoute><PremiumRoute><MemberTimeline /></PremiumRoute></RepRoute>} />
                          <Route path="/url-tracking" element={<RepRoute><PremiumRoute><UrlTracking /></PremiumRoute></RepRoute>} />
                          <Route path="/reports/owed" element={<RepRoute><PremiumRoute><AmountsOwed /></PremiumRoute></RepRoute>} />
                          <Route path="/reports/payments" element={<RepRoute><PremiumRoute><PaymentsReport /></PremiumRoute></RepRoute>} />

                          <Route path="*" element={<Navigate to="/dashboard" replace />} />
                        </Routes>
                      </Suspense>
                    </AppShell>
                  </ProtectedRoute>
                } />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
            <Suspense fallback={null}>
              <SupportWidget />
            </Suspense>
          </Router>
        </FavoritesProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
