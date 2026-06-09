import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Sidebar } from './components/Layout/Sidebar';
import { Header } from './components/Layout/Header';
import { Login } from './pages/Login/Login';
import { Dashboard } from './pages/Dashboard/Dashboard';
import { OrganizationsList } from './pages/Organizations/OrganizationsList';
import { OrganizationDetails } from './pages/Organizations/OrganizationDetails';
import { BillingOverview } from './pages/Billing/BillingOverview';
import { UserAnalytics } from './pages/Analytics/UserAnalytics';
import { PlatformMonitoring } from './pages/Platform/PlatformMonitoring';
import { SupportTickets } from './pages/Support/SupportTickets';

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function App() {
  // In a real app, this would be tied to Supabase Auth state and check for super_admin role
  const isAuthenticated = true; 

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route 
          path="/" 
          element={isAuthenticated ? <AppLayout /> : <Navigate to="/login" replace />}
        >
          <Route index element={<Dashboard />} />
          <Route path="organizations" element={<OrganizationsList />} />
          <Route path="organizations/:id" element={<OrganizationDetails />} />
          <Route path="billing" element={<BillingOverview />} />
          <Route path="analytics" element={<UserAnalytics />} />
          <Route path="platform" element={<PlatformMonitoring />} />
          <Route path="support" element={<SupportTickets />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
