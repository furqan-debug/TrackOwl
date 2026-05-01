import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { fetchAllActivitySamples, fetchAllSessions } from '../lib/dataUtils';
import { FileText, Search, Download, Filter, User, Clock, Users } from 'lucide-react';
import { PageHeader, Card, Button } from '../components/ui';

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

        try {
            const sessions = await fetchAllSessions(supabase, start, now, undefined, selectedMemberId);
            const sessionIds = sessions.map(s => s.id);

            if (selectedMemberId !== 'all' && (sessionIds.length === 0)) {
                setData([]);
                setLoading(false);
                return;
            }

            const [samples, { data: membersList }, { data: projects }] = await Promise.all([
                fetchAllActivitySamples(
                    supabase, 
                    start.toISOString(), 
                    now.toISOString(), 
                    '*, sessions(user_id, project_id)',
                    { sessionIds: sessionIds.length > 0 ? sessionIds : undefined }
                ),
                supabase.from('members').select('id, full_name'),
                supabase.from('projects').select('id, name')
            ]);

            if (samples && membersList && projects) {
                const memberMap: Record<string, string> = {};
                membersList.forEach(m => {
                    memberMap[m.id] = m.full_name;
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
        } catch (err) {
            console.error("fetchLegacyData error:", err);
        } finally {
            setLoading(false);
        }
    }

    const filtered = data.filter(d =>
        d.member.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.project.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-background pb-20">
            <PageHeader
                title="Time & Activity (Legacy)"
                description="Classic tabular view of all recorded activity samples."
                icon={<FileText className="w-8 h-8 text-primary" />}
                actions={
                    <div className="flex items-center gap-4">
                        {/* Member Filter */}
                        <div className="flex items-center gap-2 bg-surface-solid border border-border rounded-lg px-3 py-2 shadow-shell-sm font-mono text-[11px] ">
                            <Users className="w-4 h-4 text-text-muted" />
                            <select
                                value={selectedMemberId}
                                onChange={(e) => setSelectedMemberId(e.target.value)}
                                className="bg-transparent font-bold text-text-primary outline-none w-48 text-[11px] "
                            >
                                <option value="all">Entire Organization</option>
                                <option disabled>──────────</option>
                                {members.map(m => (
                                    <option key={m.id} value={m.id}>{m.full_name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-1 bg-surface-solid border border-border rounded-lg p-1 shadow-shell-sm font-mono text-[10px] font-bold">
                            {['Today', 'Last 7 Days', 'Last 30 Days'].map(r => (
                                <button key={r} onClick={() => setRange(r)}
                                    className={`px-4 py-2 rounded-md transition-colors ${range === r ? 'bg-primary text-white shadow-shell-sm' : 'text-text-muted hover:text-text-primary hover:bg-surface-subtle'}`}>
                                    {r}
                                </button>
                            ))}
                        </div>

                        <Button variant="secondary" leftIcon={<Download className="w-4 h-4" />}>
                            Export CSV
                        </Button>
                    </div>
                }
            />

            <div className="px-10">
                <Card noPadding title="Activity Log" className="shadow-2xl overflow-hidden"
                    actions={
                        <div className="flex items-center gap-4">
                            <div className="relative border border-border bg-surface-solid rounded-xl flex items-center shadow-shell-sm">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                                <input
                                    type="text"
                                    placeholder="Search member or project..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="bg-transparent pl-11 pr-4 py-2 text-[10px] font-bold font-mono text-text-primary outline-none focus:border-primary/50 w-64 h-full"
                                />
                            </div>
                            <Button variant="secondary" leftIcon={<Filter className="w-4 h-4" />} className="px-6 py-2 text-[10px] ">
                                Filters
                            </Button>
                        </div>
                    }
                >
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-surface-subtle/30 border-b border-border">
                                    <th className="px-10 py-6 text-[10px] font-bold text-text-muted tracking-[0.3em] font-mono border-r border-border/10">Member</th>
                                    <th className="px-10 py-6 text-[10px] font-bold text-text-muted tracking-[0.3em] font-mono">Project</th>
                                    <th className="px-10 py-6 text-[10px] font-bold text-text-muted tracking-[0.3em] font-mono">Date & Time</th>
                                    <th className="px-10 py-6 text-[10px] font-bold text-text-muted tracking-[0.3em] font-mono">Duration</th>
                                    <th className="px-10 py-6 text-[10px] font-bold text-text-muted tracking-[0.3em] font-mono text-right">Activity %</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="py-20 text-center text-text-muted font-mono text-[11px] ">Loading legacy data...</td>
                                    </tr>
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-20 text-center text-text-muted font-mono text-[11px] ">No results found for {range}.</td>
                                    </tr>
                                ) : (
                                    filtered.map((row, i) => (
                                        <tr key={i} className="hover:bg-primary/[0.01] transition-all group duration-500">
                                            <td className="px-10 py-5 border-r border-border/10">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-surface-solid border border-border flex items-center justify-center shadow-shell-sm">
                                                        <User className="w-4 h-4 text-primary" />
                                                    </div>
                                                    <span className="text-[12px] font-bold text-text-primary font-mono group-hover:text-primary transition-colors">{row.member}</span>
                                                </div>
                                            </td>
                                            <td className="px-10 py-5 font-bold text-[11px] text-text-muted font-mono">{row.project}</td>
                                            <td className="px-10 py-5 text-[11px] font-bold text-text-muted font-mono">{row.date}</td>
                                            <td className="px-10 py-5">
                                                <div className="flex items-center gap-2 text-[10px] font-bold text-text-primary bg-surface-subtle px-3 py-1.5 border border-border rounded-lg w-fit font-mono">
                                                    <Clock className="w-3.5 h-3.5 opacity-60" />
                                                    {row.duration}m
                                                </div>
                                            </td>
                                            <td className="px-10 py-5 w-48 text-right">
                                                <div className="flex items-center justify-end gap-4">
                                                    <div className="w-full h-2 bg-surface-subtle rounded-full overflow-hidden border border-border p-[1px] shadow-inner">
                                                        <div className="h-full bg-primary rounded-full transition-all duration-1000 shadow-shell-sm" style={{ width: `${row.activity}%` }} />
                                                    </div>
                                                    <span className="text-[11px] font-bold text-text-primary font-mono w-12">{row.activity}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    );
}
