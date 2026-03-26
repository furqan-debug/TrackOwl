import type { LucideIcon } from 'lucide-react';
import {
    LayoutDashboard,
    Clock,
    Activity,
    FolderKanban,
    FileText,
    Users,
    CircleDollarSign,
    AppWindow,
    Settings,
} from 'lucide-react';

export type BadgeType = 'new' | 'bolt' | null;

export type Role = 'Admin' | 'Manager' | 'User' | 'Viewer';

export interface NavChild {
    name: string;
    path: string;
    badge?: BadgeType;
    allowedRoles?: Role[];
}

export interface NavGroup {
    name: string;
    icon: LucideIcon;
    path?: string;
    children?: NavChild[];
    allowedRoles?: Role[];
}

export const navStructure: NavGroup[] = [
    { name: 'Home', icon: LayoutDashboard, path: '/dashboard' },
    {
        name: 'Timesheets',
        icon: Clock,
        children: [
            { name: 'View / Edit time', path: '/dashboard/timesheets' },
            { name: 'Approve time', path: '/dashboard/timesheets/approvals', badge: 'bolt', allowedRoles: ['Admin', 'Manager', 'Viewer'] },
        ],
    },
    {
        name: 'Activity',
        icon: Activity,
        children: [
            { name: 'Screen captures', path: '/dashboard/activity' },
            { name: 'Applications used', path: '/dashboard/activity/apps' },
            { name: 'Websites visited', path: '/dashboard/url-tracking' },
        ],
    },
    {
        name: 'Project Management',
        icon: FolderKanban,
        allowedRoles: ['Admin', 'Manager', 'User', 'Viewer'],
        children: [
            { name: 'All projects', path: '/dashboard/projects' },
            { name: 'Tasks / To-do list', path: '/dashboard/projects/todos' },
            { name: 'Customers', path: '/dashboard/projects/clients', allowedRoles: ['Admin', 'Manager', 'Viewer'] },
        ],
    },
    {
        name: 'Reports',
        icon: FileText,
        children: [
            { name: 'Time usage report', path: '/dashboard/reports', badge: 'new' },
            { name: 'Old time report', path: '/dashboard/reports/legacy', allowedRoles: ['Admin', 'Manager', 'Viewer'] },
            { name: 'Weekly summary', path: '/dashboard/reports/daily' },
            { name: 'Payments due', path: '/dashboard/reports/owed', allowedRoles: ['Admin', 'Manager', 'Viewer'] },
            { name: 'Payment history', path: '/dashboard/reports/payments', allowedRoles: ['Admin', 'Manager', 'Viewer'] },
            { name: 'Reports (coming soon)', path: '/dashboard/reports/all', allowedRoles: ['Admin', 'Manager', 'Viewer'] },
            { name: 'Create report', path: '/dashboard/reports/custom', badge: 'bolt', allowedRoles: ['Admin', 'Manager', 'Viewer'] },
        ],
    },
    {
        name: 'People',
        icon: Users,
        allowedRoles: ['Admin', 'Manager', 'Viewer'],
        children: [
            { name: 'Team members', path: '/dashboard/people', allowedRoles: ['Admin', 'Manager', 'Viewer'] },
            { name: 'Groups', path: '/dashboard/people/teams', badge: 'bolt' },
        ],
    },
    {
        name: 'Financials (WIP)',
        icon: CircleDollarSign,
        allowedRoles: ['Admin', 'Manager', 'Viewer'],
        children: [
            { name: 'Manage payroll (WIP)', path: '/dashboard/financials', badge: 'bolt' },
            { name: 'Create payments (WIP)', path: '/dashboard/financials/create' },
            { name: 'Past payments (WIP)', path: '/dashboard/financials/past' },
            { name: 'Invoices (WIP)', path: '/dashboard/financials/invoices' },
            { name: 'Expenses (WIP)', path: '/dashboard/financials/expenses' },
        ],
    },
    {
        name: 'Silent app',
        icon: AppWindow,
        allowedRoles: ['Admin', 'Manager', 'Viewer'],
        children: [{ name: 'How it works', path: '/dashboard/silent/how-it-works' }],
    },
    {
        name: 'Settings',
        icon: Settings,
        children: [
            { name: 'All settings', path: '/dashboard/settings', allowedRoles: ['Admin', 'Manager', 'Viewer'] },
            { name: 'Activity & tracking', path: '/dashboard/settings/tracking', allowedRoles: ['Admin', 'Manager', 'Viewer'] },
            { name: 'Billing', path: '/dashboard/settings/billing', allowedRoles: ['Admin', 'Manager', 'Viewer'] },
        ],
    },
];

/**
 * Returns whether the current pathname matches the given item path (exact or prefix for nested routes).
 */
export function matchActive(pathname: string, itemPath: string): boolean {
    if (pathname === itemPath) return true;
    if (itemPath === '/') return false;
    return pathname.startsWith(itemPath + '/');
}

/**
 * Returns the display label for a given path by looking up in nav structure.
 * Used for Header page title and favorites; falls back to a formatted path segment.
 */
export function getLabelForPath(pathname: string): string {
    const normalized = pathname.replace(/\/$/, '') || '/';
    for (const group of navStructure) {
        if (group.path === normalized) return group.name;
        for (const child of group.children ?? []) {
            if (child.path === normalized) return child.name;
        }
    }
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length === 0) return 'Dashboard';
    const last = parts[parts.length - 1] ?? '';
    return last.charAt(0).toUpperCase() + last.slice(1).replace(/-/g, ' ');
}
