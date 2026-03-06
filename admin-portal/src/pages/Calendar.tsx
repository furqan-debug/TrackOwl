import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
    Calendar as CalendarIcon, ChevronLeft, ChevronRight,
    Palmtree, AlertCircle
} from 'lucide-react';

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

    useEffect(() => {
        fetchData();
    }, [currentDate]);

    async function fetchData() {
        setLoading(true);
        // Start of range: 1st day of current month
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
        // End of range: last day of current month
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
        setLoading(false);
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

    return (
        <div className="p-8 max-w-[1600px] mx-auto w-full fade-in">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-4">
                        <div className="bg-indigo-600 p-2.5 rounded-2xl shadow-xl shadow-indigo-100 ring-4 ring-indigo-50">
                            <CalendarIcon className="w-8 h-8 text-white" />
                        </div>
                        Team Calendar
                    </h1>
                    <p className="text-slate-500 mt-3 font-medium text-lg">Visual schedule of approved leave and corporate holidays.</p>
                </div>

                <div className="flex items-center gap-4 bg-white border border-slate-200 p-1.5 rounded-2xl shadow-sm">
                    <button onClick={prevMonth} className="p-2.5 hover:bg-slate-50 rounded-xl transition-all text-slate-400 hover:text-indigo-600">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <span className="text-lg font-black text-slate-800 px-4 min-w-[180px] text-center uppercase tracking-widest">
                        {monthName} {year}
                    </span>
                    <button onClick={nextMonth} className="p-2.5 hover:bg-slate-50 rounded-xl transition-all text-slate-400 hover:text-indigo-600">
                        <ChevronRight className="w-6 h-6" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* CALENDAR GRID */}
                <div className="lg:col-span-3 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden min-h-[700px]">
                    {loading ? (
                        <div className="h-full w-full flex flex-col items-center justify-center p-24">
                            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Syncing Schedule...</p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                                    <div key={d} className="py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                        {d}
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 auto-rows-[140px]">
                                {days.map((day, idx) => {
                                    if (day === null) return <div key={`empty-${idx}`} className="border-r border-b border-slate-50 bg-slate-50/20" />;

                                    const dateStr = `${year}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                    const dayHolidays = holidays.filter(h => h.date === dateStr);
                                    const dayRequests = requests.filter(r => {
                                        const start = r.start_date;
                                        const end = r.end_date;
                                        return dateStr >= start && dateStr <= end;
                                    });

                                    return (
                                        <div key={day} className="border-r border-b border-slate-50 p-4 hover:bg-slate-50/50 transition-all group overflow-hidden">
                                            <span className="text-sm font-black text-slate-400 group-hover:text-indigo-600 transition-colors uppercase">{day}</span>
                                            <div className="mt-2 space-y-1.5 overflow-y-auto max-h-[80px] no-scrollbar">
                                                {dayHolidays.map(h => (
                                                    <div key={h.id} className="bg-rose-50 text-rose-600 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border border-rose-100 flex items-center gap-1.5">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                                        {h.name}
                                                    </div>
                                                ))}
                                                {dayRequests.map(r => (
                                                    <div key={r.id} className="bg-indigo-50 text-indigo-700 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border border-indigo-100 truncate shadow-sm">
                                                        {r.member_name}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>

                {/* SIDEBAR: LEGEND & UPCOMING */}
                <div className="space-y-8">
                    <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-indigo-200 overflow-hidden relative group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform duration-500" />
                        <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-6">Upcoming Holidays</h3>
                        <div className="space-y-6">
                            {holidays.length === 0 ? (
                                <p className="text-indigo-200/50 text-xs italic">No holidays this month.</p>
                            ) : (
                                holidays.map(h => (
                                    <div key={h.id} className="flex flex-col gap-1 border-l-2 border-indigo-500/30 pl-4 py-1">
                                        <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">{new Date(h.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                                        <p className="text-sm font-black text-white">{h.name}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Legend</h3>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                                    <Palmtree className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-slate-800 uppercase tracking-widest">Time Off</p>
                                    <p className="text-[10px] text-slate-400 font-medium">Approved leave requests</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center">
                                    <AlertCircle className="w-5 h-5 text-rose-600" />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-slate-800 uppercase tracking-widest">Holiday</p>
                                    <p className="text-[10px] text-slate-400 font-medium">Corporate non-working days</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
