import { useState } from 'react';
import { 
    Camera, Clock, Monitor, Bell, Shield, 
    Save, RotateCcw, CheckCircle, ShieldAlert,
    Info, Zap
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PageLayout, Card } from '../components/ui';
import clsx from 'clsx';

const SETTINGS_KEY = 'trackora_settings';

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
    const [settings, setSettings] = useState<AppSettings>(loadSettings());
    const [saved, setSaved] = useState(false);

    function update<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
        if (isViewer) return;
        setSettings(prev => ({ ...prev, [key]: value }));
    }

    function handleSave() {
        if (isViewer) return;
        saveSettings(settings);
        setSaved(true);
        setTimeout(() => setSaved(false), 2200);
    }

    function handleReset() {
        if (isViewer) return;
        setSettings(DEFAULTS);
        saveSettings(DEFAULTS);
    }

    return (
        <PageLayout
            title="System Configuration"
            description="Operational parameters, surveillance directives, and security protocols."
            maxWidth="full"
            actions={
                <div className="flex items-center gap-4">
                    <button 
                        onClick={handleReset}
                        disabled={isViewer}
                        className={clsx(
                            "flex items-center gap-3 px-8 py-4 rounded-[20px] text-[11px] font-bold uppercase tracking-[0.2em] transition-all border border-border bg-surface-solid shadow-sm font-mono",
                            isViewer ? "opacity-30 cursor-not-allowed" : "text-text-muted hover:text-text-primary hover:bg-surface-subtle active:scale-95"
                        )}
                    >
                        <RotateCcw className="w-4 h-4" strokeWidth={3} />
                        Restore Factory Defaults
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isViewer}
                        className={clsx(
                            "flex items-center gap-3 px-10 py-4 rounded-[24px] text-[11px] font-bold uppercase tracking-[0.3em] transition-all shadow-xl active:scale-95 font-mono italic",
                            isViewer ? "bg-black/10 text-text-muted cursor-not-allowed" : 
                            (saved ? "bg-emerald-600 text-white shadow-emerald-500/20" : "bg-primary text-white hover:shadow-primary/30 hover:scale-[1.02]")
                        )}
                    >
                        {saved ? <CheckCircle className="w-5 h-5 stroke-[3]" /> : <Save className="w-5 h-5 stroke-[3]" />}
                        {isViewer ? 'READ ONLY ACCESS' : (saved ? 'CONFIGURATION SAVED' : 'COMMIT AMENDMENTS')}
                    </button>
                </div>
            }
        >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-8 space-y-10">
                    <SettingsSection 
                        icon={<Camera className="w-5 h-5" strokeWidth={2.5} />} 
                        title="Surveillance Directives" 
                        subtitle="Coordinate capture behavior and privacy masking protocols"
                    >
                        <ToggleField
                            label="Privacy Shrouding (Gaussian Blur)"
                            description="Apply high-frequency blurring to all captured visual data"
                            value={settings.screenshotBlur}
                            onChange={v => update('screenshotBlur', v)}
                        />
                        <div className="bg-primary/[0.03] border border-primary/10 rounded-[32px] p-8 text-xs text-text-primary flex items-start gap-6 shadow-sm mt-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/[0.02] rounded-full translate-x-16 -translate-y-16" />
                            <div className="w-12 h-12 rounded-2xl bg-surface-solid border border-primary/20 flex items-center justify-center shrink-0 shadow-sm rotate-3 group-hover:rotate-0 transition-transform">
                                <Info className="w-6 h-6 text-primary" strokeWidth={3} />
                            </div>
                            <p className="leading-relaxed font-bold uppercase tracking-widest text-[10px] font-mono opacity-80 pt-1">
                                Capture status: <span className="text-primary font-black underline underline-offset-4 decoration-primary/30 uppercase italic">Active Protocol</span>. <br/>
                                System executes capturing 3 times per 600s operational cycle.
                            </p>
                        </div>
                    </SettingsSection>

                    <SettingsSection 
                        icon={<Clock className="w-5 h-5" strokeWidth={2.5} />} 
                        title="Inactivity Detection" 
                        subtitle="Parameters for autonomous status transitions"
                    >
                        <div className="space-y-12">
                            <RangeField
                                label="Idle Threshold"
                                description="Duration of zero-input before standby protocol activation"
                                value={settings.idleThresholdSeconds}
                                unit="SEC"
                                min={30} max={1800} step={30}
                                onChange={v => update('idleThresholdSeconds', v)}
                                color="primary"
                            />
                            <div className="h-px bg-border mx-2" />
                            <ToggleField
                                label="Autonomous Cessation"
                                description="Automatically terminate tracking upon extended standby"
                                value={settings.autoStopOnIdle}
                                onChange={v => update('autoStopOnIdle', v)}
                            />
                            {settings.autoStopOnIdle && (
                                <div className="pl-8 border-l-4 border-primary/20 pt-6 animate-in slide-in-from-left-4 duration-500">
                                    <RangeField
                                        label="Cessation Delay"
                                        description="Interval before mandatory system stop"
                                        value={settings.idleAutoStopMinutes}
                                        unit="MIN"
                                        min={5} max={120} step={5}
                                        onChange={v => update('idleAutoStopMinutes', v)}
                                        color="primary"
                                    />
                                </div>
                            )}
                        </div>
                    </SettingsSection>

                    <SettingsSection 
                        icon={<Monitor className="w-5 h-5" strokeWidth={2.5} />} 
                        title="Operational Capacity" 
                        subtitle="Hard limits for tracked resource expenditure"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <RangeField
                                label="Daily Capacity Limit"
                                description="Maximum allocation per 24h cycle"
                                value={settings.dailyHoursLimit}
                                unit="HR"
                                min={1} max={24}
                                onChange={v => update('dailyHoursLimit', v)}
                                color="primary"
                            />
                            <RangeField
                                label="Weekly Capacity Limit"
                                description="Maximum allocation per 7d cycle"
                                value={settings.weeklyHoursLimit}
                                unit="HR"
                                min={1} max={168}
                                onChange={v => update('weeklyHoursLimit', v)}
                                color="primary"
                            />
                        </div>
                    </SettingsSection>

                    <SettingsSection 
                        icon={<Shield className="w-5 h-5" strokeWidth={2.5} />} 
                        title="Intelligent Monitoring" 
                        subtitle="Metadata collection and environmental analysis"
                    >
                        <div className="space-y-12">
                            <ToggleField
                                label="Network Domain Analytics"
                                description="Log active top-level domains in the operational registry"
                                value={settings.trackUrls}
                                onChange={v => update('trackUrls', v)}
                            />
                            <div className="h-px bg-border mx-2" />
                            <ToggleField
                                label="Environment Forensics"
                                description="Identify active application process headers"
                                value={settings.trackApps}
                                onChange={v => update('trackApps', v)}
                            />
                        </div>
                    </SettingsSection>
                </div>

                <div className="lg:col-span-4 space-y-10">
                    <Card className="p-10 shadow-2xl bg-surface-solid border-border rounded-[48px] relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/[0.02] blur-3xl rounded-full -mr-24 -mt-24 group-hover:scale-150 transition-transform duration-1000" />
                        
                        <div className="relative z-10">
                            <div className="flex items-center gap-5 mb-12">
                                <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/30 rotate-12 group-hover:rotate-0 transition-transform duration-700">
                                    <Zap className="w-7 h-7" strokeWidth={2.5} />
                                </div>
                                <div className="flex flex-col">
                                    <h3 className="text-xl font-black text-text-primary tracking-tighter uppercase leading-none italic">Active Registry</h3>
                                    <p className="text-[9px] font-bold text-text-muted uppercase tracking-[0.3em] font-mono mt-2 opacity-60 italic text-primary">Deployment: LIVE</p>
                                </div>
                            </div>
                            
                            <div className="space-y-6 font-mono">
                                <ConfigValue label="SURVEILLANCE_MOD" value={`${settings.screenshotIntervalMin}-${settings.screenshotIntervalMax}M`} />
                                <ConfigValue label="IDLE_COOLDOWN" value={`${settings.idleThresholdSeconds}S`} />
                                <ConfigValue label="DAILY_QUOTA" value={`${settings.dailyHoursLimit}H`} />
                                <ConfigValue label="WEEKLY_QUOTA" value={`${settings.weeklyHoursLimit}H`} />
                                <div className="h-px bg-border my-2" />
                                <ConfigValue label="PRIVACY_PROTOCOL" value={settings.screenshotBlur ? 'ENABLED' : 'DISABLED'} color={settings.screenshotBlur ? 'emerald' : 'rose'} />
                                <ConfigValue label="NET_FORENSICS" value={settings.trackUrls ? 'ACTIVE' : 'INACTIVE'} color={settings.trackUrls ? 'emerald' : 'rose'} />
                                <ConfigValue label="ENV_FORENSICS" value={settings.trackApps ? 'ACTIVE' : 'INACTIVE'} color={settings.trackApps ? 'emerald' : 'rose'} />
                            </div>
                        </div>
                    </Card>

                    <SettingsSection 
                        icon={<Bell className="w-5 h-5" strokeWidth={2.5} />} 
                        title="Alert Systems" 
                        subtitle="Push notification routing"
                    >
                        <div className="space-y-10">
                            <ToggleField
                                label="Idle Alerts"
                                description="Push notification on status transition"
                                value={settings.notifyIdle}
                                onChange={v => update('notifyIdle', v)}
                            />
                            <div className="h-px bg-border" />
                            <ToggleField
                                label="Quata Overflow"
                                description="Alert upon exceeding daily limits"
                                value={settings.notifyDailyLimit}
                                onChange={v => update('notifyDailyLimit', v)}
                            />
                        </div>
                    </SettingsSection>
                    
                    <div className="bg-surface-solid border border-rose-500/20 rounded-[48px] p-12 flex flex-col items-center text-center group transition-all hover:bg-rose-500/[0.02] shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-32 h-32 bg-rose-500/[0.01] rounded-full blur-3xl -ml-16 -mt-16" />
                        
                        <div className="w-20 h-20 rounded-[32px] bg-rose-500/5 flex items-center justify-center mb-8 shadow-sm border border-rose-500/10 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-700">
                            <ShieldAlert className="w-10 h-10 text-rose-600" strokeWidth={2.5} />
                        </div>
                        <h4 className="text-2xl font-black text-text-primary tracking-tighter mb-4 uppercase leading-none italic font-mono">Legacy Purge</h4>
                        <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] leading-relaxed mb-10 font-mono opacity-40 italic">
                            Dissolution of configuration will revert system to baseline manufacturing defaults.
                        </p>
                        <button 
                            disabled={isViewer}
                            onClick={handleReset}
                            className="w-full py-5 border border-rose-500/30 text-rose-600 text-[10px] font-bold uppercase tracking-[0.3em] rounded-[24px] hover:bg-rose-600 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 font-mono shadow-sm italic"
                        >
                            Execute Global Reset
                        </button>
                    </div>
                </div>
            </div>
        </PageLayout>
    );
}

function SettingsSection({ icon, title, subtitle, children }: { icon: React.ReactNode; title: string; subtitle: string; children: React.ReactNode }) {
    return (
        <Card className="p-0 overflow-hidden bg-surface-solid border-border shadow-2xl group/section transition-all hover:border-primary/30 duration-500 mb-10 last:mb-0 rounded-[48px]">
            <div className="px-12 py-10 border-b border-border bg-surface-subtle/50 flex items-center gap-8">
                <div className="w-16 h-16 rounded-2xl bg-surface-solid border border-border flex items-center justify-center text-primary shadow-sm group-hover/section:scale-110 group-hover/section:rotate-3 transition-all duration-700">
                    {icon}
                </div>
                <div>
                    <h2 className="text-2xl font-black text-text-primary tracking-tighter leading-none mb-2 uppercase italic font-mono">{title}</h2>
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] font-mono italic opacity-40 leading-none">{subtitle}</p>
                </div>
            </div>
            <div className="p-12">{children}</div>
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
        <div className="space-y-10">
            <div className="flex justify-between items-start pr-4">
                <div className="space-y-3">
                    <p className="text-xl font-black text-text-primary tracking-tighter leading-none uppercase italic font-mono">{label}</p>
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.1em] font-mono italic opacity-40">{description}</p>
                </div>
                <div className="flex items-baseline gap-3 bg-surface-subtle px-8 py-4 rounded-2xl border border-border shadow-inner font-mono">
                    <span className="text-3xl font-black text-primary tracking-tighter italic">{value}</span>
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em]">{unit}</span>
                </div>
            </div>
            <div className="px-2">
                <input
                    type="range" min={min} max={max} step={step} value={value}
                    onChange={e => onChange(Number(e.target.value))}
                    className={clsx("w-full h-2 rounded-full appearance-none cursor-pointer bg-border shadow-inner transition-all", accColors[color])}
                />
            </div>
            <div className="flex justify-between px-2 text-[9px] font-bold text-text-muted/20 uppercase tracking-[0.4em] font-mono italic">
                <span>{min}{unit}</span>
                <span>{max}{unit}</span>
            </div>
        </div>
    );
}

function ToggleField({ label, description, value, onChange }: { label: string; description: string; value: boolean; onChange: (v: boolean) => void }) {
    return (
        <div className="flex items-center justify-between group/toggle">
            <div className="space-y-3 flex-1 pr-16">
                <p className="text-xl font-black text-text-primary tracking-tighter leading-none uppercase italic font-mono">{label}</p>
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.15em] font-mono italic opacity-40 leading-relaxed">{description}</p>
            </div>
            <button
                type="button"
                onClick={() => onChange(!value)}
                className={clsx(
                    "relative inline-flex h-12 w-24 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-700 ease-in-out shadow-inner",
                    value ? "bg-primary shadow-primary/30" : "bg-border"
                )}
            >
                <span 
                    className={clsx(
                        "pointer-events-none inline-block h-10 w-10 rounded-full bg-white shadow-xl ring-0 transition-all duration-700 ease-in-out mt-0.5 ml-0.5",
                        value ? "translate-x-12" : "translate-x-0"
                    )} 
                />
            </button>
        </div>
    );
}

function ConfigValue({ label, value, color = 'primary' }: { label: string; value: string; color?: 'primary' | 'emerald' | 'rose' }) {
    const textColors = {
        primary: 'text-primary',
        emerald: 'text-emerald-600',
        rose: 'text-rose-600'
    };
    
    return (
        <div className="flex justify-between items-center text-[10px] group/item">
            <span className="text-text-muted font-bold tracking-[0.2em] group-hover/item:text-text-primary transition-colors uppercase font-mono italic opacity-60">{label}</span>
            <span className={clsx("font-black tracking-widest uppercase italic", textColors[color])}>{value}</span>
        </div>
    );
}
