import { useEffect, useState } from 'react';
import { Users, Building2, CreditCard, Activity, ArrowUpRight, ArrowDownRight, TrendingUp, UserCheck } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../../lib/supabase';

function MetricCard({ title, value, sub, change, trend, icon: Icon, color = 'blue' }: any) {
  const colorMap: Record<string, string> = {
    blue: 'bg-gradient-to-br from-blue-50 to-blue-100/50 text-blue-600 border border-blue-200/50',
    indigo: 'bg-gradient-to-br from-indigo-50 to-indigo-100/50 text-indigo-600 border border-indigo-200/50',
    emerald: 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 text-emerald-600 border border-emerald-200/50',
    amber: 'bg-gradient-to-br from-amber-50 to-amber-100/50 text-amber-600 border border-amber-200/50',
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2.5 rounded-xl transition-transform duration-300 group-hover:scale-110 ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        {change && (
          <span className={`text-xs font-semibold flex items-center gap-0.5 px-2 py-1 rounded-full ${trend === 'up' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {change}
          </span>
        )}
      </div>
      <div className="mt-2">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

export function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    mrr: 0, arr: 0, activeOrgs: 0, totalUsers: 0, activeUsers: 0, activeSessions: 0,
    newOrgsThisMonth: 0, failedPayments: 0,
  });
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [recentSignups, setRecentSignups] = useState<any[]>([]);
  const [planBreakdown, setPlanBreakdown] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
        const [
          { count: totalUsers },
          { count: activeUsers },
          { count: activeOrgs },
          { count: newOrgsThisMonth },
          { data: activeSessionData },
          { count: failedPayments },
          { data: thisMonthPayments },
          { data: lastMonthPayments },
          { data: recentOrgs },
          { data: historicalPayments },
          { data: orgPlanData },
        ] = await Promise.all([
          supabase.from('members').select('id', { count: 'exact', head: true }),
          supabase.from('members').select('id', { count: 'exact', head: true }).eq('status', 'Active'),
          supabase.from('organizations').select('id', { count: 'exact', head: true }),
          supabase.from('organizations').select('id', { count: 'exact', head: true }).gte('created_at', startOfMonth),
          supabase.from('sessions').select('user_id').is('ended_at', null).gte('started_at', new Date(Date.now() - 86400000).toISOString()),
          supabase.from('payments').select('id', { count: 'exact', head: true }).eq('status', 'Failed'),
          supabase.from('payments').select('amount').eq('status', 'Completed').gte('created_at', startOfMonth),
          supabase.from('payments').select('amount').eq('status', 'Completed').gte('created_at', startOfLastMonth).lt('created_at', startOfMonth),
          supabase.from('organizations').select('id, name, plan_tier, created_at').order('created_at', { ascending: false }).limit(6),
          supabase.from('payments').select('amount, created_at').eq('status', 'Completed').gte('created_at', new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString()),
          supabase.from('organizations').select('plan_tier'),
        ]);

        const mrr = thisMonthPayments?.reduce((s, p) => s + Number(p.amount), 0) || 0;
        const lastMrr = lastMonthPayments?.reduce((s, p) => s + Number(p.amount), 0) || 0;
        const mrrChange = lastMrr > 0 ? (((mrr - lastMrr) / lastMrr) * 100).toFixed(1) : '0';

        // Revenue chart: group by month
        const monthsMap = new Map();
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = `${d.getFullYear()}-${d.getMonth()}`;
          monthsMap.set(key, { name: d.toLocaleDateString('en-US', { month: 'short' }), revenue: 0, year: d.getFullYear() });
        }
        historicalPayments?.forEach(p => {
          const d = new Date(p.created_at);
          const key = `${d.getFullYear()}-${d.getMonth()}`;
          if (monthsMap.has(key)) monthsMap.get(key).revenue += Number(p.amount);
        });

        // Plan breakdown for stacked bar
        const planCounts: Record<string, number> = { Starter: 0, Pro: 0, Enterprise: 0 };
        orgPlanData?.forEach(o => { planCounts[o.plan_tier] = (planCounts[o.plan_tier] || 0) + 1; });
        const total = orgPlanData?.length || 1;
        setPlanBreakdown([{
          name: 'Plans',
          Starter: planCounts.Starter,
          Pro: planCounts.Pro,
          Enterprise: planCounts.Enterprise,
          StarterPct: Math.round((planCounts.Starter / total) * 100),
          ProPct: Math.round((planCounts.Pro / total) * 100),
          EnterprisePct: Math.round((planCounts.Enterprise / total) * 100),
        }]);

        setMetrics({
          mrr, arr: mrr * 12,
          activeOrgs: activeOrgs || 0,
          totalUsers: totalUsers || 0,
          activeUsers: activeUsers || 0,
          activeSessions: activeSessionData ? new Set(activeSessionData.map(s => s.user_id)).size : 0,
          newOrgsThisMonth: newOrgsThisMonth || 0,
          failedPayments: failedPayments || 0,
        });

        setRevenueData(Array.from(monthsMap.values()));
        setRecentSignups((recentOrgs || []).map(o => ({
          ...o,
          date: new Date(o.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        })));

        // Store mrrChange for display
        (window as any).__mrrChange = mrrChange;
      } catch (err) {
        console.error('Dashboard load error', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const planColors: Record<string, string> = { Starter: '#94a3b8', Pro: '#3b82f6', Enterprise: '#6366f1' };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Platform Overview</h1>
          <p className="text-slate-500 mt-1">Real-time metrics for TrackOwl SaaS</p>
        </div>
        <button onClick={() => window.location.reload()} className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
          ↻ Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <>
          {/* Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard icon={CreditCard} title="Monthly Revenue" value={`$${metrics.mrr.toLocaleString()}`} sub={`ARR: $${metrics.arr.toLocaleString()}`} change={`${(window as any).__mrrChange}%`} trend="up" color="indigo" />
            <MetricCard icon={Building2} title="Total Organizations" value={metrics.activeOrgs.toLocaleString()} sub={`+${metrics.newOrgsThisMonth} this month`} change={metrics.newOrgsThisMonth > 0 ? `+${metrics.newOrgsThisMonth}` : undefined} trend="up" color="blue" />
            <MetricCard icon={Users} title="Total Members" value={metrics.totalUsers.toLocaleString()} sub={`${metrics.activeUsers.toLocaleString()} active`} color="emerald" />
            <MetricCard icon={Activity} title="Live Trackers" value={metrics.activeSessions.toLocaleString()} sub="Currently running sessions" color="amber" />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard icon={UserCheck} title="Active Members" value={metrics.activeUsers.toLocaleString()} sub={`${metrics.totalUsers > 0 ? Math.round((metrics.activeUsers / metrics.totalUsers) * 100) : 0}% of total`} color="emerald" />
            <MetricCard icon={TrendingUp} title="Est. ARR" value={`$${metrics.arr.toLocaleString()}`} sub="Based on current MRR" color="indigo" />
            <MetricCard icon={CreditCard} title="Failed Payments" value={metrics.failedPayments.toLocaleString()} sub="Requires immediate action" color="amber" />
            <MetricCard icon={Building2} title="New Orgs (Month)" value={metrics.newOrgsThisMonth.toLocaleString()} sub="Organizations joined this month" color="blue" />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Revenue (Last 6 Months)</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Aggregated from completed payments</p>
                </div>
                <span className="text-2xl font-bold text-slate-900">${metrics.mrr.toLocaleString()}</span>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={8} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dx={-4} tickFormatter={v => `$${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
                    <Tooltip
                      contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                      formatter={(v: any) => [`$${Number(v).toLocaleString()}`, 'Revenue']}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#revGrad)" dot={{ fill: '#2563eb', r: 4, strokeWidth: 2, stroke: '#fff' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col hover:shadow-md transition-shadow duration-300">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900">Recent Organizations</h2>
                <span className="text-xs text-slate-400">{recentSignups.length} latest</span>
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
                {recentSignups.map(org => (
                  <div key={org.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center text-indigo-600 font-bold text-sm uppercase shrink-0">
                      {org.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{org.name}</p>
                      <p className="text-xs text-slate-400">{org.date}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      org.plan_tier === 'Enterprise' ? 'bg-indigo-100 text-indigo-700' :
                      org.plan_tier === 'Pro' ? 'bg-blue-100 text-blue-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>{org.plan_tier}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Plan Distribution */}
          {planBreakdown.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow duration-300">
              <h2 className="text-base font-semibold text-slate-900 mb-6">Plan Distribution Breakdown</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {['Starter', 'Pro', 'Enterprise'].map(tier => {
                  const pct = planBreakdown[0][`${tier}Pct`] || 0;
                  const count = planBreakdown[0][tier] || 0;
                  return (
                    <div key={tier} className="flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-slate-700">{tier}</span>
                        <span className="text-sm text-slate-500">{count} orgs ({pct}%)</span>
                      </div>
                      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, backgroundColor: planColors[tier] }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
