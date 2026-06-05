import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Inbox, Clock, CheckCircle, Search, Filter, MessageCircle, Send, User } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Ticket {
  id: string;
  status: string;
  subject: string;
  message?: string;
  created_at: string;
  updated_at: string;
  user_id?: string;
  organization_name?: string;
}

interface Message {
  id: string;
  ticket_id: string;
  sender_id?: string;
  is_ai: boolean;
  is_admin: boolean;
  message: string;
  created_at: string;
}

export function SupportAdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Open');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const secret = localStorage.getItem('support_admin_token') === 'authorized' ? 'supersecret123' : '';

  useEffect(() => {
    if (!secret) {
      navigate('/support-admin/login');
      return;
    }
    fetchTickets();
  }, [secret, navigate]);

  useEffect(() => {
    if (selectedTicket) {
      fetchMessages(selectedTicket.id);
    }
  }, [selectedTicket]);

  useEffect(() => {
    fetchTickets();
    
    // Listen for realtime broadcasts from the Customer Widget
    const channel = supabase.channel('admin-notifications')
      .on(
        'broadcast',
        { event: 'new-ticket' },
        () => {
          fetchTickets();
        }
      )
      .on(
        'broadcast',
        { event: 'new-message' },
        (payload) => {
          if (selectedTicket && selectedTicket.id === payload.payload.ticketId) {
            fetchMessages(selectedTicket.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedTicket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase.rpc('admin_get_tickets', { secret });
      if (error) throw error;
      setTickets(data || []);
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (ticketId: string) => {
    try {
      const { data, error } = await supabase.rpc('admin_get_messages', { secret, p_ticket_id: ticketId });
      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicket) return;

    try {
      const { error } = await supabase.rpc('admin_reply_ticket', { 
        secret, 
        p_ticket_id: selectedTicket.id, 
        p_message: replyText 
      });
      if (error) throw error;
      setReplyText('');
      fetchMessages(selectedTicket.id); // Refresh messages
      
      supabase.channel('widget-notifications').send({
        type: 'broadcast',
        event: 'admin-reply',
        payload: { ticketId: selectedTicket.id }
      });
    } catch (err) {
      console.error('Failed to send reply:', err);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedTicket) return;
    try {
      const { error } = await supabase.rpc('admin_update_ticket_status', {
        secret: 'supersecret123',
        p_ticket_id: selectedTicket.id,
        p_status: newStatus
      });

      if (error) throw error;
      
      supabase.channel('widget-notifications').send({
        type: 'broadcast',
        event: 'status-change',
        payload: { ticketId: selectedTicket.id, status: newStatus.toLowerCase() }
      });
      
      if (newStatus.toLowerCase() === 'closed') {
        setTickets(tickets.filter(t => t.id !== selectedTicket.id));
        setSelectedTicket(null);
      } else {
        setTickets(tickets.map(t => t.id === selectedTicket.id ? { ...t, status: newStatus.toLowerCase() } : t));
        
        if (newStatus.toLowerCase() !== activeTab.toLowerCase() && activeTab !== 'all') {
          setSelectedTicket(null);
        } else {
          setSelectedTicket({ ...selectedTicket, status: newStatus.toLowerCase() });
        }
      }
    } catch (err) {
      console.error('Failed to update ticket status:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('support_admin_token');
    navigate('/support-admin/login');
  };

  const filteredTickets = tickets.filter(t => (t.status || '').toLowerCase() === activeTab.toLowerCase());

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col z-10 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Support Center</h2>
          <p className="text-sm text-gray-500">Agent Dashboard</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button 
            onClick={() => setActiveTab('Open')}
            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg transition-colors ${activeTab === 'Open' ? 'bg-blue-50 text-blue-700 font-medium shadow-sm border border-blue-100' : 'text-gray-700 hover:bg-gray-50'}`}
          >
            <div className="flex items-center space-x-3">
              <Inbox className="w-5 h-5" />
              <span>Open Tickets</span>
            </div>
            <span className="bg-blue-100 text-blue-700 py-0.5 px-2 rounded-full text-xs">{tickets.filter(t => (t.status || '').toLowerCase() === 'open').length}</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('In Progress')}
            className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-colors ${activeTab === 'In Progress' ? 'bg-blue-50 text-blue-700 font-medium shadow-sm border border-blue-100' : 'text-gray-700 hover:bg-gray-50'}`}
          >
            <Clock className="w-5 h-5" />
            <span>In Progress</span>
          </button>

          <button 
            onClick={() => setActiveTab('Resolved')}
            className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-colors ${activeTab === 'Resolved' ? 'bg-blue-50 text-blue-700 font-medium shadow-sm border border-blue-100' : 'text-gray-700 hover:bg-gray-50'}`}
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

      {/* Main Content Area */}
      <div className="flex-1 flex flex-row overflow-hidden">
        
        {/* Ticket List (Master View) */}
        <div className="w-1/3 border-r border-gray-200 bg-white flex flex-col">
           <header className="border-b border-gray-200 px-4 py-4 flex items-center justify-between bg-gray-50/50">
             <div className="relative flex-1 mr-2">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
               <input 
                 type="text" 
                 placeholder="Search tickets..." 
                 className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
               />
             </div>
             <button className="text-gray-500 hover:text-gray-800 p-2 border border-gray-300 rounded-lg bg-white">
               <Filter className="w-4 h-4" />
             </button>
           </header>
           
           <div className="flex-1 overflow-y-auto">
             {loading ? (
               <div className="p-8 text-center text-gray-500">Loading tickets...</div>
             ) : filteredTickets.length === 0 ? (
               <div className="p-8 text-center">
                 <div className="mx-auto w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                   <Inbox className="w-6 h-6 text-gray-400" />
                 </div>
                 <h3 className="text-sm font-medium text-gray-900">No {activeTab.toLowerCase()} tickets</h3>
               </div>
             ) : (
               <div className="divide-y divide-gray-100">
                 {filteredTickets.map(ticket => (
                   <button 
                     key={ticket.id}
                     onClick={() => setSelectedTicket(ticket)}
                     className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${selectedTicket?.id === ticket.id ? 'bg-blue-50/50 border-l-4 border-blue-500' : 'border-l-4 border-transparent'}`}
                   >
                     <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold text-gray-900 text-sm">{ticket.subject?.match(/^\[(.*?)\]/)?.[1] || 'Customer Ticket'}</span>
                        <span className="text-xs text-gray-500">{new Date(ticket.created_at).toLocaleDateString()}</span>
                     </div>
                     <p className="text-sm text-gray-600 truncate">{ticket.subject?.replace(/^\[.*?\]\s*/, '') || 'No subject provided'}</p>
                     {ticket.organization_name && (
                       <div className="mt-1 text-xs text-blue-600 font-medium">
                         {ticket.organization_name}
                       </div>
                     )}
                     <div className="mt-2">
                       <span className="inline-block bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">
                         {ticket.status}
                       </span>
                     </div>
                   </button>
                 ))}
               </div>
             )}
           </div>
        </div>

        {/* Ticket Details (Detail View) */}
        <div className="flex-1 bg-gray-50 flex flex-col h-full relative">
          {selectedTicket ? (
            <>
              {/* Header */}
              <div className="bg-white border-b border-gray-200 p-6 flex justify-between items-center shadow-sm z-10">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedTicket.subject?.replace(/^\[.*?\]\s*/, '') || 'Customer Ticket'}</h2>
                  <div className="flex items-center space-x-2 mt-1">
                    <p className="text-sm text-gray-500">Ticket ID: {selectedTicket.id}</p>
                    {selectedTicket.organization_name && (
                      <>
                        <span className="text-gray-300">•</span>
                        <span className="text-sm font-medium text-blue-600">{selectedTicket.organization_name}</span>
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <select 
                    value={(selectedTicket.status || '').toLowerCase()}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 font-medium"
                  >
                    <option value="open">Status: Open</option>
                    <option value="in progress">Status: In Progress</option>
                    <option value="resolved">Status: Resolved</option>
                    <option value="closed">Status: Closed</option>
                  </select>
                </div>
              </div>

              {/* Chat Thread */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                 {/* Initial Ticket Message */}
                 {selectedTicket.message && (
                   <div className="flex justify-start">
                     <div className="flex items-start max-w-[80%] flex-row">
                       <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gray-200 mr-3">
                         <User className="w-4 h-4 text-gray-600" />
                       </div>
                       <div className="px-4 py-3 rounded-2xl shadow-sm text-sm bg-white border border-gray-200 text-gray-800 rounded-tl-none whitespace-pre-wrap">
                         {selectedTicket.message?.split('\n\nSystem Info:')[0]}
                         <div className="text-[10px] mt-1 text-gray-400">
                           {new Date(selectedTicket.created_at).toLocaleTimeString()}
                         </div>
                       </div>
                     </div>
                   </div>
                 )}
                 {selectedTicket.message?.includes('\n\nSystem Info:') && (
                   <div className="ml-14 mt-1 mb-4">
                     <details className="text-[10px] text-gray-400 cursor-pointer group">
                        <summary className="hover:text-gray-500 font-medium">View System Info</summary>
                        <div className="mt-1 whitespace-pre-wrap bg-gray-50 p-2 rounded border border-gray-100 text-gray-500">
                           System Info:{selectedTicket.message.split('\n\nSystem Info:')[1]}
                        </div>
                     </details>
                   </div>
                 )}

                 {messages.map((msg, idx) => {
                     const isAgent = msg.is_admin;
                     
                     return (
                       <div key={idx} className={`flex ${isAgent ? 'justify-end' : 'justify-start'}`}>
                         <div className={`flex items-start max-w-[80%] ${isAgent ? 'flex-row-reverse' : 'flex-row'}`}>
                           <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isAgent ? 'bg-blue-100 ml-3' : 'bg-gray-200 mr-3'}`}>
                             {isAgent ? <User className="w-4 h-4 text-blue-600" /> : <MessageCircle className="w-4 h-4 text-gray-600" />}
                           </div>
                           <div className={`px-4 py-3 rounded-2xl shadow-sm text-sm ${isAgent ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'}`}>
                             {msg.message}
                             <div className={`text-[10px] mt-1 ${isAgent ? 'text-blue-100' : 'text-gray-400'}`}>
                               {new Date(msg.created_at).toLocaleTimeString()}
                             </div>
                           </div>
                         </div>
                       </div>
                     );
                   })}
                 <div ref={messagesEndRef} />
              </div>

              {/* Reply Box */}
              <div className="bg-white border-t border-gray-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
                <form onSubmit={handleSendReply} className="relative">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    disabled={(selectedTicket.status || '').toLowerCase() === 'resolved'}
                    placeholder={(selectedTicket.status || '').toLowerCase() === 'resolved' ? "This ticket is resolved. Change status to Open to send a message." : "Type your reply to the customer..."}
                    className="w-full border border-gray-300 rounded-xl p-3 pr-16 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none h-24 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                  ></textarea>
                  <button 
                    type="submit"
                    disabled={!replyText.trim() || (selectedTicket.status || '').toLowerCase() === 'resolved'}
                    className="absolute bottom-3 right-3 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <MessageCircle className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">No Ticket Selected</h3>
              <p className="text-gray-500">Select a ticket from the left to view details and reply.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
