    Camera, Clock, Monitor, Bell, Shield, 
    Save, CheckCircle, Info, Zap, Settings,
    Layout, Eye, Globe, AppWindow, Smartphone,
    ChevronRight, RefreshCw, Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PageLayout, Card } from '../components/ui';
import { supabase } from '../lib/supabase';
import clsx from 'clsx';

const SETTINGS_KEY = 'trackowl_settings';

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

function loadSettings(): AppSettings {
    try { 
        return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') }; 
    } catch { 
        return DEFAULTS; 
    }
}

function saveSettings(s: AppSettings) { 
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); 
}

export function SettingsPage() {
    const { profile } = useAuth();
    const isViewer = profile?.role === 'Viewer';
    const [settings, setSettings] = useState<AppSettings>(DEFAULTS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (profile?.organization_id) {
            fetchSettings();
        }
    }, [profile?.organization_id]);

    async function fetchSettings() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('organizations')
                .select('settings')
                .eq('id', profile?.organization_id)
                .single();

            if (error) throw error;
            if (data?.settings && Object.keys(data.settings).length > 0) {
                setSettings({ ...DEFAULTS, ...data.settings });
            }
        } catch (err: any) {
            console.error('Error fetching settings:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    function update<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
        if (isViewer) return;
        setSettings(prev => ({ ...prev, [key]: value }));
    }

    async function handleSave() {
        if (isViewer || !profile?.organization_id) return;
        setSaving(true);
        setError(null);
        try {
            const { error } = await supabase
                .from('organizations')
                .update({ settings })
                .eq('id', profile.organization_id);

            if (error) throw error;
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    async function handleReset() {
        if (isViewer) return;
        setSettings(DEFAULTS);
    }

    return (
    if (loading) {
        return (
            <PageLayout title="Settings" description="Loading workspace configuration..." maxWidth="full">
                <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
                    <Loader2 className="w-12 h-12 text-primary animate-spin opacity-20" />
                    <p className="text-[13px] font-black tracking-widest text-text-muted uppercase">Syncing Cloud Config</p>
                </div>
            </PageLayout>
        );
    }

    return (
        <PageLayout
            eyebrow="WORKSPACE GOVERNANCE"
            title="Core Configuration"
            description="Fine-tune your workspace productivity policies, tracking intervals, and global privacy standards."
            maxWidth="full"
            actions={
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleSave}
                        disabled={isViewer || saving}
                        className={clsx(
                            "h-12 px-10 rounded-2xl text-[13px] font-black transition-all shadow-premium active:scale-95 flex items-center gap-3",
                            isViewer ? "bg-black/10 text-text-muted cursor-not-allowed" : 
                            (saved ? "bg-emerald-500 text-white" : "bg-primary text-white hover:brightness-110")
                        )}
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 
                         (saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />)}
                        {isViewer ? 'Read Only Mode' : (saved ? 'Configuration Saved' : (saving ? 'Processing...' : 'Sync Changes'))}
                    </button>
                </div>
            }
        >
            <div className="flex flex-col gap-10 pb-32">
                {error && (
                    <div className="bg-rose-500/5 border border-rose-500/10 rounded-2xl p-6 flex items-start gap-4 text-rose-500 animate-in fade-in slide-in-from-top-4">
                        <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="font-bold text-sm tracking-tight">System Configuration Error</p>
                            <p className="text-[13px] font-medium opacity-90 leading-relaxed">{error}</p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                    <div className="lg:col-span-8 flex flex-col gap-10">
                        {/* 📸 Visual Privacy Section */}
                        <SettingsSection 
                            icon={<Camera className="w-6 h-6" />} 
                            title="Screen Monitoring" 
                            subtitle="Privacy-first visual proof-of-work protocols"
                        >
                            <div className="space-y-10">
                                <ToggleField
                                    label="Privacy Masking (Blur)"
                                    description="Apply a high-density Gaussian blur to all captured screens. Recommended for high-sensitivity data handling."
                                    value={settings.screenshotBlur}
                                    onChange={v => update('screenshotBlur', v)}
                                    icon={<Eye className="w-4 h-4" />}
                                />
                                <div className="p-6 rounded-[1.5rem] bg-primary/5 border border-primary/10 flex items-start gap-5 group/info">
                                    <div className="w-10 h-10 rounded-xl bg-white border border-primary/20 flex items-center justify-center text-primary shadow-shell-sm group-hover/info:rotate-12 transition-transform">
                                        <Clock className="w-5 h-5" />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="text-[13px] font-black text-text-main tracking-tight uppercase">Current Sampling Rate</h4>
                                        <p className="text-[13px] font-medium text-text-muted leading-relaxed">
                                            The system is capturing proofs every <span className="text-primary font-black underline underline-offset-4">{settings.screenshotIntervalMin}-{settings.screenshotIntervalMax} minutes</span>. 
                                            This is randomized to prevent predictability.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </SettingsSection>

                        {/* ⏳ Inactivity Management */}
                        <SettingsSection 
                            icon={<RefreshCw className="w-6 h-6" />} 
                            title="Inactivity Protocols" 
                            subtitle="Define standards for automated time reclamation"
                        >
                            <div className="space-y-12">
                                <RangeField
                                    label="Inactivity Threshold"
                                    description="The duration of zero input (keyboard/mouse) before a member is flagged as idle."
                                    value={settings.idleThresholdSeconds}
                                    unit="sec"
                                    min={30} max={1800} step={30}
                                    onChange={v => update('idleThresholdSeconds', v)}
                                    color="primary"
                                />
                                <div className="h-px bg-border/50 mx-2" />
                                <ToggleField
                                    label="Automated Timer Termination"
                                    description="Automatically end the active tracking session after sustained inactivity."
                                    value={settings.autoStopOnIdle}
                                    onChange={v => update('autoStopOnIdle', v)}
                                    icon={<Zap className="w-4 h-4" />}
                                />
                                {settings.autoStopOnIdle && (
                                    <div className="pl-10 border-l-2 border-primary/20 pt-2 animate-in slide-in-from-left-4 duration-500">
                                        <RangeField
                                            label="Grace Period Delay"
                                            description="Additional wait time before final session termination."
                                            value={settings.idleAutoStopMinutes}
                                            unit="min"
                                            min={5} max={120} step={5}
                                            onChange={v => update('idleAutoStopMinutes', v)}
                                            color="primary"
                                        />
                                    </div>
                                )}
                            </div>
                        </SettingsSection>

                        {/* 🌏 Global Activity Mapping */}
                        <SettingsSection 
                            icon={<Globe className="w-6 h-6" />} 
                            title="Identity & App Telemetry" 
                            subtitle="Toggle collection of application and network data"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <Card className="p-8 bg-surface-hover/30 border-border/50 hover:border-primary/30 transition-all group/card">
                                    <ToggleField
                                        label="Network URL Tracking"
                                        description="Collect browser domain usage for productivity mapping."
                                        value={settings.trackUrls}
                                        onChange={v => update('trackUrls', v)}
                                        icon={<Globe className="w-4 h-4" />}
                                    />
                                </Card>
                                <Card className="p-8 bg-surface-hover/30 border-border/50 hover:border-primary/30 transition-all group/card">
                                    <ToggleField
                                        label="Process Telemetry"
                                        description="Identify active desktop applications being utilized."
                                        value={settings.trackApps}
                                        onChange={v => update('trackApps', v)}
                                        icon={<AppWindow className="w-4 h-4" />}
                                    />
                                </Card>
                            </div>
                        </SettingsSection>
                    </div>

                    <div className="lg:col-span-4 flex flex-col gap-10">
                        {/* 🔮 Live Preview Card */}
                        <div className="glass-panel p-8 rounded-[2rem] border-primary/20 relative overflow-hidden group">
                            <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/10 blur-[80px] rounded-full pointer-events-none group-hover:scale-110 transition-transform duration-1000" />
                            <div className="relative z-10">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center text-primary shadow-glow-primary transform group-hover:rotate-6 transition-transform">
                                        <Zap className="w-7 h-7" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-text-main tracking-tight">Active Policy</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest leading-none">Sync Status: Live</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="space-y-5">
                                    <LiveMetric label="Privacy" value={settings.screenshotBlur ? 'Secured (Blurred)' : 'Standard (Clear)'} active={settings.screenshotBlur} />
                                    <LiveMetric label="Network" value={settings.trackUrls ? 'Tracking Active' : 'Restricted'} active={settings.trackUrls} />
                                    <LiveMetric label="App Data" value={settings.trackApps ? 'Active Feed' : 'Restricted'} active={settings.trackApps} />
                                    <div className="h-px bg-border/40 my-4" />
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 rounded-2xl bg-surface-hover/50 border border-border/50">
                                            <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">Inactivity</p>
                                            <p className="text-lg font-black text-text-main">{settings.idleThresholdSeconds}s</p>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-surface-hover/50 border border-border/50">
                                            <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">Daily Cap</p>
                                            <p className="text-lg font-black text-text-main">{settings.dailyHoursLimit}h</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 🔔 Notifications */}
                        <SettingsSection 
                            icon={<Bell className="w-6 h-6" />} 
                            title="System Alerts" 
                            subtitle="Channel preferences for admin & member notifications"
                        >
                            <div className="space-y-10">
                                <ToggleField
                                    label="Inactivity Notifications"
                                    description="Push alerts when members enter idle state."
                                    value={settings.notifyIdle}
                                    onChange={v => update('notifyIdle', v)}
                                />
                                <div className="h-px bg-border/50" />
                                <ToggleField
                                    label="Policy Cap Alerts"
                                    description="Notify admins when daily thresholds are reached."
                                    value={settings.notifyDailyLimit}
                                    onChange={v => update('notifyDailyLimit', v)}
                                />
                            </div>
                        </SettingsSection>
                        
                        {/* ⚠️ Danger Zone */}
                        <div className="p-8 rounded-[2rem] bg-rose-500/5 border border-rose-500/10 flex flex-col items-center text-center group hover:bg-rose-500/10 transition-all shadow-shell-sm">
                            <div className="w-12 h-12 rounded-xl bg-white border border-rose-500/20 flex items-center justify-center text-rose-500 shadow-shell-sm mb-6 group-hover:scale-110 transition-transform">
                                <RefreshCw className="w-6 h-6" />
                            </div>
                            <h4 className="text-lg font-bold text-text-main tracking-tight mb-2">Hard Reset</h4>
                            <p className="text-[12px] font-medium text-text-muted leading-relaxed mb-8 px-4 opacity-70">
                                Restore all workspace governance policies to the global default system values.
                            </p>
                            <button 
                                disabled={isViewer || saving}
                                onClick={handleReset}
                                className="w-full h-14 border-2 border-rose-500/20 text-rose-500 text-[11px] font-black uppercase tracking-widest rounded-2xl hover:bg-rose-500 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 flex items-center justify-center gap-3"
                            >
                                <ShieldAlert className="w-4 h-4" />
                                Reset Factory Defaults
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </PageLayout>
    );
}

function SettingsSection({ icon, title, subtitle, children }: { icon: React.ReactNode; title: string; subtitle: string; children: React.ReactNode }) {
    return (
        <div className="glass-panel rounded-[2.5rem] overflow-hidden group/section">
            <div className="px-10 py-8 border-b border-border/50 bg-primary/5 flex items-center gap-8">
                <div className="w-14 h-14 rounded-2xl bg-white border border-border flex items-center justify-center text-primary shadow-shell-sm group-hover/section:scale-110 transition-transform duration-500">
                    {icon}
                </div>
                <div>
                    <h2 className="text-[20px] font-black text-text-main tracking-tight mb-0.5">{title}</h2>
                    <p className="text-[12px] font-bold text-text-muted opacity-60 leading-none uppercase tracking-widest">{subtitle}</p>
                </div>
            </div>
            <div className="p-10">{children}</div>
        </div>
    );
}

function RangeField({ label, description, value, unit, min, max, step = 1, onChange, color }: {
    label: string; description: string; value: number; unit: string;
    min: number; max: number; step?: number;
    onChange: (v: number) => void;
    color: 'primary' | 'emerald' | 'rose';
}) {
    return (
        <div className="space-y-8">
            <div className="flex justify-between items-start">
                <div className="space-y-2 max-w-[70%]">
                    <p className="text-[15px] font-black text-text-main tracking-tight">{label}</p>
                    <p className="text-[12px] font-medium text-text-muted opacity-70 leading-relaxed">{description}</p>
                </div>
                <div className="flex items-baseline gap-2 bg-slate-900 px-5 py-2.5 rounded-2xl shadow-glow-primary border border-white/5">
                    <span className="text-2xl font-black text-primary tabular-nums">{value}</span>
                    <span className="text-[10px] font-black text-primary/60 uppercase tracking-widest">{unit}</span>
                </div>
            </div>
            <div className="relative h-10 flex items-center px-2">
                <div className="absolute inset-x-2 h-1.5 bg-border/30 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-300"
                        style={{ width: `${((value - min) / (max - min)) * 100}%` }}
                    />
                </div>
                <input
                    type="range" min={min} max={max} step={step} value={value}
                    onChange={e => onChange(Number(e.target.value))}
                    className="absolute inset-x-0 w-full h-10 appearance-none bg-transparent cursor-pointer z-10 accent-primary"
                />
            </div>
            <div className="flex justify-between px-2 text-[10px] font-black text-text-muted/40 uppercase tracking-widest">
                <span>{min} {unit}</span>
                <span>{max} {unit}</span>
            </div>
        </div>
    );
}

function ToggleField({ label, description, value, onChange, icon }: { label: string; description: string; value: boolean; onChange: (v: boolean) => void; icon?: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between group/toggle gap-8">
            <div className="flex items-start gap-5 flex-1">
                {icon && (
                    <div className={clsx(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-500",
                        value ? "bg-primary/10 border-primary/30 text-primary shadow-glow-primary" : "bg-surface border-border text-text-muted opacity-40"
                    )}>
                        {icon}
                    </div>
                )}
                <div className="space-y-1">
                    <p className="text-[15px] font-black text-text-main tracking-tight">{label}</p>
                    <p className="text-[12px] font-medium text-text-muted opacity-70 leading-relaxed">{description}</p>
                </div>
            </div>
            <button
                type="button"
                onClick={() => onChange(!value)}
                className={clsx(
                    "relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-500 ease-in-out shadow-inner",
                    value ? "bg-primary" : "bg-border"
                )}
            >
                <span 
                    className={clsx(
                        "pointer-events-none inline-block h-6 w-6 rounded-full bg-white shadow-premium ring-0 transition duration-500 ease-in-out transform",
                        value ? "translate-x-5" : "translate-x-0"
                    )} 
                />
            </button>
        </div>
    );
}

function LiveMetric({ label, value, active }: { label: string; value: string; active: boolean }) {
    return (
        <div className="flex justify-between items-center group/metric">
            <span className="text-[11px] font-black text-text-muted/60 uppercase tracking-[0.15em]">{label}</span>
            <div className="flex items-center gap-2">
                <span className={clsx(
                    "text-[12px] font-black tracking-tight transition-colors",
                    active ? "text-primary" : "text-text-muted/40"
                )}>{value}</span>
                <ChevronRight className="w-3 h-3 text-text-muted/20 group-hover/metric:translate-x-1 transition-transform" />
            </div>
        </div>
    );
}

function ConfigValue({ label, value, color = 'primary' }: { label: string; value: string; color?: 'primary' | 'emerald' | 'rose' }) {
    return null; // Deprecated in favor of LiveMetric
}
    );
}

function SettingsSection({ icon, title, subtitle, children }: { icon: React.ReactNode; title: string; subtitle: string; children: React.ReactNode }) {
    return (
        <Card className="p-0 overflow-hidden bg-surface border-border shadow-shell-sm group/section transition-all hover:border-primary/20 duration-300 rounded-xl">
            <div className="px-8 py-6 border-b border-border bg-primary/10 flex items-center gap-6">
                <div className="w-12 h-12 rounded-xl bg-surface border border-border flex items-center justify-center text-primary shadow-shell-sm transition-all duration-500">
                    {icon}
                </div>
                <div>
                    <h2 className="text-lg font-bold text-text-main tracking-tight mb-1">{title}</h2>
                    <p className="text-[11px] font-medium text-text-muted opacity-70 leading-none">{subtitle}</p>
                </div>
            </div>
            <div className="p-8">{children}</div>
        </Card>
    );
}

function RangeField({ label, description, value, unit, min, max, step = 1, onChange, color }: {
    label: string; description: string; value: number; unit: string;
    min: number; max: number; step?: number;
    onChange: (v: number) => void;
    color: 'primary' | 'emerald' | 'rose';
}) {
    const accColors = {
        primary: 'accent-primary',
        emerald: 'accent-emerald-500',
        rose: 'accent-rose-500'
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start">
                <div className="space-y-1">
                    <p className="text-sm font-bold text-text-main tracking-tight">{label}</p>
                    <p className="text-xs font-medium text-text-muted opacity-70 leading-relaxed">{description}</p>
                </div>
                <div className="flex items-baseline gap-1.5 bg-surface px-4 py-2 rounded-lg border border-border shadow-shell-sm">
                    <span className="text-xl font-bold text-primary">{value}</span>
                    <span className="text-[10px] font-bold text-text-muted ">{unit}</span>
                </div>
            </div>
            <div className="px-1">
                <input
                    type="range" min={min} max={max} step={step} value={value}
                    onChange={e => onChange(Number(e.target.value))}
                    className={clsx("w-full h-1.5 rounded-full appearance-none cursor-pointer bg-border transition-all", accColors[color])}
                />
            </div>
            <div className="flex justify-between px-1 text-[9px] font-bold text-text-muted opacity-30 ">
                <span>{min}{unit}</span>
                <span>{max}{unit}</span>
            </div>
        </div>
    );
}

function ToggleField({ label, description, value, onChange }: { label: string; description: string; value: boolean; onChange: (v: boolean) => void }) {
    return (
        <div className="flex items-center justify-between group/toggle">
            <div className="space-y-1 flex-1 pr-8">
                <p className="text-sm font-bold text-text-main tracking-tight">{label}</p>
                <p className="text-xs font-medium text-text-muted opacity-70 leading-relaxed">{description}</p>
            </div>
            <button
                type="button"
                onClick={() => onChange(!value)}
                className={clsx(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out",
                    value ? "bg-primary" : "bg-border"
                )}
            >
                <span 
                    className={clsx(
                        "pointer-events-none inline-block h-5 w-5 rounded-full bg-surface shadow ring-0 transition duration-200 ease-in-out transform",
                        value ? "translate-x-5" : "translate-x-0"
                    )} 
                />
            </button>
        </div>
    );
}

function ConfigValue({ label, value, color = 'primary' }: { label: string; value: string; color?: 'primary' | 'emerald' | 'rose' }) {
    const textColors = {
        primary: 'text-primary',
        emerald: 'text-emerald-500',
        rose: 'text-rose-500'
    };
    
    return (
        <div className="flex justify-between items-center text-[11px]">
            <span className="text-text-muted font-bold opacity-80">{label}</span>
            <span className={clsx("font-bold ", textColors[color])}>{value}</span>
        </div>
    );
}
