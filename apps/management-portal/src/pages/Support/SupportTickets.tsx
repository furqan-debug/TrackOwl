import { useEffect, useState } from 'react';
import { LifeBuoy, MessageSquare, AlertCircle, CheckCircle2, Clock, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const STATUS_BADGE: Record<string, string> = {
  'Open': 'bg-amber-50 text-amber-700 border-amber-200',
  'In Progress': 'bg-blue-50 text-blue-700 border-blue-200',
  'Waiting for Customer': 'bg-purple-50 text-purple-700 border-purple-200',
  'Resolved': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Closed': 'bg-slate-100 text-slate-600 border-slate-200',
};
const TYPE_BADGE: Record<string, string> = {
  'Bug Report': 'bg-red-50 text-red-700',
  'Feature Request': 'bg-indigo-50 text-indigo-700',
  'Live Chat': 'bg-blue-50 text-blue-700',
  'Email Ticket': 'bg-slate-100 text-slate-700',
};

export function SupportTickets() {
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({ open: 0, inProgress: 0, waitingForCustomer: 0, resolved: 0 });
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterType, setFilterType] = useState('All');
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('support_tickets')
          .select(`
            id, type, status, subject, created_at, updated_at, system_info,
            organizations(name)
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;

        setTickets(data || []);
        setMetrics({
          open: data?.filter(t => t.status === 'Open').length || 0,
          inProgress: data?.filter(t => t.status === 'In Progress').length || 0,
          waitingForCustomer: data?.filter(t => t.status === 'Waiting for Customer').length || 0,
          resolved: data?.filter(t => t.status === 'Resolved').length || 0,
        });
      } catch (err) {
        console.error('Support tickets load error', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = tickets.filter(t => {
    const matchStatus = filterStatus === 'All' || t.status === filterStatus;
    const matchType = filterType === 'All' || t.type === filterType;
    const matchSearch = !search || t.subject?.toLowerCase().includes(search.toLowerCase()) || (t.organizations as any)?.name?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchType && matchSearch;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Support & Operations</h1>
        <p className="text-slate-500 mt-1">{tickets.length} total tickets across all organizations</p>
      </div>

      {loading ? (
        <div className="p-16 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Open', value: metrics.open, icon: AlertCircle, color: 'text-amber-600 bg-amber-50' },
              { label: 'In Progress', value: metrics.inProgress, icon: MessageSquare, color: 'text-blue-600 bg-blue-50' },
              { label: 'Waiting for Customer', value: metrics.waitingForCustomer, icon: Clock, color: 'text-purple-600 bg-purple-50' },
              { label: 'Resolved', value: metrics.resolved, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
            ].map(stat => (
              <div key={stat.label} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <div className={`inline-flex p-2.5 rounded-xl mb-3 ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Filters & Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by subject or organization…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {['All', 'Open', 'In Progress', 'Waiting for Customer', 'Resolved', 'Closed'].map(s => (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${filterStatus === s ? 'bg-primary text-white border-primary' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 flex-wrap">
                {['All', 'Bug Report', 'Feature Request', 'Live Chat', 'Email Ticket'].map(t => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${filterType === t ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">ID</th>
                    <th className="px-5 py-3">Subject</th>
                    <th className="px-5 py-3">Organization</th>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Created</th>
                    <th className="px-5 py-3">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors cursor-pointer">
                      <td className="px-5 py-3 font-mono text-xs text-slate-500">{t.id.substring(0, 8).toUpperCase()}</td>
                      <td className="px-5 py-3 font-medium text-slate-900 max-w-xs">
                        <div className="truncate">{t.subject || '(No subject)'}</div>
                      </td>
                      <td className="px-5 py-3 text-slate-600">{(t.organizations as any)?.name || '—'}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TYPE_BADGE[t.type] || 'bg-slate-100 text-slate-600'}`}>
                          {t.type}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${STATUS_BADGE[t.status] || STATUS_BADGE['Closed']}`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-400 text-xs whitespace-nowrap">{new Date(t.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      <td className="px-5 py-3 text-slate-400 text-xs whitespace-nowrap">{t.updated_at ? new Date(t.updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}</td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-16 text-center">
                        <LifeBuoy className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">No tickets found</p>
                        <p className="text-slate-400 text-xs mt-1">Try adjusting the filters or search term</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/50 text-xs text-slate-400">
              Showing {filtered.length} of {tickets.length} tickets
            </div>
          </div>
        </>
      )}
    </div>
  );
}
