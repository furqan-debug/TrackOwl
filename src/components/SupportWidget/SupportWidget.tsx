import { useState } from 'react';
import { MessageCircle, X, ChevronRight, Send, AlertCircle, HelpCircle } from 'lucide-react';

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
  const tokens = input.toLowerCase().match(/\b\w+\b/g) || [];
  let bestMatch = null;
  let highestScore = 0;

  for (const entry of KNOWLEDGE_BASE) {
    let score = 0;
    for (const keyword of entry.keywords) {
      if (tokens.some(t => t.includes(keyword) || keyword.includes(t))) {
        score++;
      }
    }
    
    if (score > highestScore) {
      highestScore = score;
      bestMatch = entry;
    }
  }

  // Require a stronger match if the query is long, otherwise 1 keyword is fine
  const threshold = tokens.length > 5 ? 2 : 1;
  if (bestMatch && highestScore >= threshold) {
    return bestMatch.answer;
  }

  return "I'm not sure about that. Would you like me to connect you to a human agent? (Type 'agent' to connect)";
}

export function SupportWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<'initial' | 'chat' | 'options' | 'bug_report'>('initial');
  const [messages, setMessages] = useState<{sender: 'user'|'bot', text: string}[]>([
    { sender: 'bot', text: "Hi! I'm TrackOwl's Virtual Agent. Ask me questions about usage, or type 'agent' to speak with a human." }
  ]);
  const [input, setInput] = useState('');

  const toggleWidget = () => setIsOpen(!isOpen);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setMessages([...messages, { sender: 'user', text: input }]);
    setInput('');

    // Rule-based keyword matching response
    setTimeout(() => {
      const response = getBotResponse(input);
      setMessages(prev => [...prev, { sender: 'bot', text: response }]);
    }, 1000);
  };

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
            <h3 className="font-semibold text-gray-900 text-sm">TrackOwl Virtual Agent</h3>
            <p className="text-xs text-gray-500">Always here to help</p>
          </div>
        </div>
        <button onClick={toggleWidget} className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-4 space-y-4">
        {view === 'initial' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <h4 className="font-medium text-gray-900 mb-2">How can we help?</h4>
              <button 
                onClick={() => setView('chat')}
                className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group mb-2"
              >
                <div className="flex items-center space-x-3 text-gray-700 group-hover:text-blue-600">
                  <MessageCircle className="w-5 h-5" />
                  <span>Ask Virtual Agent</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
              
              <button 
                onClick={() => setView('options')}
                className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-center space-x-3 text-gray-700 group-hover:text-blue-600">
                  <HelpCircle className="w-5 h-5" />
                  <span>Contact Support</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>
        )}

        {view === 'options' && (
          <div className="space-y-4">
            <button onClick={() => setView('initial')} className="text-sm text-blue-600 hover:underline flex items-center">
              &larr; Back
            </button>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-2">
              <h4 className="font-medium text-gray-900 mb-3">Support Options</h4>
              
              <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors text-sm text-gray-700 font-medium">
                Live Chat
              </button>
              <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors text-sm text-gray-700 font-medium">
                Email Ticket
              </button>
              <button 
                onClick={() => setView('bug_report')}
                className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors text-sm text-gray-700 font-medium flex items-center justify-between"
              >
                <span>Report a Bug</span>
                <AlertCircle className="w-4 h-4 text-gray-400" />
              </button>
              <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors text-sm text-gray-700 font-medium">
                Feature Request
              </button>
            </div>
          </div>
        )}

        {view === 'bug_report' && (
          <div className="space-y-4">
            <button onClick={() => setView('options')} className="text-sm text-blue-600 hover:underline flex items-center">
              &larr; Back
            </button>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <h4 className="font-medium text-gray-900 mb-3">Report a Bug</h4>
              <p className="text-xs text-gray-500 mb-4">We will automatically attach your OS and App Version to help diagnose the issue.</p>
              
              <textarea 
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none h-32"
                placeholder="Describe the issue you're facing..."
              ></textarea>
              
              <button className="w-full mt-3 bg-blue-600 text-white rounded-lg py-2 font-medium hover:bg-blue-700 transition-colors">
                Submit Report
              </button>
            </div>
          </div>
        )}

        {view === 'chat' && (
          <div className="space-y-4 pb-20">
             <button onClick={() => setView('initial')} className="text-sm text-blue-600 hover:underline flex items-center mb-4">
              &larr; Back
            </button>
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${msg.sender === 'user' ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Input Area (only in chat mode) */}
      {view === 'chat' && (
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
      )}
    </div>
  );
}
