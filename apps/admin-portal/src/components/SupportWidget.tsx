import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageCircle, X, Send, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const KNOWLEDGE_BASE = [
  { keywords: ['add', 'invit', 'creat', 'new', 'member', 'user', 'peopl', 'manag', 'employe', 'staff', 'team'], answer: "To add a member or manager, go to the 'People' tab in the admin dashboard and click the 'Invite Member' button." },
  { keywords: ['track', 'record', 'start', 'stop', 'log', 'time', 'hour', 'work', 'app'], answer: "To track time, open the TrackOwl desktop app, select a project, and click the 'Play' button. Time will be logged to your timesheet automatically." },
  { keywords: ['creat', 'add', 'new', 'manag', 'project', 'todo', 'task', 'client'], answer: "Projects, To-Dos, and Clients are managed under the 'Project Management' tab. You can assign teams to specific projects there." },
  { keywords: ['bill', 'price', 'cost', 'plan', 'subscrib', 'payment', 'method', 'credit', 'card', 'upgrad', 'downgrad'], answer: "You can manage your billing, plans, and payment methods in Settings > Billing." },
  { keywords: ['password', 'reset', 'login', 'sign', 'auth', 'cannot', 'access', 'forgot'], answer: "If you forgot your password, you can reset it from the login screen by clicking 'Forgot Password'." },
  { cap: 2, keywords: ['screenshot', 'activit', 'mouse', 'keyboard', 'monitor', 'see', 'view'], answer: "Activity tracking, including screenshots and keyboard/mouse usage, can be viewed in the 'Activity' tab. You can configure how often screenshots are taken in Settings > Tracking." },
  { keywords: ['timesheet', 'approv', 'hour', 'work', 'review'], answer: "Timesheets can be viewed and approved in the 'Timesheets' tab. Managers can review daily or weekly hours here." },
  { keywords: ['report', 'export', 'daili', 'total', 'owed', 'amount'], answer: "You can generate and export various reports (Daily Totals, Amounts Owed, Payments) from the 'Reports' section." },
  { keywords: ['invoic', 'expens', 'financi', 'pay', 'money'], answer: "Financials such as Invoices, Expenses, and Payments can be managed in the 'Financials' section." },
  { keywords: ['locat', 'job', 'site', 'gps', 'geofenc', 'where', 'map'], answer: "You can set up Job Sites and track location/GPS under the 'Locations' tab." },
  { keywords: ['calendar', 'schedul', 'shift', 'roster'], answer: "Schedules and shifts can be managed using the 'Calendar' tab." },
  { keywords: ['silent', 'stealth', 'hidden', 'invisibl', 'secret'], answer: "Information on Silent App tracking can be found under the 'Silent' tab. Ensure you comply with local laws regarding silent monitoring." },
  { keywords: ['integrat', 'api', 'connect', 'slack', 'jira', 'trello', 'zapier'], answer: "You can connect TrackOwl to other tools in Settings > Integrations." },
  { keywords: ['insight', 'productiv', 'idle', 'activ', 'chart'], answer: "Productivity insights and idle time statistics are available in the 'Insights' tab." },
  { keywords: ['hi', 'hello', 'hey', 'greet', 'morn', 'afternoon'], answer: "Hello there! How can I help you today?" },
  { keywords: ['human', 'agent', 'person', 'real', 'talk', 'speak', 'support', 'help', 'rep'], answer: "Connecting you to a human agent. Please hold on a moment..." }
];

function getBotResponse(input: string): string {
  // Filter out common stop words so short words like "i", "is", "it" don't trigger random keyword matches
  const stopWords = new Set(['i', 'am', 'is', 'are', 'it', 'the', 'a', 'an', 'and', 'or', 'not', 'that', 'this', 'to', 'for', 'of', 'in', 'on', 'with', 'ok', 'got', 'what', 'how', 'why', 'when', 'where', 'who', 'do', 'does', 'can', 'you', 'me', 'my', 'your']);
  const tokens = (input.toLowerCase().match(/\b\w+\b/g) || []).filter(t => !stopWords.has(t));
  
  let bestMatch = null;
  let highestScore = 0;

  for (const entry of KNOWLEDGE_BASE) {
    let score = 0;
    for (const keyword of entry.keywords) {
      for (const t of tokens) {
        // Only trigger if the user's word contains the keyword (e.g. "timesheets" contains "timesheet")
        if (t.includes(keyword)) {
          // Weight the score heavily by the length of the matched keyword so specific words (timesheet) beat generic ones (time)
          // Add a bonus if it's an exact match
          score += keyword.length + (t === keyword ? 2 : 0);
        }
      }
    }
    
    if (score > highestScore) {
      highestScore = score;
      bestMatch = entry;
    }
  }

  // We require a minimum score to ensure we don't just match a random short word
  if (bestMatch && highestScore > 0) {
    return bestMatch.answer;
  }

  return "I'm not sure about that. Would you like me to connect you to a human agent? (Type 'agent' to connect)";
}

export function SupportWidget() {
  const location = useLocation();
  const { organization, profile, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  
  // Chat state
  const [botMode, setBotMode] = useState<'normal' | 'awaiting_ticket' | 'live_chat'>('normal');
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  
  const [localMessages, setLocalMessages] = useState<{sender: 'user'|'bot'|'admin', text: string}[]>([
    { sender: 'bot', text: "Hi! I'm TrackOwl's Virtual Agent. Ask me questions about usage, or type 'agent' to speak with a human." }
  ]);
  const [dbMessages, setDbMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [ticketStatus, setTicketStatus] = useState<string>('open');

  // Polling for live chat messages
  useEffect(() => {
    if (botMode !== 'live_chat' || !activeTicketId) return;
    
    const fetchMessages = async () => {
      // Fetch ticket status
      const { data: ticketData } = await supabase
        .from('support_tickets')
        .select('status')
        .eq('id', activeTicketId)
        .single();
        
      if (ticketData) {
        setTicketStatus((ticketData.status || '').toLowerCase());
      }

      // Fetch messages
      const { data } = await supabase
        .from('support_messages')
        .select('*')
        .eq('ticket_id', activeTicketId)
        .order('created_at', { ascending: true });
        
      if (data) setDbMessages(data);
    };

    fetchMessages(); // initial fetch
    
    // Listen for realtime broadcasts from the Admin Dashboard
    const channel = supabase.channel('widget-notifications')
      .on(
        'broadcast',
        { event: 'admin-reply' },
        (payload) => {
          if (payload.payload.ticketId === activeTicketId) {
            fetchMessages();
          }
        }
      )
      .on(
        'broadcast',
        { event: 'status-change' },
        (payload) => {
          if (payload.payload.ticketId === activeTicketId) {
            setTicketStatus(payload.payload.status);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [botMode, activeTicketId]);

  useEffect(() => {
    if (botMode === 'live_chat' && ticketStatus === 'resolved') {
      setLocalMessages(prev => [
        ...prev,
        ...dbMessages.map(m => ({ sender: (m.is_admin ? 'admin' : 'user') as 'admin'|'user', text: m.message })),
        { sender: 'bot' as const, text: 'This ticket has been resolved. The agent has disconnected. I am your virtual agent, how else can I help you today?' }
      ]);
      setDbMessages([]);
      setActiveTicketId(null);
      setBotMode('normal');
      setTicketStatus('open');
    }
  }, [ticketStatus, botMode, dbMessages]);

  const allMessages = [
    ...localMessages,
    ...dbMessages.map(m => ({
      id: m.id,
      sender: m.is_admin ? 'admin' : 'user',
      text: m.message
    }))
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages]);

  // Hide the support widget on the support admin portal
  if (location.pathname.startsWith('/support-admin')) {
    return null;
  }

  const toggleWidget = () => setIsOpen(!isOpen);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSubmitting) return;

    const userText = input;
    setInput('');

    if (botMode === 'live_chat' && activeTicketId) {
      setIsSubmitting(true);
      try {
        const { data, error } = await supabase.from('support_messages').insert({
          ticket_id: activeTicketId,
          sender_id: user?.id || null,
          is_admin: false,
          is_ai: false,
          message: userText
        }).select().single();
        
        if (error) throw error;
        if (data) {
          setDbMessages(prev => {
            if (prev.some(m => m.id === data.id)) return prev;
            return [...prev, data];
          });
          
          // Notify admin of new message
          supabase.channel('admin-notifications').send({
            type: 'broadcast',
            event: 'new-message',
            payload: { ticketId: activeTicketId }
          });
        }
      } catch (err) {
        console.error('Failed to send message:', err);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    setLocalMessages(prev => [...prev, { sender: 'user', text: userText }]);

    if (botMode === 'awaiting_ticket') {
      setIsSubmitting(true);
      try {
        const { data, error } = await supabase.from('support_tickets').insert({
          user_id: profile?.id || null,
          organization_id: organization?.id || null,
          subject: `[Live Chat] ` + (userText.substring(0, 40) + (userText.length > 40 ? '...' : '')),
          message: userText + `\n\nSystem Info:\nOS: ${navigator.platform}\nBrowser: ${navigator.userAgent}\nURL: ${window.location.href}`,
          status: 'open'
        }).select().single();
        
        if (error) throw error;
        
        setActiveTicketId(data.id);
        setLocalMessages(prev => [...prev, { sender: 'bot', text: 'An agent will be with you shortly! Thank you for your patience.' }]);
        setBotMode('live_chat');
        
        // Notify admin of new ticket
        supabase.channel('admin-notifications').send({
          type: 'broadcast',
          event: 'new-ticket',
          payload: {}
        });
      } catch (err) {
        console.error('Failed to submit ticket:', err);
        setLocalMessages(prev => [...prev, { sender: 'bot', text: 'Sorry, we encountered an error connecting to an agent. Please try again later.' }]);
        setBotMode('normal');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    setTimeout(() => {
      if (userText.toLowerCase().includes('agent') || userText.toLowerCase().includes('human') || userText.toLowerCase().includes('support')) {
         setLocalMessages(prev => [...prev, { sender: 'bot', text: 'To help our Customer Support Agent assist you, please describe the issue or question you need help with.' }]);
         setBotMode('awaiting_ticket');
         return;
      }

      const response = getBotResponse(userText);
      setLocalMessages(prev => [...prev, { sender: 'bot', text: response }]);
    }, 1000);
  };

  if (!location.pathname.startsWith('/dashboard')) {
    return null;
  }

  if (!isOpen) {
    return (
      <button 
        onClick={toggleWidget}
        className="fixed bottom-6 right-6 p-4 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-transform hover:scale-105 z-50 flex items-center justify-center"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 max-h-[600px] h-[80vh] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-gray-100 overflow-hidden font-sans">
      {/* Header */}
      <div className="bg-white px-4 py-4 border-b border-gray-100 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">TrackOwl Support</h3>
            <p className="text-xs text-gray-500">We're here to help</p>
          </div>
        </div>
        <button onClick={toggleWidget} className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-4 space-y-4 pb-20">
        {allMessages.map((msg: any, i: number) => (
          <div key={i} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
            {msg.sender === 'admin' && (
              <div className="flex items-center space-x-2 mb-1 pl-1">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                   <User className="w-3 h-3 text-blue-600" />
                </div>
                <span className="text-xs text-gray-500 font-medium">Support Agent</span>
              </div>
            )}
            <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
              msg.sender === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-sm' 
                : msg.sender === 'admin'
                  ? 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm ml-8'
                  : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-white border-t border-gray-100">
          <form onSubmit={handleSendMessage} className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Write a message..."
              className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
            />
            <button 
              type="submit"
              disabled={!input.trim()}
              className="absolute right-2 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <div className="text-center mt-2">
             <span className="text-[10px] text-gray-400">Powered by TrackOwl Support</span>
          </div>
        </div>
    </div>
  );
}
