import { Link } from 'react-router-dom';
import {
    FileText, Calendar, BadgeDollarSign, CreditCard,
    Settings, Star, ChevronRight, BarChart
} from 'lucide-react';

interface ReportLink {
    title: string;
    description: string;
    path: string;
    icon: any;
    color: string;
    category: 'Time' | 'Financial' | 'Team';
}

const REPORTS: ReportLink[] = [
    { title: 'Time & Activity', description: 'Main productivity dashboard with charts and trends.', path: '/reports', icon: BarChart, color: 'blue', category: 'Time' },
    { title: 'Legacy View', description: 'Tabular activity report for deep data extraction.', path: '/reports/legacy', icon: FileText, color: 'slate', category: 'Time' },
    { title: 'Daily Totals', description: 'Weekly view of hour totals per member.', path: '/reports/daily', icon: Calendar, color: 'indigo', category: 'Team' },
    { title: 'Amounts Owed', description: 'Real-time pending balance per member.', path: '/reports/owed', icon: BadgeDollarSign, color: 'emerald', category: 'Financial' },
    { title: 'Payments History', description: 'Archive of all previous member payouts.', path: '/reports/payments', icon: CreditCard, color: 'purple', category: 'Financial' },
    { title: 'Customized Reports', description: 'Your saved report configurations.', path: '/reports/custom', icon: Settings, color: 'orange', category: 'Financial' },
];

export function AllReports() {
    return (
        <div className="p-8 max-w-[1200px] mx-auto w-full fade-in">
            <div className="mb-12">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Reports Directory</h1>
                <p className="text-slate-500 font-medium">Select a specialized report to view detailed metrics.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {REPORTS.map((report) => (
                    <Link
                        key={report.path}
                        to={report.path}
                        className="group bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 hover:border-blue-500/30 transition-all duration-300 flex flex-col h-full"
                    >
                        <div className="flex items-start justify-between mb-6">
                            <div className={`p-3 rounded-2xl bg-${report.color}-50 text-${report.color}-600 group-hover:scale-110 transition-transform duration-300`}>
                                <report.icon className="w-6 h-6" />
                            </div>
                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest group-hover:text-blue-500 transition-colors">
                                {report.category}
                            </span>
                        </div>

                        <h3 className="text-lg font-bold text-slate-800 tracking-tighter mb-2 group-hover:text-blue-600 transition-colors">
                            {report.title}
                        </h3>
                        <p className="text-sm text-slate-500 font-medium leading-relaxed mb-8 flex-1">
                            {report.description}
                        </p>

                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest pt-4 border-t border-slate-50 group-hover:text-slate-600 transition-colors">
                            View Report
                            <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </Link>
                ))}
            </div>

            <div className="mt-16 bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl shadow-slate-200 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32 blur-3xl" />
                <div className="relative z-10 text-center md:text-left">
                    <div className="flex items-center gap-2 mb-4 justify-center md:justify-start">
                        <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                        <span className="text-xs font-bold tracking-widest uppercase text-white/60">New Feature</span>
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight mb-2">Automated Insights</h2>
                    <p className="text-white/60 font-medium max-w-md">
                        Get weekly productivity summaries delivered directly to your inbox. Stay informed without logging in.
                    </p>
                </div>
                <button className="relative z-10 bg-white text-slate-900 px-8 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-white/90 transition-all shadow-xl shadow-black/20">
                    Enable Notifications
                </button>
            </div>
        </div>
    );
}
