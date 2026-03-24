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
import { PageLayout, Card } from '../components/ui';

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
        <PageLayout title={title} description="This module is currently under active development." maxWidth="6xl">
            <Card className="max-w-xl mx-auto text-center relative overflow-hidden bg-white shadow-sm border border-slate-100">
                <div className="relative p-12">
                    <div className="w-20 h-20 bg-slate-50 text-primary rounded-2xl flex items-center justify-center mx-auto mb-6 border border-slate-100 shadow-sm">
                        <IconComponent className="w-10 h-10" strokeWidth={1.5} />
                    </div>
                    <h1 className="text-2xl font-bold text-text-primary tracking-tight mb-2">
                        {title}
                    </h1>
                    <p className="text-text-secondary mb-8 max-w-sm mx-auto leading-relaxed">
                        Our engineering team is building out the data architecture to support these features.
                    </p>
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-500 rounded-xl text-sm font-semibold border border-slate-100">
                        <Construction className="w-4 h-4 text-slate-400" />
                        Infrastructure scaffolding in progress
                    </div>
                    <div className="mt-12 pt-6 border-t border-border-subtle text-xs text-text-muted font-mono">
                        ROUTE MAP: {location.pathname}
                    </div>
                </div>
            </Card>
        </PageLayout>
    );
}
