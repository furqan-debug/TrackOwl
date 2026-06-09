import { useEffect, useState } from 'react';
import { BarChart3, Users, UserPlus, MousePointerClick, TrendingUp, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { supabase } from '../../lib/supabase';

export function UserAnalytics() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({ totalUsers: 0, activeUsers: 0, dau: 0, mau: 0, newUsers: 0, newOrgs: 0 });
  const [activityData, setActivityData] = useState<any[]>([]);
  const [growthData, setGrowthData] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const now = new Date();
        const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
        const yesterday = new Date(Date.now() - 86400000).toISOString();
        const sevenDaysAgo = new Date(Date.now() - 6 * 86400000);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const [
          { count: totalUsers },
          { count: activeUsers },
          { count: newUsers },
          { count: newOrgs },
          { data: dauSessions },
          { data: mauSessions },
          { data: allMemberGrowth },
          { data: allOrgGrowth },
        ] = await Promise.all([
          supabase.from('members').select('id', { count: 'exact', head: true }),
          supabase.from('members').select('id', { count: 'exact', head: true }).eq('status', 'Active'),
          supabase.from('members').select('id', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
          supabase.from('organizations').select('id', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
          supabase.from('sessions').select('user_id, created_at').gte('created_at', yesterday),
          supabase.from('sessions').select('user_id').gte('created_at', thirtyDaysAgo),
          supabase.from('members').select('created_at').gte('created_at', new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString()),
          supabase.from('organizations').select('created_at').gte('created_at', new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString()),
        ]);

        const uniqueDAU = new Set(dauSessions?.map(s => s.user_id)).size;
        const uniqueMAU = new Set(mauSessions?.map(s => s.user_id)).size;

        // Daily active users (last 7 days)
        const daysMap = new Map();
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          daysMap.set(dateStr, { day: d.toLocaleDateString('en-US', { weekday: 'short' }), active: 0, _users: new Set() });
        }
        dauSessions?.forEach(s => {
          const dateStr = new Date(s.created_at).toISOString().split('T')[0];
          if (daysMap.has(dateStr)) daysMap.get(dateStr)._users.add(s.user_id);
        });
        setActivityData(Array.from(daysMap.values()).map(d => ({ day: d.day, active: d._users.size })));

        // Monthly member & org growth (last 6 months)
        const growthMap = new Map();
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          growthMap.set(`${d.getFullYear()}-${d.getMonth()}`, { month: d.toLocaleDateString('en-US', { month: 'short' }), newMembers: 0, newOrgs: 0 });
        }
        allMemberGrowth?.forEach(m => {
          const d = new Date(m.created_at);
          const key = `${d.getFullYear()}-${d.getMonth()}`;
          if (growthMap.has(key)) growthMap.get(key).newMembers++;
        });
        allOrgGrowth?.forEach(o => {
          const d = new Date(o.created_at);
          const key = `${d.getFullYear()}-${d.getMonth()}`;
          if (growthMap.has(key)) growthMap.get(key).newOrgs++;
        });
        setGrowthData(Array.from(growthMap.values()));

        setMetrics({ totalUsers: totalUsers || 0, activeUsers: activeUsers || 0, newUsers: newUsers || 0, newOrgs: newOrgs || 0, dau: uniqueDAU, mau: uniqueMAU });
      } catch (err) {
        console.error('Analytics load error', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">User Analytics</h1>
        <p className="text-slate-500 mt-1">Platform engagement, growth, and retention metrics</p>
      </div>

      {loading ? (
        <div className="p-16 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : (
        <>
          {/* Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: 'Total Members', value: metrics.totalUsers.toLocaleString(), sub: 'All-time signups', icon: Users, color: 'bg-blue-50 text-blue-600' },
              { label: 'Active Members', value: metrics.activeUsers.toLocaleString(), sub: `${metrics.totalUsers > 0 ? Math.round((metrics.activeUsers / metrics.totalUsers) * 100) : 0}% of total`, icon: UserPlus, color: 'bg-emerald-50 text-emerald-600' },
              { label: 'DAU', value: metrics.dau.toLocaleString(), sub: 'Unique users with sessions in 24h', icon: MousePointerClick, color: 'bg-amber-50 text-amber-600' },
              { label: 'MAU', value: metrics.mau.toLocaleString(), sub: 'Unique users with sessions in 30d', icon: BarChart3, color: 'bg-indigo-50 text-indigo-600' },
              { label: 'New Members (30d)', value: metrics.newUsers.toLocaleString(), sub: 'Members joined in last 30 days', icon: TrendingUp, color: 'bg-purple-50 text-purple-600' },
              { label: 'New Orgs (30d)', value: metrics.newOrgs.toLocaleString(), sub: 'Organizations created in last 30 days', icon: Clock, color: 'bg-rose-50 text-rose-600' },
            ].map(card => (
              <div key={card.label} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className={`inline-flex p-2.5 rounded-xl mb-3 ${card.color}`}>
                  <card.icon className="w-5 h-5" />
                </div>
                <p className="text-sm font-medium text-slate-500">{card.label}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{card.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{card.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Active Users */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="mb-6">
                <h2 className="text-base font-semibold text-slate-900">Daily Active Users (7 days)</h2>
                <p className="text-xs text-slate-400 mt-0.5">Unique users with at least one session per day</p>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activityData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={8} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dx={-4} allowDecimals={false} />
                    <Tooltip cursor={{ fill: '#f8fafc', radius: 4 }} contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px' }} />
                    <Bar dataKey="active" name="Active Users" fill="#3b82f6" radius={[5, 5, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Monthly Growth Chart */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="mb-6">
                <h2 className="text-base font-semibold text-slate-900">Monthly Growth (6 months)</h2>
                <p className="text-xs text-slate-400 mt-0.5">New members and organizations per month</p>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={growthData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={8} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dx={-4} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px' }} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                    <Line type="monotone" dataKey="newMembers" name="New Members" stroke="#3b82f6" strokeWidth={2.5} dot={{ fill: '#3b82f6', r: 4, stroke: '#fff', strokeWidth: 2 }} />
                    <Line type="monotone" dataKey="newOrgs" name="New Orgs" stroke="#6366f1" strokeWidth={2.5} dot={{ fill: '#6366f1', r: 4, stroke: '#fff', strokeWidth: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* DAU/MAU Ratio */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Engagement Ratio (DAU / MAU)</h2>
            <div className="flex items-center gap-6">
              <div className="text-4xl font-bold text-slate-900">
                {metrics.mau > 0 ? `${((metrics.dau / metrics.mau) * 100).toFixed(1)}%` : '—'}
              </div>
              <div>
                <p className="text-sm text-slate-600">A ratio above 20% indicates strong daily engagement.</p>
                <p className="text-xs text-slate-400 mt-1">DAU: {metrics.dau} · MAU: {metrics.mau}</p>
              </div>
              <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden ml-4">
                <div
                  className={`h-full rounded-full ${metrics.mau > 0 && (metrics.dau / metrics.mau) > 0.2 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                  style={{ width: `${metrics.mau > 0 ? Math.min((metrics.dau / metrics.mau) * 100, 100) : 0}%` }}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
