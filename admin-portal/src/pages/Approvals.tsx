import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ChevronLeft, ChevronRight, CheckCircle, XCircle, Clock } from 'lucide-react';
import { PageHeader, Card } from '../components/ui';

interface Member {
    id: string;
    full_name: string;
    email: string;
    pay_rate: number;
    bill_rate: number;
}

interface ApprovalRecord {
    id?: string; // might not exist if pending
    member_id: string;
    week_start: string;
    week_end: string;
    total_hours: number;
    status: 'Pending' | 'Approved' | 'Rejected';
    approved_by?: string;
    approved_at?: string;
}

interface MemberTimesheet extends Member {
    total_hours: number;
    approval_status: 'Pending' | 'Approved' | 'Rejected';
    approval_record?: ApprovalRecord;
}

export function Approvals() {
    const [loading, setLoading] = useState(true);
    const [timesheets, setTimesheets] = useState<MemberTimesheet[]>([]);
    const [activeTab, setActiveTab] = useState<'Pending' | 'Approved' | 'Rejected'>('Pending');
    const [currentDate, setCurrentDate] = useState(new Date());

    // Week bounds
    const getWeekBounds = (date: Date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        monday.setHours(0, 0, 0, 0);

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);

        return { monday, sunday };
    };

    const { monday, sunday } = getWeekBounds(currentDate);
    const weekStartStr = monday.toISOString().split('T')[0];
    const weekEndStr = sunday.toISOString().split('T')[0];

    useEffect(() => {
        fetchData();
    }, [currentDate]);

    async function fetchData() {
        setLoading(true);

        // 1. Fetch active members
        const { data: membersData } = await supabase
            .from('members')
            .select('*')
            .eq('status', 'Active');

        if (!membersData) return;

        // 2. Fetch sessions for the week to calculate hours
        const { data: sessionsData } = await supabase
            .from('sessions')
            .select('user_id, started_at, ended_at')
            .gte('started_at', monday.toISOString())
            .lte('started_at', sunday.toISOString())
            .not('ended_at', 'is', null);

        // 3. Fetch existing approval records for the week
        const { data: approvalsData } = await supabase
            .from('timesheet_approvals')
            .select('*')
            .eq('week_start', weekStartStr)
            .eq('week_end', weekEndStr);

        // 4. Combine data
        const calculatedTimesheets: MemberTimesheet[] = membersData.map(member => {
            // Find sessions for this member
            const memberSessions = (sessionsData || []).filter(s => s.user_id === member.id);

            // Calculate total hours
            const totalMs = memberSessions.reduce((acc, s) => {
                const start = new Date(s.started_at).getTime();
                const end = new Date(s.ended_at!).getTime();
                return acc + (end - start);
            }, 0);
            const total_hours = totalMs / (1000 * 60 * 60);

            // Find existing approval record
            const approvalRecord = (approvalsData || []).find(a => a.member_id === member.id);

            return {
                ...member,
                total_hours,
                approval_status: approvalRecord ? approvalRecord.status : 'Pending',
                approval_record: approvalRecord || {
                    member_id: member.id,
                    week_start: weekStartStr,
                    week_end: weekEndStr,
                    total_hours: total_hours,
                    status: 'Pending'
                }
            };
        });

        // Only show timesheets that have > 0 hours, OR already have an approval record
        const relevantTimesheets = calculatedTimesheets.filter(t => t.total_hours > 0 || t.approval_record?.id);

        setTimesheets(relevantTimesheets);
        setLoading(false);
    }

    const handleAction = async (memberId: string, action: 'Approved' | 'Rejected') => {
        const timesheet = timesheets.find(t => t.id === memberId);
        if (!timesheet) return;

        // Get current admin user details logic normally would go here
        // For now, we will just upsert without the exact approved_by if not available yet

        const payload = {
            member_id: memberId,
            week_start: weekStartStr,
            week_end: weekEndStr,
            total_hours: timesheet.total_hours,
            status: action,
            approved_at: new Date().toISOString()
        };

        if (timesheet.approval_record?.id) {
            // Update existing
            await supabase
                .from('timesheet_approvals')
                .update(payload)
                .eq('id', timesheet.approval_record.id);
        } else {
            // Insert new
            await supabase
                .from('timesheet_approvals')
                .insert([payload]);
        }

        // Optimistic update
        setTimesheets(prev => prev.map(t => {
            if (t.id === memberId) {
                return {
                    ...t,
                    approval_status: action,
                    approval_record: { ...t.approval_record, ...payload } as ApprovalRecord
                };
            }
            return t;
        }));
    };

    const previousWeek = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() - 7);
        setCurrentDate(newDate);
    };

    const nextWeek = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + 7);
        setCurrentDate(newDate);
    };

    const displayedTimesheets = timesheets.filter(t => t.approval_status === activeTab);

    return (
        <div className="min-h-screen bg-background pb-20">
            <PageHeader 
                title="Timesheet Approvals" 
                description="Review and approve tracked time for payroll"
                icon={<CheckCircle className="w-8 h-8 text-primary" />}
                actions={
                    <div className="flex items-center gap-1 bg-surface-solid border border-border rounded-xl p-1 shadow-sm">
                        <button onClick={previousWeek} className="p-2 hover:bg-black/[0.03] rounded-lg transition-all text-text-muted hover:text-primary group">
                            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" strokeWidth={3} />
                        </button>
                        <div className="px-6 flex items-center justify-center min-w-[200px]">
                            <span className="text-[11px] font-bold text-text-primary uppercase tracking-[0.2em] font-mono">
                                {monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                        </div>
                        <button onClick={nextWeek} className="p-2 hover:bg-black/[0.03] rounded-lg transition-all text-text-muted hover:text-primary group">
                            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" strokeWidth={3} />
                        </button>
                    </div>
                }
            />

            <div className="px-10 space-y-10">
                <Card noPadding className="overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-1000">
                    {/* Tabs */}
                    <div className="flex gap-8 border-b border-border px-8 pt-4 bg-surface-subtle/30">
                        {(['Pending', 'Approved', 'Rejected'] as const).map(tab => {
                            const count = timesheets.filter(t => t.approval_status === tab).length;
                            return (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`pb-4 text-[10px] font-bold uppercase tracking-[0.2em] transition-all relative font-mono ${activeTab === tab ? 'text-primary' : 'text-text-muted hover:text-text-primary'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        {tab}
                                        <span className={`px-2 py-1 rounded-md text-[9px] ${activeTab === tab ? 'bg-primary/10 text-primary' : 'bg-surface-subtle border border-border text-text-muted'}`}>
                                            {count}
                                        </span>
                                    </div>
                                    {activeTab === tab && (
                                        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-surface-subtle/30 border-b border-border">
                                    <th className="px-10 py-8 text-[11px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono">Member</th>
                                    <th className="px-10 py-8 text-[11px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono">Pay Rate</th>
                                    <th className="px-10 py-8 text-[11px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono">Tracked Time</th>
                                    <th className="px-10 py-8 text-[11px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono">Total Amount</th>
                                    <th className="px-10 py-8 text-[11px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="px-10 py-12 text-center text-text-muted font-mono text-[11px] tracking-widest uppercase">
                                            Loading timesheets...
                                        </td>
                                    </tr>
                                ) : displayedTimesheets.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-10 py-16 text-center text-text-muted">
                                            <div className="flex flex-col items-center justify-center gap-4">
                                                <div className="w-14 h-14 bg-surface-subtle rounded-2xl flex items-center justify-center border border-border">
                                                    <Clock className="w-6 h-6 text-text-muted opacity-50" />
                                                </div>
                                                <p className="text-[11px] font-mono font-bold uppercase tracking-widest opacity-80">No {activeTab.toLowerCase()} timesheets for this week</p>
                                            </div>
                                        </td>
                                    </tr>
                            ) : (
                                displayedTimesheets.map((ts) => {
                                    const amount = ts.total_hours * (ts.pay_rate || 0);

                                    const formatHours = (decimalHours: number) => {
                                        const h = Math.floor(decimalHours);
                                        const m = Math.round((decimalHours - h) * 60);
                                        return `${h}h ${m}m`;
                                    };

                                    return (
                                        <tr key={ts.id} className="hover:bg-primary/[0.01] transition-all group duration-500">
                                            <td className="px-10 py-8">
                                                <div className="flex items-center gap-5">
                                                    <div className="w-12 h-12 rounded-2xl bg-surface-subtle border border-border flex items-center justify-center text-text-primary font-bold text-[12px] group-hover:bg-primary group-hover:text-white group-hover:border-primary/20 transition-all duration-500 font-mono shadow-sm">
                                                        {ts.full_name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-text-primary text-[15px] tracking-tight group-hover:text-primary transition-colors duration-500">{ts.full_name}</span>
                                                        <span className="text-[10px] text-text-muted font-mono tracking-wider opacity-60 mt-1">{ts.email}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-10 py-8">
                                                <span className="text-[14px] font-bold text-text-primary font-mono tracking-tight opacity-70">
                                                    ${ts.pay_rate ? ts.pay_rate.toFixed(2) : '0.00'}/hr
                                                </span>
                                            </td>
                                            <td className="px-10 py-8">
                                                <span className="inline-flex items-center gap-3 px-4 py-2 bg-surface-subtle border border-border rounded-xl shadow-sm">
                                                    <Clock className="w-4 h-4 text-primary" />
                                                    <span className="font-bold text-text-primary text-[11px] uppercase font-mono italic tracking-tight">{formatHours(ts.total_hours)}</span>
                                                </span>
                                            </td>
                                            <td className="px-10 py-8">
                                                <span className="text-[16px] font-black text-text-primary font-mono italic tracking-tighter">
                                                    ${amount.toFixed(2)}
                                                </span>
                                            </td>
                                            <td className="px-10 py-8 text-right">
                                                {activeTab === 'Pending' && (
                                                    <div className="flex items-center justify-end gap-3">
                                                        <button
                                                            onClick={() => handleAction(ts.id, 'Rejected')}
                                                            className="flex items-center gap-1.5 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors shadow-sm font-mono"
                                                        >
                                                            <XCircle className="w-4 h-4" />
                                                            Reject
                                                        </button>
                                                        <button
                                                            onClick={() => handleAction(ts.id, 'Approved')}
                                                            className="flex items-center gap-1.5 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors shadow-sm font-mono"
                                                        >
                                                            <CheckCircle className="w-4 h-4" />
                                                            Approve
                                                        </button>
                                                    </div>
                                                )}
                                                {activeTab === 'Approved' && (
                                                    <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 shadow-sm font-mono italic">
                                                        <CheckCircle className="w-4 h-4" />
                                                        Approved
                                                    </span>
                                                )}
                                                {activeTab === 'Rejected' && (
                                                    <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] text-rose-600 bg-rose-500/10 border border-rose-500/20 shadow-sm font-mono italic">
                                                        <XCircle className="w-4 h-4" />
                                                        Rejected
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
            </div>
        </div>
    );
}
