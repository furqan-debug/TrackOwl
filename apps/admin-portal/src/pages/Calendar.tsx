import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
    ChevronLeft, ChevronRight,
    Palmtree, AlertCircle, Info, RefreshCw
} from 'lucide-react';
import { PageLayout, LoadingState } from '../components/ui';
import clsx from 'clsx';

interface TimeOffRequest {
    id: string;
    member_id: string;
    member_name?: string;
    start_date: string;
    end_date: string;
    type: string;
    status: string;
}

interface Holiday {
    id: string;
    name: string;
    date: string;
}

export function Calendar() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [requests, setRequests] = useState<TimeOffRequest[]>([]);
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchData();
    }, [currentDate]);

    async function fetchData(isSilent = false) {
        if (!isSilent) setLoading(true);
        else setRefreshing(true);
        
        try {
            const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
            const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString();

            const [
                { data: requestsData },
                { data: holidaysData },
                { data: membersData }
            ] = await Promise.all([
                supabase.from('time_off_requests')
                    .select('*')
                    .filter('status', 'eq', 'Approved')
                    .or(`start_date.gte.${startOfMonth},end_date.lte.${endOfMonth}`),
                supabase.from('holidays')
                    .select('*')
                    .gte('date', startOfMonth)
                    .lte('date', endOfMonth),
                supabase.from('members').select('id, full_name')
            ]);

            if (requestsData && membersData) {
                const memberMap: Record<string, string> = {};
                membersData.forEach(m => memberMap[m.id] = m.full_name);
                setRequests(requestsData.map(r => ({
                    ...r,
                    member_name: memberMap[r.member_id] || 'Unknown Member'
                })));
            }
            if (holidaysData) setHolidays(holidaysData);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

    const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
    for (let i = 1; i <= lastDayOfMonth; i++) days.push(i);

    const monthName = currentDate.toLocaleString('default', { month: 'long' });
    const year = currentDate.getFullYear();

    if (loading) return <div className="h-screen flex items-center justify-center bg-[var(--bg-main)]"><LoadingState message="Syncing operational schedule..." /></div>;

    return (
        <PageLayout
            maxWidth="full"
            title="Team Calendar"
            description="Operational schedule of approved leave and corporate milestones."
            actions={
                <div className="flex items-center gap-4">
                    <div className="p-1 rounded-md flex items-center shadow-shell-sm border border-[var(--border-color)] overflow-hidden bg-[var(--bg-surface)]">
                        <button 
                            onClick={prevMonth} 
                            className="p-2.5 hover:bg-surface-hover text-text-muted hover:text-slate-900 transition-all rounded-md"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <div className="px-6 min-w-[160px] text-center">
                            <span className="text-[12px] font-bold text-text-main whitespace-nowrap">
                                {monthName} {year}
                            </span>
                        </div>
                        <button 
                            onClick={nextMonth} 
                            className="p-2.5 hover:bg-surface-hover text-text-muted hover:text-slate-900 transition-all rounded-md"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    <button 
                        onClick={() => fetchData(true)} 
                        className={clsx(
                            "w-10 h-10 flex items-center justify-center glass-panel rounded-md transition-all shadow-shell-sm",
                            refreshing ? "text-primary animate-spin" : "text-text-muted hover:text-slate-900"
                        )}
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            }
        >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-20">
                
                {/* 📅 Compact Grid Shell (9/12) */}
                <div className="lg:col-span-9">
                    <div className="rounded-md shadow-premium overflow-hidden border border-[var(--border-color)] bg-[var(--bg-surface)]">
                        <div className="grid grid-cols-7 bg-primary/5 border-b border-[var(--border-color)]">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                                <div key={d} className="py-4 text-center">
                                    <span className="text-[10px] font-bold text-[var(--text-muted)] tracking-[0.2em]">{d}</span>
                                </div>
                            ))}
                        </div>
                        
                        <div className="grid grid-cols-7 auto-rows-[120px]">
                            {days.map((day, idx) => {
                                if (day === null) return (
                                    <div key={`empty-${idx}`} className="border-r border-b border-slate-50 bg-surface-hover/20 last:border-r-0" />
                                );

                                const dateStr = `${year}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                const dayHolidays = holidays.filter(h => h.date === dateStr);
                                const dayRequests = requests.filter(r => {
                                    const start = r.start_date;
                                    const end = r.end_date;
                                    return dateStr >= start && dateStr <= end;
                                });

                                const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear();
                                const isWeekend = idx % 7 === 0 || idx % 7 === 6;

                                return (
                                    <div 
                                        key={day} 
                                        className={clsx(
                                            "border-r border-b border-[var(--border-color)] p-3 hover:bg-primary/5 transition-all group relative overflow-hidden last:border-r-0 min-h-[120px]",
                                            isWeekend && "bg-surface-hover/40",
                                            isToday && "ring-2 ring-primary/30 z-10 bg-primary/[0.02]"
                                        )}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={clsx(
                                                "text-[12px] font-bold tracking-tight transition-colors",
                                                isToday ? "text-primary bg-primary/10 w-6 h-6 flex items-center justify-center rounded-md" : "text-[var(--text-muted)] group-hover:text-[var(--text-main)]"
                                            )}>
                                                {day}
                                            </span>
                                            {dayHolidays.length > 0 && (
                                                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]" />
                                            )}
                                        </div>
                                        
                                        <div className="space-y-1.5 overflow-y-auto max-h-[80px] no-scrollbar pr-1 mt-2">
                                            {dayHolidays.map(h => (
                                                <div key={h.id} className="bg-rose-50 text-rose-600 text-[9px] font-bold tracking-tight px-2 py-1 rounded shadow-sm border-l-2 border-rose-500 flex items-center gap-1.5">
                                                    {h.name}
                                                </div>
                                            ))}
                                            {dayRequests.map(r => (
                                                <div key={r.id} className="bg-indigo-50 text-indigo-700 text-[9px] font-bold tracking-tight px-2 py-1 rounded shadow-sm border-l-2 border-indigo-500 truncate flex items-center gap-1">
                                                    <Palmtree className="w-2.5 h-2.5 shrink-0 opacity-70" />
                                                    {r.member_name}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* 📋 Operational Sidebar (3/12) */}
                <div className="lg:col-span-3 space-y-6">
                    {/* Holiday Roll */}
                    <div className="rounded-md shadow-premium p-6 border border-[var(--border-color)] bg-[#001B4D] text-white overflow-hidden relative group">
                        <div className="absolute -top-12 -right-12 w-32 h-32 bg-surface/5 rounded-full blur-3xl" />
                        <div className="flex items-center gap-3 mb-6 relative z-10">
                            <div className="w-8 h-8 rounded-md bg-[#D4AF37] flex items-center justify-center text-[#001B4D] shadow-lg shadow-[#D4AF37]/20">
                                <AlertCircle className="w-4 h-4" />
                            </div>
                            <span className="text-[10px] font-bold tracking-[0.2em] text-white/80">Upcoming Holidays</span>
                        </div>
                        
                        <div className="space-y-4 relative z-10">
                            {holidays.length === 0 ? (
                                <div className="p-4 bg-white/5 rounded-md border border-white/10">
                                    <p className="text-[10px] text-white/60 font-bold text-center italic">No corporate milestones</p>
                                </div>
                            ) : (
                                holidays.slice(0, 4).map(h => (
                                    <div key={h.id} className="group/item flex flex-col gap-1 border-l-2 border-[#D4AF37] pl-4 py-1 hover:border-[#FDE047] transition-colors">
                                        <span className="text-[9px] font-bold text-[#D4AF37]/80">
                                            {new Date(h.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </span>
                                        <p className="text-sm font-bold text-white tracking-tight leading-tight">{h.name}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Schedule Legend */}
                    <div className="rounded-md shadow-premium p-6 border border-[var(--border-color)] bg-[var(--bg-surface)]">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center text-primary border border-primary/10">
                                <Info className="w-4 h-4" />
                            </div>
                            <span className="text-[10px] font-bold text-[var(--text-muted)] tracking-[0.2em]">Operational Legend</span>
                        </div>
                        
                        <div className="space-y-3">
                            <div className="flex items-center gap-4 p-2.5 hover:bg-surface-hover rounded-md transition-all border border-transparent hover:border-slate-100 group">
                                <div className="w-10 h-10 rounded-md bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm group-hover:scale-105 transition-transform">
                                    <Palmtree className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-text-main leading-none mb-1">Approved Leave</p>
                                    <p className="text-[9px] text-text-muted font-bold tracking-tight">Time-off records</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-4 p-2.5 hover:bg-surface-hover rounded-md transition-all border border-transparent hover:border-slate-100 group">
                                <div className="w-10 h-10 rounded-md bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shadow-sm group-hover:scale-105 transition-transform">
                                    <AlertCircle className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-text-main leading-none mb-1">Holiday Event</p>
                                    <p className="text-[9px] text-text-muted font-bold tracking-tight">Corporate non-working</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Insight */}
                    <div className="p-5 bg-surface-hover border border-border rounded-md text-center shadow-sm">
                        <p className="text-[10px] font-bold text-text-muted leading-relaxed">
                            Team attendance is synchronized with <br/> global workspace policies.
                        </p>
                    </div>
                </div>
            </div>
        </PageLayout>
    );
}
