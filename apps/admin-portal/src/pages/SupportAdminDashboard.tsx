import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Inbox, Clock, CheckCircle, Search, Filter } from 'lucide-react';

export function SupportAdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('open');

  useEffect(() => {
    const token = localStorage.getItem('support_admin_token');
    if (token !== 'authorized') {
      navigate('/support-admin');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('support_admin_token');
    navigate('/support-admin');
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">Support Center</h2>
          <p className="text-sm text-gray-500">Agent Dashboard</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button 
            onClick={() => setActiveTab('open')}
            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg transition-colors ${activeTab === 'open' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
          >
            <div className="flex items-center space-x-3">
              <Inbox className="w-5 h-5" />
              <span>Open Tickets</span>
            </div>
            <span className="bg-blue-100 text-blue-700 py-0.5 px-2 rounded-full text-xs">12</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('progress')}
            className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-colors ${activeTab === 'progress' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
          >
            <Clock className="w-5 h-5" />
            <span>In Progress</span>
          </button>

          <button 
            onClick={() => setActiveTab('resolved')}
            className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-colors ${activeTab === 'resolved' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
          >
            <CheckCircle className="w-5 h-5" />
            <span>Resolved</span>
          </button>
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search tickets, users, or organizations..." 
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex items-center space-x-4">
            <button className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 px-3 py-2 rounded-lg border border-gray-200 transition-colors">
              <Filter className="w-4 h-4" />
              <span>Filter</span>
            </button>
          </div>
        </header>

        {/* Ticket List Area */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-8 text-center">
              <div className="mx-auto w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <Inbox className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">No tickets found</h3>
              <p className="mt-1 text-gray-500">There are no {activeTab} tickets at the moment.</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
