import { useState, useEffect } from 'react';
import {
    Save, CheckCircle, Database, Activity,
    ShieldCheck, Mail, HardDrive, Loader2, RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PageLayout } from '../components/ui';
import { supabase } from '../lib/supabase';
import clsx from 'clsx';

interface AppSettings {
    screenshotIntervalMin: number;
    screenshotIntervalMax: number;
    idleThresholdSeconds: number;
    dailyHoursLimit: number;
    weeklyHoursLimit: number;
    screenshotBlur: boolean;
    trackUrls: boolean;
    trackApps: boolean;
    notifyIdle: boolean;
    notifyDailyLimit: boolean;
    autoStopOnIdle: boolean;
    idleAutoStopMinutes: number;
}

const DEFAULTS: AppSettings = {
    screenshotIntervalMin: 3,
    screenshotIntervalMax: 10,
    idleThresholdSeconds: 300,
    dailyHoursLimit: 8,
    weeklyHoursLimit: 40,
    screenshotBlur: false,
    trackUrls: true,
    trackApps: true,
    notifyIdle: true,
    notifyDailyLimit: true,
    autoStopOnIdle: false,
    idleAutoStopMinutes: 30,
};

type SettingCategory = 'governance' | 'monitoring' | 'telemetry' | 'notifications' | 'system';

export function SettingsPage() {
    const { profile } = useAuth();
    const isViewer = profile?.role === 'Viewer';
    const [settings, setSettings] = useState<AppSettings>(DEFAULTS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeCategory, setActiveCategory] = useState<SettingCategory>('governance');

    async function fetchSettings() {
        if (!profile?.organization_id) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('organizations')
                .select('settings')
                .eq('id', profile.organization_id)
                .single();

            if (error) throw error;
            if (data?.settings && Object.keys(data.settings).length > 0) {
                setSettings({ ...DEFAULTS, ...data.settings });
            }
        } catch (err: any) {
            console.error('Failed to load settings:', err);
            setError("Failed to load organization policies.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (profile?.organization_id) {
            fetchSettings();
        }
    }, [profile?.organization_id]);

    function update<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
        if (isViewer) return;
        setSettings(prev => ({ ...prev, [key]: value }));
    }

    async function handleSave() {
        if (isViewer || !profile?.organization_id) {
            setError("Unauthorized or missing organization context.");
            return;
        }
        setSaving(true);
        setError(null);
        try {
            console.log('Persisting settings for org:', profile.organization_id, settings);

            // 1. Update Organization Settings
            const { error: orgError, count } = await supabase
                .from('organizations')
                .update({ settings }, { count: 'exact' })
                .eq('id', profile.organization_id);

            if (orgError) throw orgError;
            if (count === 0) throw new Error("Target organization not found or access denied.");

            // 2. Propagate Governance Policies to Members
            // We sync Daily Limit, Weekly Limit, and Idle Threshold
            const { error: memberError } = await supabase
                .from('members')
                .update({
                    daily_limit: settings.dailyHoursLimit,
                    weekly_limit: settings.weeklyHoursLimit,
                    idle_limit: Math.floor(settings.idleThresholdSeconds / 60), // Convert sec to min
                    idle_enabled: true // Ensure idle tracking is enabled if threshold is set
                })
                .eq('organization_id', profile.organization_id);

            if (memberError) {
                console.warn('Failed to propagate policies to some members:', memberError);
                // We don't throw here to avoid failing the whole save if some members have RLS issues
            }

            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err: any) {
            console.error('Settings sync failed:', err);
            setError(err.message || "Failed to synchronize policies.");
        } finally {
            setSaving(false);
        }
    }

    async function handleReset() {
        if (isViewer) return;
        if (confirm('Restore workspace policies to global defaults?')) {
            setSettings(DEFAULTS);
            const { error } = await supabase
                .from('organizations')
                .update({ settings: DEFAULTS })
                .eq('id', profile?.organization_id);
            if (!error) setSaved(true);
        }
    }

    if (loading) {
        return (
            <PageLayout title="Settings" description="Accessing organization shard..." maxWidth="full">
                <div className="h-[40vh] flex flex-col items-center justify-center gap-4">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <p className="text-[11px] font-bold tracking-widest text-text-muted uppercase">Syncing Shard</p>
                </div>
            </PageLayout>
        );
    }

    const categories: { id: SettingCategory; label: string; icon: any }[] = [
        { id: 'governance', label: 'Governance', icon: ShieldCheck },
        { id: 'monitoring', label: 'Monitoring', icon: Activity },
        { id: 'telemetry', label: 'Telemetry', icon: Database },
        { id: 'notifications', label: 'Notifications', icon: Mail },
        { id: 'system', label: 'System', icon: HardDrive },
    ];

    if (loading) {
        return (
            <PageLayout title="Settings" description="Organization Policies & Protocols">
                <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <p className="text-text-muted font-medium animate-pulse">Synchronizing Policies...</p>
                </div>
            </PageLayout>
        );
    }
    return (
        <PageLayout
            title="Settings"
            description="Organization Policies & Protocols"
            actions={
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchSettings}
                        disabled={saving}
                        className="p-2.5 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 text-text-muted transition-all duration-200"
                        title="Refresh Policies"
                    >
                        <RefreshCw className={clsx("w-5 h-5", saving && "animate-spin")} />
                    </button>
                     <button
                        onClick={handleSave}
                        disabled={saving || isViewer}
                        className={clsx(
                            "settings-save-btn flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all duration-300 shadow-premium",
                            saved ? "bg-emerald-500" : "bg-primary hover:scale-[1.02] active:scale-[0.98]"
                        )}
                    >
                        {saving ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : saved ? (
                            <CheckCircle className="w-5 h-5" />
                        ) : (
                            <Save className="w-5 h-5" />
                        )}
                        <span>{saving ? 'Syncing...' : saved ? 'Policy Saved' : 'Save Changes'}</span>
                    </button>
                </div>
            }
        >
            <div className="flex flex-col lg:flex-row gap-16 pb-32">
                {/* 🧭 Sidebar Nav */}
                <div className="w-full lg:w-64 flex flex-col gap-1">
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={clsx(
                                "flex items-center gap-3 px-4 py-2.5 rounded-lg text-[14px] font-medium transition-all",
                                activeCategory === cat.id
                                    ? "bg-white/10 text-text-main"
                                    : "text-text-muted hover:bg-white/5 hover:text-text-main"
                            )}
                        >
                            <cat.icon className="w-4 h-4" />
                            {cat.label}
                        </button>
                    ))}
                    <div className="mt-8 pt-8 border-t border-white/5">
                        <div className="px-4 py-3 rounded-lg bg-white/5 border border-white/5">
                            <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Status</p>
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span className="text-[12px] font-medium text-text-main">Shard Synced</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ⚙️ Content Area */}
                <div className="flex-1 max-w-3xl space-y-12">
                    {error && (
                        <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm font-medium">
                            {error}
                        </div>
                    )}

                    {/* Governance Section */}
                    {activeCategory === 'governance' && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2">
                            <SectionHeading title="Work Governance" subtitle="Policies for time tracking and member activity." />
                            <div className="space-y-8">
                                <RangeControl
                                    label="Daily Hours Cap"
                                    description="Maximum hours a member can track in a 24-hour period."
                                    value={settings.dailyHoursLimit}
                                    unit="hrs" min={1} max={24}
                                    onChange={v => update('dailyHoursLimit', v)}
                                />
                                <div className="h-px bg-white/5" />
                                <RangeControl
                                    label="Weekly Hours Cap"
                                    description="Maximum cumulative hours per week."
                                    value={settings.weeklyHoursLimit}
                                    unit="hrs" min={1} max={168}
                                    onChange={v => update('weeklyHoursLimit', v)}
                                />
                            </div>
                        </div>
                    )}

                    {/* Monitoring Section */}
                    {activeCategory === 'monitoring' && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2">
                            <SectionHeading title="Visual Monitoring" subtitle="Settings for automated proof-of-work captures." />
                            <div className="space-y-8">
                                <ToggleControl
                                    label="Privacy Masking"
                                    description="Apply Gaussian blur to all captured screenshots by default."
                                    value={settings.screenshotBlur}
                                    onChange={v => update('screenshotBlur', v)}
                                />

                            </div>
                        </div>
                    )}

                    {/* Telemetry Section */}
                    {activeCategory === 'telemetry' && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2">
                            <SectionHeading title="Data Telemetry" subtitle="Control the types of background activity data collected." />
                            <div className="space-y-8">
                                <ToggleControl
                                    label="App Usage Tracking"
                                    description="Identify and log active desktop application processes."
                                    value={settings.trackApps}
                                    onChange={v => update('trackApps', v)}
                                />
                                <div className="h-px bg-white/5" />
                                <ToggleControl
                                    label="URL Tracking"
                                    description="Collect and categorize browser domain activity."
                                    value={settings.trackUrls}
                                    onChange={v => update('trackUrls', v)}
                                />
                                <div className="h-px bg-white/5" />
                                <RangeControl
                                    label="Idle Detection"
                                    description="Seconds of inactivity before flagging as 'Idle'."
                                    value={settings.idleThresholdSeconds}
                                    unit="sec" min={30} max={1800} step={30}
                                    onChange={v => update('idleThresholdSeconds', v)}
                                />
                                <div className="h-px bg-white/5" />
                                <ToggleControl
                                    label="Auto-Terminate Session"
                                    description="End the active session if the member remains idle too long."
                                    value={settings.autoStopOnIdle}
                                    onChange={v => update('autoStopOnIdle', v)}
                                />
                                {settings.autoStopOnIdle && (
                                    <div className="pl-6 border-l border-white/10 animate-in slide-in-from-left-2 duration-300">
                                        <RangeControl
                                            label="Termination Grace Period"
                                            description="Minutes of idle time before forced session stop."
                                            value={settings.idleAutoStopMinutes}
                                            unit="min" min={5} max={120} step={5}
                                            onChange={v => update('idleAutoStopMinutes', v)}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Notifications Section */}
                    {activeCategory === 'notifications' && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2">
                            <SectionHeading title="Notifications" subtitle="Triggers for system and administrative alerts." />
                            <div className="space-y-8">
                                <ToggleControl
                                    label="Inactivity Alerts"
                                    description="Notify members immediately when they are flagged as idle."
                                    value={settings.notifyIdle}
                                    onChange={v => update('notifyIdle', v)}
                                />
                                <div className="h-px bg-white/5" />
                                <ToggleControl
                                    label="Cap Threshold Alerts"
                                    description="Notify admins when members reach daily/weekly hour limits."
                                    value={settings.notifyDailyLimit}
                                    onChange={v => update('notifyDailyLimit', v)}
                                />
                            </div>
                        </div>
                    )}

                    {/* System Section */}
                    {activeCategory === 'system' && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2">
                            <SectionHeading title="System Operations" subtitle="Low-level environment and policy controls." />
                            <div className="p-6 rounded-lg bg-rose-500/5 border border-rose-500/10 space-y-4">
                                <div className="space-y-1">
                                    <h4 className="text-sm font-bold text-text-main">Reset Governance Shard</h4>
                                    <p className="text-[13px] text-text-muted leading-relaxed">
                                        Immediately restore all organizational policies to factory defaults. This action is irreversible.
                                    </p>
                                </div>
                                <button
                                    onClick={handleReset}
                                    disabled={isViewer}
                                    className="h-9 px-4 rounded-md bg-rose-600 text-white text-[12px] font-bold hover:bg-rose-700 transition-all disabled:opacity-30"
                                >
                                    Reset to Defaults
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </PageLayout>
    );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
    return (
        <div className="space-y-1">
            <h2 className="text-xl font-bold text-text-main tracking-tight">{title}</h2>
            <p className="text-[14px] text-text-muted opacity-60 leading-relaxed">{subtitle}</p>
        </div>
    );
}

function ToggleControl({ label, description, value, onChange }: { label: string; description: string; value: boolean; onChange: (v: boolean) => void }) {
    return (
        <div className="flex items-center justify-between gap-12">
            <div className="space-y-1 flex-1">
                <p className="text-[14px] font-bold text-text-main">{label}</p>
                <p className="text-[13px] text-text-muted opacity-60 leading-relaxed">{description}</p>
            </div>
            <button
                type="button"
                onClick={() => onChange(!value)}
                className={clsx(
                    "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out",
                    value ? "bg-primary" : "bg-white/10"
                )}
            >
                <span
                    className={clsx(
                        "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out transform",
                        value ? "translate-x-4" : "translate-x-0"
                    )}
                />
            </button>
        </div>
    );
}

function RangeControl({ label, description, value, unit, min, max, step = 1, onChange }: {
    label: string; description: string; value: number; unit: string;
    min: number; max: number; step?: number;
    onChange: (v: number) => void;
}) {
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-start">
                <div className="space-y-1">
                    <p className="text-[14px] font-bold text-text-main">{label}</p>
                    <p className="text-[13px] text-text-muted opacity-60">{description}</p>
                </div>
                <div className="bg-white/5 px-3 py-1 rounded border border-white/5">
                    <span className="text-[13px] font-bold text-primary">{value}</span>
                    <span className="text-[10px] font-medium text-text-muted ml-1">{unit}</span>
                </div>
            </div>
            <input
                type="range" min={min} max={max} step={step} value={value}
                onChange={e => onChange(Number(e.target.value))}
                className="w-full rounded-full appearance-none cursor-pointer"
            />
        </div>
    );
}
