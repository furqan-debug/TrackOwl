import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Users, CreditCard, Settings, ExternalLink, UserCircle, Globe } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const PLAN_BADGE: Record<string, string> = {
  Enterprise: 'bg-indigo-100 text-indigo-700',
  Pro: 'bg-blue-100 text-blue-700',
  Starter: 'bg-slate-100 text-slate-600',
};

export function OrganizationDetails() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [sessions, setSessions] = useState<{ total: number; active: number }>({ total: 0, active: 0 });
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from('organizations').select('*').eq('id', id).single(),
      supabase.from('members').select('*').eq('organization_id', id).order('created_at', { ascending: false }),
      supabase.from('sessions').select('id, ended_at', { count: 'exact' }).eq('organization_id', id),
      supabase.from('sessions').select('user_id').eq('organization_id', id).is('ended_at', null).gte('started_at', new Date(Date.now() - 86400000).toISOString()),
      supabase.from('payments').select('amount, status, method, created_at').eq('organization_id', id).order('created_at', { ascending: false }).limit(10),
    ]).then(([orgRes, membersRes, sessionsRes, activeRes, paymentsRes]) => {
      setOrg(orgRes.data);
      setMembers(membersRes.data || []);
      setSessions({ total: sessionsRes.count || 0, active: activeRes.data ? new Set(activeRes.data.map((s: any) => s.user_id)).size : 0 });
      setPayments(paymentsRes.data || []);
      setLoading(false);
    }).catch(err => { console.error(err); setLoading(false); });
  }, [id]);

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!org) return <div className="max-w-7xl mx-auto py-12 text-center text-slate-500">Organization not found.</div>;

  const owner = members.find(m => m.role === 'Admin') || members[0];
  const activeMembers = members.filter(m => m.status === 'Active').length;
  const seatsUsed = org.member_count ?? members.length;
  const seatLimit = org.seat_limit ?? 10;
  const seatPct = Math.min((seatsUsed / seatLimit) * 100, 100);
  const totalRevenue = payments.filter(p => p.status === 'Completed').reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/organizations" className="p-2 -ml-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-lg uppercase">
              {org.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900">{org.name}</h1>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${PLAN_BADGE[org.plan_tier]}`}>{org.plan_tier}</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">ID: {org.id}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Members', value: members.length, icon: Users },
          { label: 'Active Members', value: activeMembers, icon: UserCircle },
          { label: 'Total Sessions', value: sessions.total.toLocaleString(), icon: Globe },
          { label: 'Active Sessions', value: sessions.active, icon: Globe },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">{stat.label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-5 pb-3 border-b border-slate-100">Organization Profile</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[
                { label: 'Name', value: org.name },
                { label: 'Industry', value: org.industry || '—' },
                { label: 'Size', value: org.size || '—' },
                { label: 'Created', value: new Date(org.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) },
                { label: 'Owner Email', value: owner?.email || '—' },
                { label: 'Owner Name', value: owner?.full_name || '—' },
              ].map(field => (
                <div key={field.label}>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">{field.label}</p>
                  <p className="text-sm font-medium text-slate-900">{field.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Members Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Members ({members.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium">
                  <tr>
                    <th className="px-5 py-3">Member</th>
                    <th className="px-5 py-3">Role</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Pay Rate</th>
                    <th className="px-5 py-3">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {members.map(m => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <p className="font-medium text-slate-900">{m.full_name}</p>
                        <p className="text-xs text-slate-400">{m.email}</p>
                      </td>
                      <td className="px-5 py-3 text-slate-500">{m.role}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${m.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {m.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-600">{m.pay_rate ? `$${m.pay_rate}/hr` : '—'}</td>
                      <td className="px-5 py-3 text-slate-400 text-xs">{new Date(m.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {members.length === 0 && (
                    <tr><td colSpan={5} className="py-10 text-center text-slate-400">No members found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment History */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Payment History</h2>
              <span className="text-sm font-semibold text-emerald-700">Total: ${totalRevenue.toFixed(2)}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium">
                  <tr>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Amount</th>
                    <th className="px-5 py-3">Method</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((p, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-5 py-3 text-slate-500">{new Date(p.created_at).toLocaleDateString()}</td>
                      <td className="px-5 py-3 font-semibold text-slate-900">${Number(p.amount).toFixed(2)}</td>
                      <td className="px-5 py-3 text-slate-500">{p.method}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' : p.status === 'Failed' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {payments.length === 0 && (
                    <tr><td colSpan={4} className="py-10 text-center text-slate-400">No payment records found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Subscription Card */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
            <h2 className="text-base font-semibold text-slate-900 mb-5 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" /> Subscription
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Plan</span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${PLAN_BADGE[org.plan_tier]}`}>{org.plan_tier}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Billing Cycle</span>
                <span className="text-sm font-medium text-slate-900">{org.subscription_period || 'Monthly'}</span>
              </div>
              {org.stripe_customer_id && (
                <div>
                  <p className="text-xs text-slate-400 mb-1">Stripe Customer</p>
                  <p className="text-xs font-mono text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-200 truncate">{org.stripe_customer_id}</p>
                </div>
              )}
              {org.stripe_subscription_id && (
                <div>
                  <p className="text-xs text-slate-400 mb-1">Stripe Subscription</p>
                  <p className="text-xs font-mono text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-200 truncate">{org.stripe_subscription_id}</p>
                </div>
              )}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-500 flex items-center gap-1.5"><Users className="w-4 h-4" /> Seats</span>
                  <span className="font-semibold text-slate-900">{seatsUsed} / {seatLimit}</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${seatPct > 90 ? 'bg-red-500' : seatPct > 70 ? 'bg-amber-500' : 'bg-primary'}`} style={{ width: `${seatPct}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button className="px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors">Manage Plan</button>
                <button className="px-3 py-2 border border-red-200 text-red-600 rounded-lg text-xs font-medium hover:bg-red-50 transition-colors">Suspend Org</button>
              </div>
            </div>
          </div>

          {/* Super Admin Actions */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
            <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Settings className="w-4 h-4 text-slate-400" /> Super Admin Actions
            </h2>
            <div className="space-y-1">
              {[
                'Impersonate Owner',
                'View Raw Activity Logs',
                'Reset 2FA for Owner',
                'Force Password Reset',
                'Export Org Data (CSV)',
                'Delete Organization',
              ].map((action, i) => (
                <button key={i} className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center justify-between group ${action.startsWith('Delete') ? 'text-red-600 hover:bg-red-50' : 'text-slate-700 hover:bg-slate-50'}`}>
                  {action}
                  <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
