import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Settings, Plus, Search, Filter, Trash2, Edit2, Play, Star, Calendar, Users, BarChart } from 'lucide-react';

interface CustomReport {
    id: string;
    name: string;
    type: string;
    lastGenerated: string;
    filters: string;
    isFavorite: boolean;
}

export function CustomizedReports() {
    const [loading, setLoading] = useState(true);
    const [reports, setReports] = useState<CustomReport[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchCustomReports();
    }, []);

    async function fetchCustomReports() {
        setLoading(true);
        const { data, error } = await supabase
            .from('custom_reports')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) {
            const formatted: CustomReport[] = data.map((r: any) => ({
                id: r.id,
                name: r.name,
                type: r.type,
                lastGenerated: new Date(r.created_at).toLocaleDateString(),
                filters: r.filters ? Object.entries(r.filters).map(([k, v]) => `${k}: ${v}`).join('; ') : 'No filters',
                isFavorite: r.is_favorite
            }));
            setReports(formatted);
        }
        setLoading(false);
    }

    const filtered = reports.filter(r =>
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.type.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-8 max-w-[1400px] mx-auto w-full fade-in">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-4">
                        <div className="bg-orange-500 p-2 rounded-2xl shadow-lg shadow-orange-100">
                            <Settings className="w-8 h-8 text-white" />
                        </div>
                        Customized Reports
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">Manage and run your saved report configurations.</p>
                </div>

                <button className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl text-sm font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200">
                    <Plus className="w-5 h-5" />
                    Create New Report
                </button>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="relative w-full sm:w-80">
                        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search saved reports..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-orange-500/10 transition-all shadow-sm"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">
                            <Filter className="w-4 h-4" />
                            Filter by Type
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-8">
                    {loading ? (
                        <div className="col-span-full py-20 text-center text-slate-400 font-medium">Loading reports...</div>
                    ) : filtered.length === 0 ? (
                        <div className="col-span-full py-20 text-center text-slate-400 font-medium">No saved reports found.</div>
                    ) : (
                        filtered.map((report) => (
                            <div key={report.id} className="group bg-slate-50 border border-slate-100 rounded-[2rem] p-6 hover:bg-white hover:border-orange-500/30 hover:shadow-xl hover:shadow-orange-500/5 transition-all duration-300 relative overflow-hidden">
                                {report.isFavorite && (
                                    <div className="absolute top-0 right-10">
                                        <div className="bg-orange-500 p-2 pt-4 rounded-b-xl shadow-md">
                                            <Star className="w-3.5 h-3.5 text-white fill-white" />
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-100 uppercase tracking-widest mb-3 inline-block">
                                            {report.type}
                                        </span>
                                        <h3 className="text-xl font-bold text-slate-800 tracking-tighter mb-1">{report.name}</h3>
                                        <p className="text-xs text-slate-400 font-bold flex items-center gap-1.5 uppercase tracking-tight">
                                            <Calendar className="w-3.5 h-3.5" />
                                            Last run: {report.lastGenerated}
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-white/50 rounded-2xl p-4 mb-6 border border-slate-200/50">
                                    <p className="text-[11px] font-bold text-slate-500 leading-relaxed uppercase tracking-tight">
                                        {report.filters}
                                    </p>
                                </div>

                                <div className="flex items-center justify-between border-t border-slate-200/50 pt-5">
                                    <div className="flex items-center gap-3">
                                        <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-xl transition-all">
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <button className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
                                        <Play className="w-3.5 h-3.5 fill-white" />
                                        Run Report
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
                <InsightCard
                    icon={<Users className="w-6 h-6 text-indigo-600" />}
                    title="Team Comparison"
                    description="Automatically compare performance across different teams or departments."
                />
                <InsightCard
                    icon={<BarChart className="w-6 h-6 text-emerald-600" />}
                    title="Predictive Costs"
                    description="Estimate future project costs based on historical tracking data."
                />
                <InsightCard
                    icon={<Settings className="w-6 h-6 text-orange-600" />}
                    title="API Webhooks"
                    description="Push customized report data to your external tools via automated webhooks."
                />
            </div>
        </div>
    );
}

function InsightCard({ icon, title, description }: { icon: any; title: string; description: string }) {
    return (
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
            <div className="p-3 rounded-2xl bg-slate-50 w-fit mb-4 border border-slate-100">
                {icon}
            </div>
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-tight mb-2">{title}</h4>
            <p className="text-xs text-slate-500 font-medium leading-relaxed tracking-tight">{description}</p>
        </div>
    );
}
