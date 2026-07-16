import { useEffect, useState } from 'react';
import { CreditCard, TrendingUp, ArrowUpRight, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { supabase } from '../../lib/supabase';

const PLAN_COLORS: Record<string, string> = {
  Enterprise: '#6366f1',
  Pro: '#3b82f6',
  Starter: '#94a3b8',
};

export function BillingOverview() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({ mrr: 0, arr: 0, activeSubscriptions: 0, failedPayments: 0, pendingPayments: 0, totalRevenue: 0 });
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [planDistribution, setPlanDistribution] = useState<{ name: string; value: number; pct: number }[]>([]);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString();

        const [
          { count: failedCount },
          { count: pendingCount },
          { count: activeSubs },
          { data: thisMonthPayments },
          { data: allPayments },
          { data: historicalPayments },
          { data: allOrgs },
          { data: latestPayments },
        ] = await Promise.all([
          supabase.from('payments').select('id', { count: 'exact', head: true }).eq('status', 'Failed'),
          supabase.from('payments').select('id', { count: 'exact', head: true }).eq('status', 'Pending'),
          supabase.from('organizations').select('id', { count: 'exact', head: true }).not('stripe_subscription_id', 'is', null),
          supabase.from('payments').select('amount').eq('status', 'Completed').gte('created_at', startOfMonth),
          supabase.from('payments').select('amount').eq('status', 'Completed'),
          supabase.from('payments').select('amount, created_at').eq('status', 'Completed').gte('created_at', sixMonthsAgo),
          supabase.from('organizations').select('plan_tier'),
          supabase.from('payments').select('amount, status, method, created_at, organizations(name)').order('created_at', { ascending: false }).limit(8),
        ]);

        const mrr = thisMonthPayments?.reduce((s, p) => s + Number(p.amount), 0) || 0;
        const totalRevenue = allPayments?.reduce((s, p) => s + Number(p.amount), 0) || 0;

        // Revenue by month
        const monthsMap = new Map();
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          monthsMap.set(`${d.getFullYear()}-${d.getMonth()}`, { month: d.toLocaleDateString('en-US', { month: 'short' }), mrr: 0 });
        }
        historicalPayments?.forEach(p => {
          const d = new Date(p.created_at);
          const key = `${d.getFullYear()}-${d.getMonth()}`;
          if (monthsMap.has(key)) monthsMap.get(key).mrr += Number(p.amount);
        });
        setRevenueData(Array.from(monthsMap.values()));

        // Plan distribution from real plan_tier column
        const planCounts: Record<string, number> = {};
        allOrgs?.forEach(o => { planCounts[o.plan_tier] = (planCounts[o.plan_tier] || 0) + 1; });
        const total = allOrgs?.length || 1;
        setPlanDistribution(Object.entries(planCounts).map(([name, value]) => ({
          name, value, pct: Math.round((value / total) * 100)
        })));

        setMetrics({ mrr, arr: mrr * 12, activeSubscriptions: activeSubs || 0, failedPayments: failedCount || 0, pendingPayments: pendingCount || 0, totalRevenue });
        setRecentPayments(latestPayments || []);
      } catch (err) {
        console.error('Billing load error', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Billing & Revenue</h1>
        <p className="text-slate-500 mt-1">Full financial overview across all organizations</p>
      </div>

      {loading ? (
        <div className="p-16 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : (
        <>
          {/* Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: 'Monthly Revenue', value: `$${metrics.mrr.toLocaleString()}`, sub: `ARR: $${metrics.arr.toLocaleString()}`, icon: TrendingUp, color: 'text-indigo-600 bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-200/50' },
              { label: 'Total Revenue (All Time)', value: `$${metrics.totalRevenue.toLocaleString()}`, sub: 'Sum of all completed payments', icon: CreditCard, color: 'text-blue-600 bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200/50' },
              { label: 'Active Subscriptions', value: metrics.activeSubscriptions.toLocaleString(), sub: 'Orgs with Stripe subscription', icon: CheckCircle2, color: 'text-emerald-600 bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200/50' },
              { label: 'Failed Payments', value: metrics.failedPayments.toLocaleString(), sub: 'Requires immediate follow-up', icon: XCircle, color: 'text-red-600 bg-gradient-to-br from-red-50 to-red-100/50 border border-red-200/50' },
              { label: 'Pending Payments', value: metrics.pendingPayments.toLocaleString(), sub: 'Awaiting confirmation', icon: Clock, color: 'text-amber-600 bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200/50' },
              { label: 'Est. ARR', value: `$${metrics.arr.toLocaleString()}`, sub: 'MRR × 12', icon: ArrowUpRight, color: 'text-purple-600 bg-gradient-to-br from-purple-50 to-purple-100/50 border border-purple-200/50' },
            ].map(card => (
              <div key={card.label} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
                <div className={`inline-flex p-2.5 rounded-xl mb-3 transition-transform duration-300 group-hover:scale-110 ${card.color}`}>
                  <card.icon className="w-5 h-5" />
                </div>
                <p className="text-sm font-medium text-slate-500">{card.label}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{card.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{card.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-all duration-300">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Monthly Revenue Trend</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Completed payments aggregated by month</p>
                </div>
                <span className="text-xl font-bold text-slate-900">${metrics.mrr.toLocaleString()}</span>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={8} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dx={-4} tickFormatter={v => `$${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
                    <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px' }} formatter={(v: any) => [`$${Number(v).toLocaleString()}`, 'Revenue']} />
                    <Area type="monotone" dataKey="mrr" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#mrrGrad)" dot={{ fill: '#6366f1', r: 4, stroke: '#fff', strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-all duration-300">
              <h2 className="text-base font-semibold text-slate-900 mb-4">Plan Distribution</h2>
              <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={planDistribution} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                      {planDistribution.map(entry => (
                        <Cell key={entry.name} fill={PLAN_COLORS[entry.name] || '#cbd5e1'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any, name: any) => [v, name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 space-y-2.5">
                {planDistribution.map(entry => (
                  <div key={entry.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PLAN_COLORS[entry.name] }} />
                      <span className="text-sm font-medium text-slate-700">{entry.name}</span>
                    </div>
                    <span className="text-sm text-slate-500">{entry.value} orgs ({entry.pct}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-all duration-300">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-900">Recent Transactions</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium">
                  <tr>
                    <th className="px-5 py-3">Organization</th>
                    <th className="px-5 py-3">Amount</th>
                    <th className="px-5 py-3">Method</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentPayments.map((p, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-medium text-slate-900">{(p.organizations as any)?.name || '—'}</td>
                      <td className="px-5 py-3 font-bold text-slate-900">${Number(p.amount).toFixed(2)}</td>
                      <td className="px-5 py-3 text-slate-500">{p.method}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' : p.status === 'Failed' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-400 text-xs">{new Date(p.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    </tr>
                  ))}
                  {recentPayments.length === 0 && (
                    <tr><td colSpan={5} className="py-10 text-center text-slate-400">No payment records found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
