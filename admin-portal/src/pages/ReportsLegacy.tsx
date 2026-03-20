import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { FileText, Search, Download, Filter, User, Clock, Users } from 'lucide-react';

interface LegacyRow {
    member: string;
    project: string;
    date: string;
    duration: number;
    activity: number;
}

export function ReportsLegacy() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<LegacyRow[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [range, setRange] = useState('Last 7 Days');
    const [members, setMembers] = useState<{ id: string; full_name: string }[]>([]);
    const [selectedMemberId, setSelectedMemberId] = useState<string>('all');

    useEffect(() => {
        supabase.from('members').select('id, full_name').eq('status', 'Active').then(({ data }) => {
            if (data) setMembers(data);
        });
    }, []);

    useEffect(() => {
        fetchLegacyData();
    }, [range, selectedMemberId]);

    async function fetchLegacyData() {
        setLoading(true);
        const now = new Date();
        let start: Date;
        if (range === 'Today') start = new Date(now.setHours(0, 0, 0, 0));
        else if (range === 'Last 7 Days') start = new Date(Date.now() - 7 * 86400000);
        else start = new Date(Date.now() - 30 * 86400000);

        let sessionIds: string[] | null = null;
        if (selectedMemberId !== 'all') {
            const { data: userSessions } = await supabase.from('sessions').select('id').eq('user_id', selectedMemberId);
            if (!userSessions || userSessions.length === 0) {
                setData([]);
                setLoading(false);
                return;
            }
            sessionIds = userSessions.map(s => s.id);
        }

        let samplesQuery = supabase.from('activity_samples').select('*, sessions(user_id, project_id)').gte('recorded_at', start.toISOString()).order('recorded_at', { ascending: false });
        if (sessionIds && sessionIds.length > 0) {
            samplesQuery = samplesQuery.in('session_id', sessionIds);
        }

        const [
            { data: samples },
            { data: membersList },
            { data: projects }
        ] = await Promise.all([
            samplesQuery,
            supabase.from('members').select('id, full_name'),
            supabase.from('projects').select('id, name')
        ]);

        if (samples && membersList && projects) {
            const memberMap: Record<string, string> = {};
            membersList.forEach(m => {
                const key = m.id;
                memberMap[key] = m.full_name;
            });

            const projectMap: Record<string, string> = {};
            projects.forEach(p => {
                projectMap[p.id] = p.name;
            });

            const formatted = samples.map((s: any) => ({
                member: memberMap[s.sessions?.user_id] || s.sessions?.user_id?.slice(0, 8) || 'Unknown',
                project: projectMap[s.sessions?.project_id] || 'General',
                date: new Date(s.recorded_at).toLocaleString(),
                duration: 1, // each sample is roughly 1 min
                activity: s.activity_percent
            }));
            setData(formatted);
        }
        setLoading(false);
    }

    const filtered = data.filter(d =>
        d.member.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.project.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-8 max-w-[1400px] mx-auto w-full fade-in">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight mb-2 flex items-center gap-3">
                        <FileText className="w-7 h-7 text-slate-400" />
                        Time & Activity (Legacy)
                    </h1>
                    <p className="text-slate-500">Classic tabular view of all recorded activity samples.</p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Member Filter */}
                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm">
                        <Users className="w-4 h-4 text-slate-400" />
                        <select
                            value={selectedMemberId}
                            onChange={(e) => setSelectedMemberId(e.target.value)}
                            className="text-sm font-medium text-slate-700 bg-transparent outline-none cursor-pointer w-48 truncate"
                        >
                            <option value="all">Entire Organization</option>
                            <option disabled>──────────</option>
                            {members.map(m => (
                                <option key={m.id} value={m.id}>{m.full_name}</option>
                            ))}
                        </select>
                    </div>

                    <select
                        value={range}
                        onChange={e => setRange(e.target.value)}
                        className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-medium outline-none shadow-sm focus:ring-2 focus:ring-blue-500/20"
                    >
                        <option>Today</option>
                        <option>Last 7 Days</option>
                        <option>Last 30 Days</option>
                    </select>
                    <button className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
                        <Download className="w-4 h-4" />
                        Export CSV
                    </button>
                </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <div className="relative w-80">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search member or project..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                        />
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest bg-white border border-slate-200 px-3 py-1.5 rounded-lg">
                        <Filter className="w-3.5 h-3.5" />
                        Filters
                    </div>
                </div>

                <div className="flex-1 overflow-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-100 bg-white sticky top-0 z-10">
                                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Member</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Project</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Date & Time</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Duration</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-right">Activity %</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center text-slate-400 font-medium">Loading legacy data...</td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center text-slate-400 font-medium">No results found for {range}.</td>
                                </tr>
                            ) : (
                                filtered.map((row, i) => (
                                    <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                                                    <User className="w-4 h-4 text-indigo-600" />
                                                </div>
                                                <span className="text-sm font-bold text-slate-700">{row.member}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-xs text-slate-500 uppercase tracking-tight">{row.project}</td>
                                        <td className="px-6 py-4 text-xs font-medium text-slate-500">{row.date}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md w-fit">
                                                <Clock className="w-3 h-3" />
                                                {row.duration}m
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${row.activity}%` }} />
                                                </div>
                                                <span className="text-xs font-bold text-slate-800 min-w-[30px]">{row.activity}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50/30 flex justify-between items-center">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Showing {filtered.length} samples</p>
                    <div className="flex gap-2">
                        <button disabled className="px-3 py-1 bg-white border border-slate-200 rounded text-xs font-bold text-slate-300">Previous</button>
                        <button disabled className="px-3 py-1 bg-white border border-slate-200 rounded text-xs font-bold text-slate-300">Next</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
