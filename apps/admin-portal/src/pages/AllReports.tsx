import { Link } from 'react-router-dom';
import {
    FileText, Calendar, BadgeDollarSign, CreditCard,
    Settings, Star, ChevronRight, BarChart, Zap
} from 'lucide-react';
import { PageHeader, Card, Button } from '../components/ui';
import clsx from 'clsx';

interface ReportLink {
    title: string;
    description: string;
    path: string;
    icon: any;
    color: string;
    category: 'Time' | 'Financial' | 'Team';
}

const REPORTS: ReportLink[] = [
    { title: 'Time & Activity', description: 'Main productivity dashboard with charts and trends.', path: '/reports', icon: BarChart, color: 'primary', category: 'Time' },
    { title: 'Daily Totals', description: 'Weekly view of hour totals per member.', path: '/reports/daily', icon: Calendar, color: 'emerald', category: 'Team' },
    { title: 'Amounts Owed', description: 'Real-time pending balance per member.', path: '/reports/owed', icon: BadgeDollarSign, color: 'amber', category: 'Financial' },
    { title: 'Payments History', description: 'Archive of all previous member payouts.', path: '/reports/payments', icon: CreditCard, color: 'indigo', category: 'Financial' },
    { title: 'Customized Reports', description: 'Your saved report configurations.', path: '/reports/custom', icon: Settings, color: 'slate', category: 'Financial' },
    { title: 'Legacy View', description: 'Tabular activity report for deep data extraction.', path: '/reports/legacy', icon: FileText, color: 'slate', category: 'Time' },
];

const colorMap: Record<string, string> = {
    primary: 'bg-primary/10 text-primary border-primary/20',
    emerald: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
    indigo: 'bg-indigo-500/10 text-indigo-700 border-indigo-500/20',
    slate: 'bg-slate-500/10 text-text-muted border-slate-500/20',
};

export function AllReports() {
    return (
        <div className="space-y-12 max-w-[1400px] mx-auto animate-in fade-in duration-700">
            <PageHeader 
                title="Reports Directory" 
                description="Select a specialized report to view detailed metrics and analytics."
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {REPORTS.map((report) => (
                    <Link
                        key={report.path}
                        to={report.path}
                        className="group block h-full focus:outline-none"
                    >
                        <Card className="h-full transition-all duration-500 group-hover:border-primary/30 group-hover:shadow-2xl group-hover:shadow-primary/[0.05] group-hover:-translate-y-1">
                            <div className="flex items-start justify-between mb-8">
                                <div className={clsx(
                                    "p-4 rounded-2xl border transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-shell-sm",
                                    colorMap[report.color]
                                )}>
                                    <report.icon className="w-6 h-6" strokeWidth={2.5} />
                                </div>
                                <span className="text-[10px] font-bold text-text-muted tracking-[0.2em] group-hover:text-primary transition-colors font-mono">
                                    {report.category}
                                </span>
                            </div>

                            <h3 className="text-xl font-bold text-text-primary tracking-tight mb-3 group-hover:text-primary transition-colors">
                                {report.title}
                            </h3>
                            <p className="text-sm text-text-muted font-medium leading-relaxed mb-8 flex-1 italic opacity-80 group-hover:opacity-100 transition-opacity">
                                {report.description}
                            </p>

                            <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted pt-5 border-t border-border/50 group-hover:text-text-primary transition-colors font-mono">
                                Open Analytics
                                <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" strokeWidth={3} />
                            </div>
                        </Card>
                    </Link>
                ))}
            </div>

            <div className="bg-surface-solid border border-border overflow-hidden rounded-[48px] p-12 relative group shadow-2xl">
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
                    <div className="text-center md:text-left space-y-4">
                        <div className="flex items-center gap-3 justify-center md:justify-start">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shadow-shell-sm animate-bounce">
                                <Star className="w-5 h-5 text-amber-500 fill-amber-600" />
                            </div>
                            <span className="text-[10px] font-bold tracking-[0.3em] text-text-muted font-mono italic opacity-60">Advanced Features</span>
                        </div>
                        <h2 className="text-4xl font-bold tracking-tighter text-text-primary leading-none">Automated Insights</h2>
                        <p className="text-text-muted font-medium max-w-lg leading-relaxed italic opacity-80">
                            Get weekly productivity summaries delivered directly to your inbox. Stay informed with AI-powered trend analysis without even logging in.
                        </p>
                    </div>
                    <Button 
                        variant="primary" 
                        size="lg"
                        className="shadow-xl shadow-primary/20 scale-110 hover:scale-125 transition-transform duration-500 group-hover:rotate-1"
                    >
                        <Zap className="w-4 h-4 mr-2" fill="currentColor" />
                        Enable Reports
                    </Button>
                </div>
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/[0.03] rounded-full blur-3xl -mr-48 -mt-48 pointer-events-none group-hover:bg-primary/[0.06] transition-colors duration-1000" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/[0.02] rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none group-hover:bg-emerald-500/[0.04] transition-colors duration-1000" />
            </div>
        </div>
    );
}
