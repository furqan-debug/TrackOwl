import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ChevronLeft, ChevronRight, CheckCircle, XCircle, Clock } from 'lucide-react';

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
        <div className="p-8 max-w-[1200px] mx-auto w-full fade-in">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight mb-2">Timesheet Approvals</h1>
                    <p className="text-slate-500">Review and approve tracked time for payroll.</p>
                </div>

                {/* Week Selector */}
                <div className="flex items-center gap-4 bg-white border border-slate-200 rounded-lg p-1.5 shadow-sm">
                    <button onClick={previousWeek} className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="font-medium text-slate-800 min-w-[140px] text-center text-sm">
                        {monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <button onClick={nextWeek} className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition-colors">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-6 border-b border-slate-200 mb-6">
                {(['Pending', 'Approved', 'Rejected'] as const).map(tab => {
                    const count = timesheets.filter(t => t.approval_status === tab).length;
                    return (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === tab ? 'text-primary' : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                {tab}
                                <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === tab ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                    {count}
                                </span>
                            </div>
                            {activeTab === tab && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                                <th className="px-6 py-4 font-medium">Member</th>
                                <th className="px-6 py-4 font-medium">Pay Rate</th>
                                <th className="px-6 py-4 font-medium">Tracked Time</th>
                                <th className="px-6 py-4 font-medium">Total Amount</th>
                                <th className="px-6 py-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                        Loading timesheets...
                                    </td>
                                </tr>
                            ) : displayedTimesheets.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center">
                                                <Clock className="w-6 h-6 text-slate-400" />
                                            </div>
                                            <p>No {activeTab.toLowerCase()} timesheets for this week.</p>
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
                                        <tr key={ts.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-900">{ts.full_name}</div>
                                                <div className="text-xs text-slate-500">{ts.email}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-slate-600">
                                                    ${ts.pay_rate ? ts.pay_rate.toFixed(2) : '0.00'}/hr
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-sm font-medium">
                                                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                    {formatHours(ts.total_hours)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm font-semibold text-slate-900">
                                                    ${amount.toFixed(2)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {activeTab === 'Pending' && (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleAction(ts.id, 'Rejected')}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-md transition-colors"
                                                        >
                                                            <XCircle className="w-3.5 h-3.5" />
                                                            Reject
                                                        </button>
                                                        <button
                                                            onClick={() => handleAction(ts.id, 'Approved')}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors shadow-sm"
                                                        >
                                                            <CheckCircle className="w-3.5 h-3.5" />
                                                            Approve
                                                        </button>
                                                    </div>
                                                )}
                                                {activeTab === 'Approved' && (
                                                    <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
                                                        <CheckCircle className="w-4 h-4" />
                                                        Approved
                                                    </span>
                                                )}
                                                {activeTab === 'Rejected' && (
                                                    <span className="inline-flex items-center gap-1.5 text-sm text-rose-600 font-medium">
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
            </div>
        </div>
    );
}
