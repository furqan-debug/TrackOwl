import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
    Calendar as CalendarIcon, ChevronLeft, ChevronRight,
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

    if (loading) return <div className="h-screen flex items-center justify-center bg-white"><LoadingState message="Syncing operational schedule..." /></div>;

    return (
        <PageLayout
            maxWidth="full"
            title="Team Calendar"
            description="Operational schedule of approved leave and corporate milestones."
            actions={
                <div className="flex items-center gap-4">
                    <div className="glass-panel p-1 rounded-xl flex items-center shadow-sm border-slate-200/60 overflow-hidden bg-white/50">
                        <button 
                            onClick={prevMonth} 
                            className="p-2.5 hover:bg-slate-50 text-slate-400 hover:text-slate-900 transition-all rounded-lg"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <div className="px-6 min-w-[160px] text-center">
                            <span className="text-[12px] font-bold text-slate-900 uppercase tracking-widest whitespace-nowrap">
                                {monthName} {year}
                            </span>
                        </div>
                        <button 
                            onClick={nextMonth} 
                            className="p-2.5 hover:bg-slate-50 text-slate-400 hover:text-slate-900 transition-all rounded-lg"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    <button 
                        onClick={() => fetchData(true)} 
                        className={clsx(
                            "w-10 h-10 flex items-center justify-center glass-panel rounded-xl transition-all shadow-sm",
                            refreshing ? "text-primary animate-spin" : "text-slate-400 hover:text-slate-900"
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
                    <div className="glass-panel rounded-[24px] shadow-premium overflow-hidden border-slate-200/60 bg-white/50">
                        <div className="grid grid-cols-7 bg-slate-50/50 border-b border-slate-100">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                                <div key={d} className="py-4 text-center">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{d}</span>
                                </div>
                            ))}
                        </div>
                        
                        <div className="grid grid-cols-7 auto-rows-[120px]">
                            {days.map((day, idx) => {
                                if (day === null) return (
                                    <div key={`empty-${idx}`} className="border-r border-b border-slate-50 bg-slate-50/20 last:border-r-0" />
                                );

                                const dateStr = `${year}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                const dayHolidays = holidays.filter(h => h.date === dateStr);
                                const dayRequests = requests.filter(r => {
                                    const start = r.start_date;
                                    const end = r.end_date;
                                    return dateStr >= start && dateStr <= end;
                                });

                                return (
                                    <div 
                                        key={day} 
                                        className={clsx(
                                            "border-r border-b border-slate-50 p-3 hover:bg-white transition-all group relative overflow-hidden last:border-r-0",
                                            dayRequests.length > 0 && "bg-indigo-50/10"
                                        )}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-[11px] font-bold text-slate-400 group-hover:text-slate-900 transition-colors uppercase tracking-tight">
                                                {day}
                                            </span>
                                            {dayHolidays.length > 0 && (
                                                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-glow-rose" />
                                            )}
                                        </div>
                                        
                                        <div className="space-y-1 overflow-y-auto max-h-[80px] no-scrollbar pr-1">
                                            {dayHolidays.map(h => (
                                                <div key={h.id} className="bg-rose-50 text-rose-600 text-[9px] font-bold uppercase tracking-tight px-2 py-1 rounded-md border border-rose-100 flex items-center gap-1.5 shadow-sm">
                                                    {h.name}
                                                </div>
                                            ))}
                                            {dayRequests.map(r => (
                                                <div key={r.id} className="bg-indigo-600 text-white text-[9px] font-bold uppercase tracking-tight px-2 py-1 rounded-md shadow-sm truncate">
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
                    <div className="glass-panel rounded-[24px] shadow-premium p-8 border-slate-200/60 bg-slate-900 text-white overflow-hidden relative group">
                        <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/5 rounded-full blur-3xl" />
                        <div className="flex items-center gap-3 mb-8 relative z-10">
                            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white shadow-glow-primary">
                                <AlertCircle className="w-4 h-4" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-200">Upcoming Holidays</span>
                        </div>
                        
                        <div className="space-y-5 relative z-10">
                            {holidays.length === 0 ? (
                                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest text-center italic">No corporate milestones</p>
                                </div>
                            ) : (
                                holidays.slice(0, 4).map(h => (
                                    <div key={h.id} className="group/item flex flex-col gap-1 border-l-2 border-indigo-500/30 pl-4 py-1 hover:border-indigo-400 transition-colors">
                                        <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">
                                            {new Date(h.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </span>
                                        <p className="text-sm font-bold text-white tracking-tight leading-tight">{h.name}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Schedule Legend */}
                    <div className="glass-panel rounded-[24px] shadow-premium p-8 border-slate-200/60 bg-white/50">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                                <Info className="w-4 h-4" />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Operational Legend</span>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="flex items-center gap-4 p-3 hover:bg-white rounded-xl transition-all border border-transparent hover:border-slate-100 group">
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm group-hover:scale-105 transition-transform">
                                    <Palmtree className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-slate-900 uppercase tracking-widest leading-none mb-1">Approved Leave</p>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Time-off records</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-4 p-3 hover:bg-white rounded-xl transition-all border border-transparent hover:border-slate-100 group">
                                <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shadow-sm group-hover:scale-105 transition-transform">
                                    <AlertCircle className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-slate-900 uppercase tracking-widest leading-none mb-1">Holiday Event</p>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Corporate non-working</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Insight */}
                    <div className="p-6 bg-slate-50 border border-slate-100 rounded-[24px] text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                            Team attendance is synchronized with <br/> global workspace policies.
                        </p>
                    </div>
                </div>
            </div>
        </PageLayout>
    );
}
