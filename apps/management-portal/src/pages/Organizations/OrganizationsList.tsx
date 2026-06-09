import { useEffect, useState } from 'react';
import { Search, Building2, Users, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const PLAN_BADGE: Record<string, string> = {
  Enterprise: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  Pro: 'bg-blue-100 text-blue-700 border-blue-200',
  Starter: 'bg-slate-100 text-slate-600 border-slate-200',
};
const PAGE_SIZE = 15;

export function OrganizationsList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlan, setFilterPlan] = useState('All');
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchOrgs();
  }, [page, filterPlan]);

  async function fetchOrgs() {
    setLoading(true);
    try {
      let query = supabase
        .from('organizations')
        .select(`
          id, name, industry, size, plan_tier, seat_limit, seats_purchased, member_count, created_at,
          stripe_subscription_id, stripe_customer_id,
          members(id, email, full_name, role)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (filterPlan !== 'All') query = query.eq('plan_tier', filterPlan);

      const { data, error, count } = await query;
      if (error) throw error;

      setTotal(count || 0);
      setOrganizations(data || []);
    } catch (err) {
      console.error('Error fetching organizations', err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = organizations.filter(org =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const owner = (org: any) => {
    const admin = org.members?.find((m: any) => m.role === 'Admin');
    return admin?.email || org.members?.[0]?.email || '—';
  };

  const usedSeats = (org: any) => {
    return org.member_count ?? org.members?.length ?? 0;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Organizations</h1>
          <p className="text-slate-500 mt-1">{total.toLocaleString()} total workspaces</p>
        </div>
        <button onClick={fetchOrgs} className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm self-start">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by organization name…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div className="flex gap-2">
            {['All', 'Starter', 'Pro', 'Enterprise'].map(p => (
              <button
                key={p}
                onClick={() => { setFilterPlan(p); setPage(0); }}
                className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${filterPlan === p ? 'bg-primary text-white border-primary' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="p-16 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-slate-500 font-medium">
                    <th className="px-5 py-3">Organization</th>
                    <th className="px-5 py-3">Owner</th>
                    <th className="px-5 py-3">Plan</th>
                    <th className="px-5 py-3">Seats Used</th>
                    <th className="px-5 py-3">Industry</th>
                    <th className="px-5 py-3">Stripe</th>
                    <th className="px-5 py-3">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(org => {
                    const used = usedSeats(org);
                    const limit = org.seats_purchased || org.seat_limit || 10;
                    const pct = Math.min((used / limit) * 100, 100);
                    return (
                      <tr key={org.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold uppercase text-sm shrink-0">
                              {org.name.charAt(0)}
                            </div>
                            <div>
                              <Link to={`/organizations/${org.id}`} className="font-semibold text-slate-900 hover:text-primary transition-colors">
                                {org.name}
                              </Link>
                              <p className="text-xs text-slate-400 mt-0.5">{org.id.substring(0, 8)}…</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-slate-600 text-xs">{owner(org)}</td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${PLAN_BADGE[org.plan_tier] || PLAN_BADGE.Starter}`}>
                            {org.plan_tier}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2 min-w-[100px]">
                            <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="text-slate-900 font-medium text-xs">{used} / {limit}</span>
                          </div>
                          <div className="w-24 h-1.5 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                            <div className={`h-full rounded-full ${pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
                          </div>
                        </td>
                        <td className="px-5 py-4 text-slate-500 text-xs">{org.industry || '—'}</td>
                        <td className="px-5 py-4">
                          {org.stripe_customer_id ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Connected
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-slate-400 text-xs whitespace-nowrap">
                          {new Date(org.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-16 text-center">
                        <Building2 className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">No organizations found</p>
                        <p className="text-slate-400 text-xs mt-1">Try a different search or filter</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between text-sm text-slate-500">
              <span>Showing {Math.min(page * PAGE_SIZE + 1, total)}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total.toLocaleString()} organizations</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-1.5 rounded-lg border border-slate-300 bg-white disabled:opacity-40 hover:bg-slate-50">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-medium px-2">Page {page + 1} of {Math.max(1, Math.ceil(total / PAGE_SIZE))}</span>
                <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * PAGE_SIZE >= total} className="p-1.5 rounded-lg border border-slate-300 bg-white disabled:opacity-40 hover:bg-slate-50">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
