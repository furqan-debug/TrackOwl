import { SupabaseClient } from '@supabase/supabase-js';

export interface ActivitySample {
    id?: string;
    session_id: string;
    recorded_at: string;
    mouse_clicks?: number;
    key_presses?: number;
    app_name?: string;
    window_title?: string;
    domain?: string;
    idle?: boolean;
    activity_percent?: number;
    is_offline?: boolean;
    organization_id?: string;
}

export interface Session {
    id: string;
    user_id: string;
    project_id: string;
    organization_id?: string;
    started_at: string;
    ended_at: string | null;
}

export interface Member {
    id: string;
    organization_id: string;
    user_id?: string;
    email: string;
    full_name: string;
    role: string;
    status: string;
    created_at?: string;
    avatar_url?: string;
    hourly_rate?: number;
}

export interface Organization {
    id: string;
    name: string;
    owner_id: string;
    plan_type: string;
    stripe_customer_id?: string;
    stripe_subscription_id?: string;
    subscription_status?: string;
    subscription_period?: string;
    current_period_end?: string;
    created_at?: string;
}

export type ProjectStatus = 'Active' | 'Archived';
export type BudgetType = 'No budget' | 'Total hours' | 'Total amount' | 'Monthly hours' | 'Monthly amount';

export interface Project {
    id: string;
    organization_id: string;
    name: string;
    description?: string;
    status: ProjectStatus;
    color?: string;
    client_id?: string;
    client_name?: string;
    billable?: boolean;
    disable_activity?: boolean;
    allow_tracking?: boolean;
    disable_idle_time?: boolean;
    budget_type?: BudgetType;
    budget_limit?: number | null;
    budget_notifications?: boolean;
    member_limit?: number | null;
    memberCount?: number;
    teamCount?: number;
    todoCount?: number;
    memberIds?: string[];
    teamIds?: string[];
    created_at?: string;
    tracked_seconds?: number;
}

export type AppSupabaseClient = SupabaseClient<any, "public", any>;
