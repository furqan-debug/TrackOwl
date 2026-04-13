import type { LucideIcon } from 'lucide-react';
import {
    LayoutDashboard,
    Clock,
    Activity,
    FolderKanban,
    FileText,
    Users,
    Settings,
    Calendar as CalendarIcon
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
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { 
        name: 'Timesheets', 
        icon: Clock, 
        path: '/dashboard/timesheets' 
    },
    {
        name: 'Activity',
        icon: Activity,
        children: [
            { name: 'Screenshots', path: '/dashboard/activity' },
            { name: 'Apps & URLs', path: '/dashboard/activity/apps' },
        ],
    },
    { 
        name: 'Projects', 
        icon: FolderKanban, 
        path: '/dashboard/projects',
        allowedRoles: ['Admin', 'Manager', 'User', 'Viewer']
    },
    { name: 'Calendar', icon: CalendarIcon, path: '/dashboard/calendar' },
    {
        name: 'Reports',
        icon: FileText,
        children: [
            { name: 'Time Usage', path: '/dashboard/reports' },
            { name: 'Weekly Summary', path: '/dashboard/reports/daily' },
        ],
    },
    {
        name: 'People',
        icon: Users,
        allowedRoles: ['Admin', 'Manager', 'Viewer'],
        children: [
            { name: 'Members', path: '/dashboard/people' },
            { name: 'Teams', path: '/dashboard/people/teams' },
        ],
    },
    {
        name: 'Settings',
        icon: Settings,
        path: '/dashboard/settings',
        children: [
            { name: 'Org Settings', path: '/dashboard/settings' },
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
