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
            title="Settings"
            description="Configure tracking intervals, privacy options, and notification preferences."
            maxWidth="full"
            actions={
                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleReset}
                        disabled={isViewer}
                        className={clsx(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all border border-border bg-surface-solid shadow-sm",
                            isViewer ? "opacity-30 cursor-not-allowed" : "text-text-muted hover:text-text-primary hover:bg-surface-subtle active:scale-95"
                        )}
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Restore Defaults
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isViewer}
                        className={clsx(
                            "flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold transition-all shadow-sm active:scale-95",
                            isViewer ? "bg-black/10 text-text-muted cursor-not-allowed" : 
                            (saved ? "bg-emerald-600 text-white" : "bg-primary text-white hover:bg-primary/90")
                        )}
                    >
                        {saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                        {isViewer ? 'Read Only' : (saved ? 'Saved' : 'Save Changes')}
                    </button>
                </div>
            }
        >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-8 space-y-10">
                    <SettingsSection 
                        icon={<Camera className="w-5 h-5" />} 
                        title="Screen Captures" 
                        subtitle="Configure screenshot frequency and privacy settings"
                    >
                        <ToggleField
                            label="Blur Screenshots"
                            description="Apply a blur effect to all captured screen data for privacy"
                            value={settings.screenshotBlur}
                            onChange={v => update('screenshotBlur', v)}
                        />
                        <div className="bg-primary/5 border border-primary/10 rounded-xl p-6 text-xs text-text-primary flex items-start gap-4 shadow-sm mt-8">
                            <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                            <p className="leading-relaxed font-medium">
                                Screenshots are currently being captured at a frequency of <span className="text-primary font-bold">{settings.screenshotIntervalMin}-{settings.screenshotIntervalMax} minutes</span>.
                            </p>
                        </div>
                    </SettingsSection>

                    <SettingsSection 
                        icon={<Clock className="w-5 h-5" />} 
                        title="Idle Detection" 
                        subtitle="Manage how the system handles user inactivity"
                    >
                        <div className="space-y-12">
                            <RangeField
                                label="Idle Timeout"
                                description="Time before the user is considered idle"
                                value={settings.idleThresholdSeconds}
                                unit="SEC"
                                min={30} max={1800} step={30}
                                onChange={v => update('idleThresholdSeconds', v)}
                                color="primary"
                            />
                            <div className="h-px bg-border mx-2" />
                            <ToggleField
                                label="Auto-Stop on Idle"
                                description="Automatically stop the timer after the idle timeout"
                                value={settings.autoStopOnIdle}
                                onChange={v => update('autoStopOnIdle', v)}
                            />
                            {settings.autoStopOnIdle && (
                                <div className="pl-8 border-l-4 border-primary/20 pt-6 animate-in slide-in-from-left-4 duration-500">
                                    <RangeField
                                        label="Stop Delay"
                                        description="Wait time before stopping the timer"
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
                        icon={<Monitor className="w-5 h-5" />} 
                        title="Tracking Limits" 
                        subtitle="Set daily and weekly tracking quotas"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <RangeField
                                label="Daily Limit"
                                description="Maximum tracking per 24-hour cycle"
                                value={settings.dailyHoursLimit}
                                unit="HR"
                                min={1} max={24}
                                onChange={v => update('dailyHoursLimit', v)}
                                color="primary"
                            />
                            <RangeField
                                label="Weekly Limit"
                                description="Maximum tracking per 7-day cycle"
                                value={settings.weeklyHoursLimit}
                                unit="HR"
                                min={1} max={168}
                                onChange={v => update('weeklyHoursLimit', v)}
                                color="primary"
                            />
                        </div>
                    </SettingsSection>

                    <SettingsSection 
                        icon={<Shield className="w-5 h-5" />} 
                        title="Activity Tracking" 
                        subtitle="Choose which types of activity should be monitored"
                    >
                        <div className="space-y-12">
                            <ToggleField
                                label="URL Tracking"
                                description="Track visited websites and domains"
                                value={settings.trackUrls}
                                onChange={v => update('trackUrls', v)}
                            />
                            <div className="h-px bg-border mx-2" />
                            <ToggleField
                                label="App Tracking"
                                description="Track active computer applications"
                                value={settings.trackApps}
                                onChange={v => update('trackApps', v)}
                            />
                        </div>
                    </SettingsSection>
                </div>

                <div className="lg:col-span-4 space-y-10">
                    <Card className="p-8 shadow-sm bg-surface-solid border-border rounded-xl relative overflow-hidden group">
                        <div className="relative z-10">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20 transition-transform duration-500">
                                    <Zap className="w-6 h-6" />
                                </div>
                                <div className="flex flex-col">
                                    <h3 className="text-lg font-bold text-text-primary tracking-tight uppercase">Current Configuration</h3>
                                    <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mt-1">Status: <span className="text-emerald-600 font-bold">Active</span></p>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <ConfigValue label="Capture Range" value={`${settings.screenshotIntervalMin}-${settings.screenshotIntervalMax}m`} />
                                <ConfigValue label="Idle Timeout" value={`${settings.idleThresholdSeconds}s`} />
                                <ConfigValue label="Daily Quota" value={`${settings.dailyHoursLimit}h`} />
                                <ConfigValue label="Weekly Quota" value={`${settings.weeklyHoursLimit}h`} />
                                <div className="h-px bg-border my-2" />
                                <ConfigValue label="Privacy Mode" value={settings.screenshotBlur ? 'Enabled' : 'Disabled'} color={settings.screenshotBlur ? 'emerald' : 'rose'} />
                                <ConfigValue label="URL Tracking" value={settings.trackUrls ? 'Active' : 'Inactive'} color={settings.trackUrls ? 'emerald' : 'rose'} />
                                <ConfigValue label="App Tracking" value={settings.trackApps ? 'Active' : 'Inactive'} color={settings.trackApps ? 'emerald' : 'rose'} />
                            </div>
                        </div>
                    </Card>

                    <SettingsSection 
                        icon={<Bell className="w-5 h-5" />} 
                        title="Notifications" 
                        subtitle="Set up system alerts and reminders"
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
                                label="Daily Limit Alerts"
                                description="Alert when daily limit is exceeded"
                                value={settings.notifyDailyLimit}
                                onChange={v => update('notifyDailyLimit', v)}
                            />
                        </div>
                    </SettingsSection>
                    
                    <div className="bg-surface-solid border border-rose-500/10 rounded-xl p-8 flex flex-col items-center text-center group transition-all hover:bg-rose-500/[0.02] shadow-sm relative overflow-hidden">
                        <div className="w-14 h-14 rounded-xl bg-rose-500/5 flex items-center justify-center mb-6 border border-rose-500/10 group-hover:scale-105 transition-all duration-500">
                            <ShieldAlert className="w-7 h-7 text-rose-600" />
                        </div>
                        <h4 className="text-lg font-bold text-text-primary tracking-tight mb-2 uppercase">Reset Settings</h4>
                        <p className="text-xs font-medium text-text-muted leading-relaxed mb-8">
                            Reverting to defaults will erase all custom configurations.
                        </p>
                        <button 
                            disabled={isViewer}
                            onClick={handleReset}
                            className="w-full py-3 border border-rose-500/30 text-rose-600 text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-rose-600 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 shadow-sm"
                        >
                            Reset All Settings
                        </button>
                    </div>
                </div>
            </div>
        </PageLayout>
    );
}

function SettingsSection({ icon, title, subtitle, children }: { icon: React.ReactNode; title: string; subtitle: string; children: React.ReactNode }) {
    return (
        <Card className="p-0 overflow-hidden bg-surface-solid border-border shadow-sm group/section transition-all hover:border-primary/20 duration-300 mb-8 last:mb-0 rounded-xl">
            <div className="px-8 py-6 border-b border-border bg-surface-subtle/30 flex items-center gap-6">
                <div className="w-12 h-12 rounded-xl bg-surface-solid border border-border flex items-center justify-center text-primary shadow-sm transition-all duration-500">
                    {icon}
                </div>
                <div>
                    <h2 className="text-lg font-bold text-text-primary tracking-tight leading-none mb-1 uppercase">{title}</h2>
                    <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider opacity-60 leading-none">{subtitle}</p>
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
                    <p className="text-base font-bold text-text-primary tracking-tight uppercase">{label}</p>
                    <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider opacity-60">{description}</p>
                </div>
                <div className="flex items-baseline gap-1.5 bg-surface-subtle px-4 py-2 rounded-lg border border-border shadow-sm">
                    <span className="text-xl font-bold text-primary">{value}</span>
                    <span className="text-[10px] font-bold text-text-muted uppercase">{unit}</span>
                </div>
            </div>
            <div className="px-1">
                <input
                    type="range" min={min} max={max} step={step} value={value}
                    onChange={e => onChange(Number(e.target.value))}
                    className={clsx("w-full h-1.5 rounded-full appearance-none cursor-pointer bg-border transition-all", accColors[color])}
                />
            </div>
            <div className="flex justify-between px-1 text-[9px] font-bold text-text-muted/30 uppercase tracking-widest">
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
                <p className="text-base font-bold text-text-primary tracking-tight uppercase">{label}</p>
                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider opacity-60 leading-relaxed">{description}</p>
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
                        "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out transform",
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
        emerald: 'text-emerald-600',
        rose: 'text-rose-600'
    };
    
    return (
        <div className="flex justify-between items-center text-[11px]">
            <span className="text-text-muted font-bold tracking-wider uppercase opacity-80">{label}</span>
            <span className={clsx("font-bold uppercase", textColors[color])}>{value}</span>
        </div>
    );
}
