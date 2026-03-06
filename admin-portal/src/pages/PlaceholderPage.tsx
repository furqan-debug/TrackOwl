import {
    Clock,
    Activity,
    Lightbulb,
    MapPin,
    FolderKanban,
    CalendarDays,
    FileText,
    Users,
    CircleDollarSign,
    AppWindow,
    Settings,
    Construction
} from 'lucide-react';
import { useLocation } from 'react-router-dom';

const iconMap: Record<string, any> = {
    '/timesheets/approvals': Clock,
    '/activity/apps': Activity,
    '/insights/highlights': Lightbulb,
    '/insights/performance': Lightbulb,
    '/insights/unusual': Lightbulb,
    '/insights/notifications': Lightbulb,
    '/insights/output': Lightbulb,
    '/locations/job-sites': MapPin,
    '/projects/todos': FolderKanban,
    '/projects/clients': FolderKanban,
    '/calendar/time-off': CalendarDays,
    '/reports/legacy': FileText,
    '/reports/daily': FileText,
    '/reports/owed': FileText,
    '/reports/payments': FileText,
    '/reports/all': FileText,
    '/reports/custom': FileText,
    '/people/teams': Users,
    '/financials/create': CircleDollarSign,
    '/financials/past': CircleDollarSign,
    '/financials/invoices': CircleDollarSign,
    '/financials/expenses': CircleDollarSign,
    '/silent/how-it-works': AppWindow,
    '/settings/tracking': Settings,
    '/settings/integrations': Settings,
    '/settings/billing': Settings,
};

export function PlaceholderPage({ title }: { title: string }) {
    const location = useLocation();
    const IconComponent = iconMap[location.pathname] || Construction;

    return (
        <div className="p-8 max-w-[1200px] mx-auto w-full h-[calc(100vh-64px)] flex flex-col items-center justify-center fade-in">
            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-12 w-full max-w-xl text-center relative overflow-hidden">
                {/* Decorative background element */}
                <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-slate-50 to-white" />

                <div className="relative">
                    <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm ring-1 ring-blue-100/50">
                        <IconComponent className="w-10 h-10" strokeWidth={1.5} />
                    </div>

                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight mb-2">
                        {title}
                    </h1>

                    <p className="text-slate-500 mb-8 max-w-sm mx-auto leading-relaxed">
                        This module is currently under active development. Our engineering team is building out the data architecture to support these features.
                    </p>

                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium border border-slate-200/60 shadow-inner">
                        <Construction className="w-4 h-4 text-slate-500" />
                        Infrastructure scaffolding in progress
                    </div>

                    <div className="mt-12 pt-6 border-t border-slate-100 text-xs text-slate-400 font-mono">
                        ROUTE MAP: {location.pathname}
                    </div>
                </div>
            </div>
        </div>
    );
}
