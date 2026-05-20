import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock, Mail, ArrowRight, Square,
  ChevronRight, LogOut, CheckCircle2,
  ShieldAlert, Eye, EyeOff, MapPin, MonitorPlay, MousePointerClick,
  ClipboardList, Calendar, Circle, ChevronDown, ChevronUp,
  User as UserIcon, Save, RefreshCcw,
  HelpCircle, LifeBuoy, MessageSquare, Send, ArrowLeft,
  Bell, ShieldCheck, Smartphone
} from 'lucide-react';
import { trackerAPI } from './tauri-ipc';
import './App.css';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

let _supabase: any = null;
async function getSupabase() {
  if (!_supabase) {
    const { createClient } = await import('@supabase/supabase-js');
    _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return _supabase;
}

type Screen = 'login' | 'projects' | 'consent' | 'tracker' | 'settings' | 'support';

interface NotificationSettings {
  tracking_alerts: boolean;
  screenshot_alerts: boolean;
  tracking_reminders: boolean;
  reminder_interval?: number;
}

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  weekly_limit?: number;
  daily_limit?: number;
  idle_limit?: number;
  idle_enabled?: boolean;
  keep_idle_mode?: 'prompt' | 'always' | 'never';
  tracking_enabled?: boolean;
  avatar_url?: string;
  phone?: string;
  work_phone?: string;
  personal_phone?: string;
  organization_id?: string;
  timezone?: string;
  keep_idle?: boolean;
  custom_fields?: {
    notification_settings?: NotificationSettings;
    close_behavior?: 'quit' | 'minimize';
  };
  plan_type?: string;
}

async function syncTimezone(sb: any, memberId: string, memberTz: string | null | undefined) {
  try {
    const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (memberTz !== localTz && localTz) {
      await sb.from('members').update({ timezone: localTz }).eq('id', memberId);
      console.log(`Synced timezone from ${memberTz} to ${localTz}`);
      return localTz;
    }
    return memberTz || localTz;
  } catch (e) {
    console.error('Failed to sync timezone', e);
    return memberTz;
  }
}

interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  stats?: {
    todaySeconds: number;
    weeklySeconds: number;
    weeklyIdleSeconds?: number;
    activityPercent: number;
    rawTodaySeconds?: number;
    keptIdleSeconds?: number;
  };
}

interface Todo {
  id: string;
  title: string;
  description?: string;
  status: 'Todo' | 'In Progress' | 'Done';
  due_date?: string;
  project_id?: string;
  assignee_id?: string;
  projectName?: string;
  projectColor?: string;
}

// ── Signed Image Component ──────────────────────────────────────────────────
function SignedImage({ path, bucket, className, alt = "" }: { path: string; bucket: string; className?: string; alt?: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!path) return;
    if (path.startsWith('http') && !path.includes('.supabase.co/storage/v1/object/')) {
      setUrl(path);
      return;
    }

    // Extract path from Supabase storage URL if needed
    let finalPath = path;
    if (path.includes('.supabase.co/storage/v1/object/')) {
      const parts = path.split('/avatars/');
      if (parts.length > 1) finalPath = parts[1];
    }

    let isMounted = true;
    const fetchUrl = async () => {
      try {
        const sb = await getSupabase();
        const { data, error } = await sb.storage.from(bucket).createSignedUrl(finalPath, 3600);
        if (error) throw error;
        if (isMounted) setUrl(data.signedUrl);
      } catch (err) {
        console.error('Error fetching signed URL:', err);
      }
    };

    fetchUrl();
    return () => { isMounted = false; };
  }, [path, bucket]);

  if (!url) return <div className={className} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f0f0' }}>...</div>;
  return <img src={url} alt={alt} className={className} />;
}

const TOKEN_KEY = 'digireps_token';
const USER_KEY = 'digireps_user';
const CONSENT_KEY = 'digireps_consent_v1';

function loadSession(): { token: string; user: User } | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const user = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    if (token && user) return { token, user };
  } catch { }
  return null;
}
function saveSession(token: string, user: User) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}
function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
function hasConsented(): boolean {
  return localStorage.getItem(CONSENT_KEY) === 'true';
}
function saveConsent() {
  localStorage.setItem(CONSENT_KEY, 'true');
}

function formatTime(seconds: number): string {
  if (Math.abs(seconds) < 60) return `${Math.round(seconds)}s`;
  const h = Math.floor(Math.abs(seconds) / 3600);
  const m = Math.floor((Math.abs(seconds) % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ── Clock & Local Context ──────────────────────────────────────────────────
function LocalClock() {
  const [now, setNow] = useState(new Date());
  const [loc, setLoc] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);

    const fetchLoc = async () => {
      const locStr = await trackerAPI.getLocation();
      if (locStr) setLoc(locStr);
    };

    fetchLoc();
    return () => clearInterval(timer);
  }, []);

  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const dateStr = now.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="local-context" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', borderLeft: '1px solid var(--border-light)', paddingLeft: '0.875rem', margin: '0 0.875rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.875rem' }}>
        <span>{timeStr}</span>
        <span style={{ fontSize: '0.6875rem', opacity: 0.6, fontWeight: 400 }}>{dateStr}</span>
      </div>
      {loc && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.625rem', color: 'var(--text-tertiary)', marginTop: '0.125rem' }}>
          <MapPin size={10} />
          {loc}
        </div>
      )}
    </div>
  );
}

// ── App Footer (Auto-sync & Location) ──────────────────────────────────────────
function AppFooter({ lastSyncTime, isSyncing, onSync, isOnline }: {
  lastSyncTime: Date | null,
  isSyncing: boolean,
  onSync: () => void,
  isOnline: boolean
}) {
  const [version, setVersion] = useState<string>('...');
  const [loc, setLoc] = useState<string | null>(null);

  useEffect(() => {
    // 1. Get Version
    const tauri = (window as any).__TAURI__;
    if (tauri?.app) {
      tauri.app.getVersion().then(setVersion);
    } else {
      setVersion('1.2.6');
    }

    // 2. Get Location
    const fetchLoc = async () => {
      const locStr = await trackerAPI.getLocation();
      if (locStr) setLoc(locStr);
    };

    fetchLoc();
  }, []);

  const syncTimeStr = lastSyncTime
    ? lastSyncTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    : '';

  return (
    <footer className="app-footer">
      <div className="footer-left">
        <div className={`footer-sync-wrap ${!isOnline ? 'is-offline' : ''}`}>
          <button
            className={`footer-sync-btn ${isSyncing ? 'syncing' : ''} ${!isOnline ? 'disconnected' : ''}`}
            onClick={onSync}
            disabled={isSyncing}
            title={isOnline ? "Force refresh data from server" : "Offline - Click to try reconnecting"}
          >
            <RefreshCcw size={14} className={isSyncing ? 'animate-spin' : ''} />
          </button>
          <div className="footer-sync-text">
            <span className={`sync-status-indicator ${!isOnline ? 'offline' : ''}`}></span>
            {!isOnline ? 'Offline - Waiting for connection' : (lastSyncTime ? `Synced at ${syncTimeStr}` : 'Syncing...')}
          </div>
        </div>
      </div>

      <div className="footer-right">
        <div className="footer-meta-item">
          <Smartphone size={12} className="meta-icon" />
          <span className="footer-version">v{version}</span>
        </div>
        {loc && (
          <div className="footer-meta-item">
            <MapPin size={12} className="meta-icon" />
            <span className="footer-location">{loc}</span>
          </div>
        )}
      </div>
    </footer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen: Settings
// ─────────────────────────────────────────────────────────────────────────────
function SettingsScreen({ user, onSave, onBack, onLogout }: {
  user: User;
  onSave: (updated: Partial<User>) => Promise<void>;
  onBack: () => void;
  onLogout: () => void;
}) {
  const [fullName, setFullName] = useState(user.full_name);
  const [phone, setPhone] = useState(user.phone || '');
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url || '');
  const [notifyTracking, setNotifyTracking] = useState(user.custom_fields?.notification_settings?.tracking_alerts ?? true);
  const [notifyScreenshots, setNotifyScreenshots] = useState(user.custom_fields?.notification_settings?.screenshot_alerts ?? true);
  const [notifyReminders, setNotifyReminders] = useState(user.custom_fields?.notification_settings?.tracking_reminders ?? true);
  const [closeBehavior] = useState<'quit' | 'minimize'>('quit');
  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [orgName, setOrgName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Sync to Rust on mount
    trackerAPI.setCloseBehavior(closeBehavior);
  }, []);

  // Fetch organization name on mount
  useEffect(() => {
    if (!user.organization_id) return;
    getSupabase().then(async (sb: any) => {
      const { data } = await sb
        .from('organizations')
        .select('name')
        .eq('id', user.organization_id)
        .maybeSingle();
      if (data?.name) setOrgName(data.name);
    });
  }, [user.organization_id]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const sb = await getSupabase();
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.organization_id}/${user.id}/${fileName}`;

      const { error: uploadError } = await sb.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      setAvatarUrl(filePath);
    } catch (err: any) {
      console.error('Upload failed:', err.message);
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setIsSaving(true);
    const updatedCustomFields = {
      ...(user.custom_fields || {}),
      notification_settings: {
        ...(user.custom_fields?.notification_settings || {}),
        tracking_alerts: notifyTracking,
        screenshot_alerts: notifyScreenshots,
        tracking_reminders: notifyReminders
      }
    };
    await onSave({
      full_name: fullName,
      phone,
      work_phone: phone,
      personal_phone: phone,
      avatar_url: avatarUrl,
      custom_fields: {
        ...updatedCustomFields,
        close_behavior: 'quit'
      }
    });
    trackerAPI.setCloseBehavior(closeBehavior);
    setIsSaving(false);
  }

  return (
    <div className="settings-screen">
      <header className="settings-header">
        <button onClick={onBack} className="settings-back-btn">
          <ArrowLeft size={20} />
        </button>
        <div className="settings-header-titles">
          <h2 className="heading-2">Settings</h2>
          <p className="text-muted">Personalize your experience</p>
        </div>
      </header>

      <div className="settings-content">
        {/* Profile Card */}
        <div className="settings-card profile-card">
          <div className="avatar-section">
            <div className="avatar-preview-container">
              {avatarUrl ? (
                <SignedImage path={avatarUrl} bucket="avatars" className="avatar-preview-large" />
              ) : (
                <div className="avatar-placeholder-large">
                  <UserIcon size={32} />
                </div>
              )}
              <button className="btn-avatar-edit" onClick={() => fileInputRef.current?.click()} title="Change Avatar">
                {uploading ? '...' : (
                  <img
                    src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'/%3E%3Cpolyline points='17 8 12 3 7 8'/%3E%3Cline x1='12' y1='3' x2='12' y2='15'/%3E%3C/svg%3E"
                    alt="Upload"
                    style={{ width: '16px', height: '16px', display: 'block', margin: 'auto' }}
                  />
                )}
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />
            </div>
            <div className="profile-identity">
              <h3 className="profile-name">{fullName || 'Your Name'}</h3>
              <p className="profile-email">{user.email}</p>
              {orgName && (
                <p className="profile-org">{orgName}</p>
              )}
            </div>
          </div>
        </div>

        {/* Form Sections */}
        <div className="settings-form-container">
          <div className="settings-section">
            <div className="section-header">
              <UserIcon size={16} className="section-icon" />
              <h3 className="section-title">Personal Information</h3>
            </div>

            <div className="settings-group">
              <div className="field-group">
                <label className="field-label">Full Name</label>
                <div className="field-input-wrap">
                  <UserIcon size={14} className="field-icon" />
                  <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="field-input" placeholder="John Doe" />
                </div>
              </div>

              <div className="field-group">
                <label className="field-label">Phone Number</label>
                <div className="field-input-wrap">
                  <Smartphone size={14} className="field-icon" />
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="field-input" placeholder="+1 (555) 000-0000" />
                </div>
              </div>

              <div className="field-group">
                <label className="field-label">Email Address</label>
                <div className="field-input-wrap disabled">
                  <Mail size={14} className="field-icon" />
                  <input type="email" value={user.email} disabled className="field-input" />
                  <div className="verified-badge">
                    <ShieldCheck size={10} />
                    <span>VERIFIED</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="settings-section">
            <div className="section-header">
              <Bell size={16} className="section-icon" />
              <h3 className="section-title">Notifications</h3>
            </div>

            <div className="settings-group">
              <div className="toggle-row">
                <div className="toggle-info">
                  <span className="toggle-label">Tracking Alerts</span>
                  <span className="toggle-desc">Notify when tracking starts/stops</span>
                </div>
                <label className="switch">
                  <input type="checkbox" checked={notifyTracking} onChange={e => setNotifyTracking(e.target.checked)} />
                  <span className="slider round"></span>
                </label>
              </div>

              {(user.plan_type === 'Premium' || user.plan_type === 'Trial') && (
                <div className="toggle-row">
                  <div className="toggle-info">
                    <span className="toggle-label">Screenshot Alerts</span>
                    <span className="toggle-desc">Notify on every screen capture</span>
                  </div>
                  <label className="switch">
                    <input type="checkbox" checked={notifyScreenshots} onChange={e => setNotifyScreenshots(e.target.checked)} />
                    <span className="slider round"></span>
                  </label>
                </div>
              )}

              <div className="toggle-row">
                <div className="toggle-info">
                  <span className="toggle-label">Tracking Reminders</span>
                  <span className="toggle-desc">Nudge if I'm not tracking time</span>
                </div>
                <label className="switch">
                  <input type="checkbox" checked={notifyReminders} onChange={e => setNotifyReminders(e.target.checked)} />
                  <span className="slider round"></span>
                </label>
              </div>
            </div>
          </div>

          <div className="settings-footer">
            <button onClick={save} disabled={isSaving || uploading} className="btn btn-primary btn-save">
              <Save size={18} />
              <span>{isSaving ? 'Saving Changes...' : 'Save Changes'}</span>
            </button>
            <button onClick={() => { onBack(); onLogout(); }} className="btn-logout-settings">
              <LogOut size={16} />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SupportScreen({ user, onBack }: { user: User; onBack: () => void }) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      const sb = await getSupabase();
      const { error: submitError } = await sb.from('support_tickets').insert({
        user_id: user.id,
        organization_id: user.organization_id,
        subject,
        message,
      });
      if (submitError) throw submitError;
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send support ticket');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="support-screen">
      <header className="settings-header">
        <button onClick={onBack} className="settings-back-btn">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="heading-2">Support & Help</h2>
          <p className="text-muted" style={{ fontSize: '0.6875rem', marginTop: '0.125rem' }}>How can we help you today?</p>
        </div>
      </header>

      <div className="settings-content" style={{ padding: '1.5rem' }}>
        <AnimatePresence mode="wait">
          {sent ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="support-success"
              style={{ textAlign: 'center', padding: '2rem 1rem' }}
            >
              <div className="success-icon-wrap" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                <div style={{ background: 'var(--success-bg)', color: 'var(--success)', padding: '1rem', borderRadius: '50%' }}>
                  <CheckCircle2 size={48} />
                </div>
              </div>
              <h3 className="heading-3">Message Sent!</h3>
              <p className="text-muted" style={{ marginTop: '0.5rem', marginBottom: '1.5rem' }}>
                Thank you for reaching out. Our support team will get back to you at <strong>{user.email}</strong> as soon as possible.
              </p>
              <button onClick={onBack} className="btn btn-primary" style={{ width: '100%' }}>
                Back to Dashboard
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="support-options" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                <div className="support-option-card" style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border-light)',
                  padding: '1rem',
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}>
                  <LifeBuoy size={20} style={{ color: 'var(--accent)', marginBottom: '0.5rem' }} />
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 600, margin: 0 }}>Guides</h4>
                  <p style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>Help documentation</p>
                </div>
                <div className="support-option-card" style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border-light)',
                  padding: '1rem',
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}>
                  <MessageSquare size={20} style={{ color: 'var(--success)', marginBottom: '0.5rem' }} />
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 600, margin: 0 }}>Chat</h4>
                  <p style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>Talk to an agent</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="support-form">
                <div className="field-group">
                  <label className="field-label">Subject</label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    className="field-input"
                    placeholder="Briefly describe your issue"
                  />
                </div>
                <div className="field-group">
                  <label className="field-label">Message</label>
                  <textarea
                    required
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    className="field-input"
                    style={{ minHeight: '120px', paddingTop: '0.75rem', resize: 'none' }}
                    placeholder="Tell us more about what's happening..."
                  />
                </div>

                {error && (
                  <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                    <ShieldAlert size={14} /><span>{error}</span>
                  </div>
                )}

                <button type="submit" disabled={sending} className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                  {sending ? 'Sending...' : 'Send Message'}
                  {!sending && <Send size={16} style={{ marginLeft: '0.5rem' }} />}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const [screen, setScreen] = useState<Screen>('login');
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [rememberMe, setRememberMe] = useState(true);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  useEffect(() => {
    if (isOnline && (trackingError?.includes('offline') || trackingError?.includes('Network error'))) {
      setTrackingError(null);
    }
  }, [isOnline, trackingError]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const idleMinutesRef = useRef(0);
  const [idlePaused, setIdlePaused] = useState(false);
  const [liveIdleSeconds, setLiveIdleSeconds] = useState(0); // live idle tracking for current session
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const realtimeRef = useRef<any>(null);
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);
  const [updateInstalling, setUpdateInstalling] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);
  const memberSubscriptionRef = useRef<any>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(() => {
    const stored = localStorage.getItem('lastSyncTime');
    return stored ? new Date(stored) : null;
  });
  const [isSyncing, setIsSyncing] = useState(false);

  const handleManualSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await trackerAPI.syncNow();
      if (user) await fetchDashboardStats(user.id, projects);
      setIsOnline(true);
      const now = new Date();
      setLastSyncTime(now);
      localStorage.setItem('lastSyncTime', now.toISOString());
    } catch (e: any) {
      console.error('[App] Sync failed:', e);
      const errMsg = e.toString();
      if (errMsg.includes('transport error') || errMsg.includes('Dns Failed')) {
        setIsOnline(false);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Keep a ref of notification settings for listeners/intervals to avoid stale closures
  const settingsRef = useRef(user?.custom_fields?.notification_settings);
  useEffect(() => {
    settingsRef.current = user?.custom_fields?.notification_settings;
  }, [user?.custom_fields?.notification_settings]);

  useEffect(() => {
    trackerAPI.setCloseBehavior('quit');
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isTracking) {
        // Use the non-async version or fire and forget if necessary, 
        // but for Tauri/Browser we want to attempt closure.
        trackerAPI.stopTracking();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isTracking]);

  let isFetchingStats = false;
  async function fetchDashboardStats(userId: string, currentProjects: Project[]) {
    if (isFetchingStats) return;
    isFetchingStats = true;
    try {
      const sb = await getSupabase();

      const now = new Date();
      // Start of current week (local Monday)
      const day = now.getDay();
      const diff = (day === 0 ? -6 : 1) - day;
      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff);
      weekStart.setHours(0, 0, 0, 0);

      // Stable Date Grouping (matches Admin Portal)
      const fmt = new Intl.DateTimeFormat('en-CA', {
        timeZone: user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        year: 'numeric', month: '2-digit', day: '2-digit'
      });
      const todayStr = fmt.format(now);

      // 1. Fetch user's sessions for this week
      const { data: sessionData, error: sessionErr } = await sb
        .from('sessions')
        .select('id, project_id, started_at, ended_at')
        .eq('user_id', userId)
        .gte('started_at', weekStart.toISOString());

      if (sessionErr) throw sessionErr;

      const sessionMap = new Map<string, string>();
      const sessionIds: string[] = [];
      for (const s of (sessionData || [])) {
        sessionMap.set(s.id, s.project_id);
        sessionIds.push(s.id);
      }

      // Fetch ALL samples for this week (Paginated to bypass 1000 row limit)
      let allSamples: any[] = [];
      const PAGE_SIZE = 1000;
      let hasMore = true;
      let page = 0;

      if (sessionIds.length > 0) {
        // chunk sessionIds if too large, but usually fine for a single week
        while (hasMore && page < 50) { // Safety limit 50k
          const { data: _samples, error: _sampleError } = await sb
            .from('activity_samples')
            .select(`
              recorded_at,
              idle,
              activity_percent,
              session_id
            `)
            .in('session_id', sessionIds)
            .gte('recorded_at', weekStart.toISOString())
            .order('recorded_at', { ascending: true })
            .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

          if (_sampleError) throw _sampleError;

          if (_samples && _samples.length > 0) {
            allSamples.push(..._samples.map((s: any) => ({
              ...s,
              sessions: { project_id: sessionMap.get(s.session_id) }
            })));
          }

          if (!_samples || _samples.length < PAGE_SIZE) {
            hasMore = false;
          }
          page++;
        }
      }

      const samples = allSamples;

      const statsMap: Record<string, any> = {};
      currentProjects.forEach(p => {
        statsMap[p.id] = { todaySeconds: 0, weeklySeconds: 0, weeklyIdleSeconds: 0, totalActivity: 0, sampleCount: 0, rawTodaySeconds: 0, keptIdleSeconds: 0 };
      });

      const nowMs = Date.now();
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      // Identify the latest active session (if any) to prevent ghost session duplication
      const activeSessions = (sessionData || []).filter((s: any) => !s.ended_at);
      const latestActiveSessionId = activeSessions.length > 0
        ? activeSessions.sort((a: any, b: any) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())[0].id
        : null;

      sessionData?.forEach((s: any) => {
        const pId = s.project_id;
        if (!statsMap[pId]) return;

        // Only count the session if it's either ended OR it's the very latest active session
        if (s.ended_at || s.id === latestActiveSessionId) {
          const startedAt = new Date(s.started_at).getTime();
          const endedAt = s.ended_at ? new Date(s.ended_at).getTime() : nowMs;

          if (endedAt > startOfToday.getTime()) {
            const effectiveStart = Math.max(startedAt, startOfToday.getTime());
            const durSeconds = Math.floor((endedAt - effectiveStart) / 1000);
            statsMap[pId].rawTodaySeconds += durSeconds;
          }
        }
      });



      const minuteMap = new Map<string, any>();
      (samples || []).forEach(s => {
        const minute = s.recorded_at ? s.recorded_at.substring(0, 16) : '';
        if (!minute) return;
        const existing = minuteMap.get(minute);
        if (!existing || (s.activity_percent ?? 0) > (existing.activity_percent ?? 0)) {
          minuteMap.set(minute, s);
        }
      });
      const dedupedSamples = Array.from(minuteMap.values());

      // Use the user's idle_limit (default to 10)
      const idleLimit = user?.idle_limit ?? 10;

      // Group samples by project to calculate threshold-aware stats
      const samplesByProject = new Map<string, any[]>();
      dedupedSamples.forEach(s => {
        const pid = s.sessions?.project_id;
        if (!pid || !statsMap[pid]) return;
        if (!samplesByProject.has(pid)) samplesByProject.set(pid, []);
        samplesByProject.get(pid)!.push(s);
      });

      samplesByProject.forEach((projectSamples, pid) => {
        const sorted = projectSamples.sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());

        let currentBlock: any[] = [];
        const countedAsIdle = new Set<string>(); // minutes (recorded_at strings)

        for (let i = 0; i < sorted.length; i++) {
          const s = sorted[i];
          const prev = i > 0 ? sorted[i - 1] : null;

          const gapMs = prev ? (new Date(s.recorded_at).getTime() - new Date(prev.recorded_at).getTime()) : 0;
          const isContiguous = prev && gapMs <= 125000;

          if (s.idle && isContiguous) {
            currentBlock.push(s);
          } else if (s.idle && !prev) {
            currentBlock = [s];
          } else if (s.idle && !isContiguous) {
            // End of a non-contiguous idle block
            if (currentBlock.length >= idleLimit) {
              currentBlock.forEach(b => countedAsIdle.add(b.recorded_at));
            }
            currentBlock = [s];
          } else {
            // Non-idle sample encountered
            if (currentBlock.length >= idleLimit) {
              currentBlock.forEach(b => countedAsIdle.add(b.recorded_at));
            }
            currentBlock = [];
          }
        }
        // Final block check
        if (currentBlock.length >= idleLimit) {
          currentBlock.forEach(b => countedAsIdle.add(b.recorded_at));
        }

        sorted.forEach(samp => {
          const dateStr = fmt.format(new Date(samp.recorded_at));
          const isIdle = countedAsIdle.has(samp.recorded_at);

          // Every sample represents 1 minute (60s) of tracked time
          statsMap[pid].weeklySeconds += 60;
          if (isIdle) {
            statsMap[pid].weeklyIdleSeconds += 60;
          }
          if (dateStr === todayStr) {
            statsMap[pid].todaySeconds += 60;
            if (isIdle) {
              statsMap[pid].keptIdleSeconds += 60;
            }
          }

          statsMap[pid].totalActivity += (samp.activity_percent ?? 0);
          statsMap[pid].sampleCount++;
        });
      });

      const updatedProjects = currentProjects.map(p => ({
        ...p,
        stats: statsMap[p.id] ? {
          todaySeconds: statsMap[p.id].todaySeconds,
          weeklySeconds: statsMap[p.id].weeklySeconds,
          weeklyIdleSeconds: statsMap[p.id].weeklyIdleSeconds,
          rawTodaySeconds: statsMap[p.id].rawTodaySeconds,
          keptIdleSeconds: statsMap[p.id].keptIdleSeconds,
          activityPercent: statsMap[p.id].sampleCount > 0
            ? Math.round(statsMap[p.id].totalActivity / statsMap[p.id].sampleCount)
            : 0
        } : { todaySeconds: 0, weeklySeconds: 0, weeklyIdleSeconds: 0, activityPercent: 0, rawTodaySeconds: 0, keptIdleSeconds: 0 }
      }));
      setProjects(updatedProjects);
      setIsOnline(true);

      setLastSyncTime(now);
      localStorage.setItem('lastSyncTime', now.toISOString());
    } catch (err: any) {
      console.error('fetchStats error:', err);
      const errMsg = err.toString();
      if (errMsg.includes('transport error') || errMsg.includes('Dns Failed')) {
        setIsOnline(false);
      }
    } finally {
      isFetchingStats = false;
    }
  }

  useEffect(() => {
    const tauri = (window as any).__TAURI__;
    if (tauri?.event) {
      tauri.event.listen('update-available', (ev: any) => {
        setUpdateVersion(ev.payload?.version || 'new version');
      });
      tauri.event.listen('update-progress', (ev: any) => {
        if (ev.payload === 100) setUpdateInstalling(false);
      });
    }

    const saved = loadSession();
    if (!saved) return;

    getSupabase().then(async (sb: any) => {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) { clearSession(); return; }

      let { data: member } = await sb.from('members')
        .select('*, organizations(plan_type)')
        .eq('auth_user_id', session.user.id)
        .single();

      if (!member && session.user.email) {
        const { data: byEmail } = await sb.from('members')
          .select('*, organizations(plan_type)')
          .eq('email', session.user.email)
          .single();
        if (byEmail && !byEmail.auth_user_id) {
          await sb.from('members').update({ auth_user_id: session.user.id }).eq('id', byEmail.id);
          member = { ...byEmail, auth_user_id: session.user.id };
        }
      }

      if (member) {
        const tz = await syncTimezone(sb, member.id, member.timezone);
        const userObj: User = {
          id: member.id,
          email: member.email,
          full_name: member.full_name,
          role: member.role,
          weekly_limit: member.weekly_limit,
          daily_limit: member.daily_limit,
          idle_limit: member.idle_limit,
          idle_enabled: member.idle_enabled,
          keep_idle_mode: member.keep_idle_mode,
          tracking_enabled: member.tracking_enabled,
          avatar_url: member.avatar_url,
          organization_id: member.organization_id,
          timezone: tz || undefined,
          keep_idle: member.keep_idle,
          phone: member.phone,
          custom_fields: member.custom_fields || {},
          plan_type: member.organizations?.plan_type || 'Basic'
        };
        console.log('USER LOADED (Session):', userObj);
        setUser(userObj);
        const { data: projs } = await sb.from('projects').select('*');
        const projectsList = projs || [];
        setProjects(projectsList);
        setScreen('projects');
        fetchAndSubscribeTodos(userObj.id);
        fetchDashboardStats(userObj.id, projectsList);
      } else {
        clearSession();
      }
    });
  }, []); // Run once on mount

  // ── Realtime: Listen for org plan changes ────────────────────────────────────
  // When the admin portal upgrades or downgrades the plan, update React state
  // and push the new plan to the Rust backend via the update_plan IPC command.
  useEffect(() => {
    if (!user?.organization_id) return;

    let channel: any = null;

    getSupabase().then((sb: any) => {
      channel = sb.channel(`org-plan-${user.organization_id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'organizations',
            filter: `id=eq.${user.organization_id}`
          },
          async (payload: any) => {
            const newPlanType: string = payload.new?.plan_type || 'Basic';
            const prevPlanType = user?.plan_type || 'Basic';

            if (newPlanType === prevPlanType) return;

            console.log(`[App] 🔄 Org plan changed: ${prevPlanType} → ${newPlanType}`);

            // 1. Update React state so UI reflects new plan immediately
            setUser(prev => prev ? { ...prev, plan_type: newPlanType } : prev);

            // 2. Push to Rust backend so next tracking session respects new plan
            const tauri = (window as any).__TAURI__;
            if (tauri?.core?.invoke) {
              try {
                await tauri.core.invoke('update_plan', { plan: newPlanType });
                console.log('[App] ✅ Rust backend plan updated to', newPlanType);
              } catch (e) {
                console.error('[App] Failed to update Rust plan:', e);
              }
            }
          }
        )
        .subscribe();
    });

    return () => {
      if (channel) {
        getSupabase().then((sb: any) => sb.removeChannel(channel));
      }
    };
  }, [user?.organization_id]); // Re-subscribe when org changes (e.g. after login)

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let timer: ReturnType<typeof setInterval> | undefined;
    const visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        getSupabase().then(async (sb: any) => {
          const { data: { session } } = await sb.auth.getSession();
          if (session?.access_token) {
            trackerAPI.setAuthToken(session.access_token);
            return;
          }
          const refreshed = await sb.auth.refreshSession();
          const refreshedToken = refreshed?.data?.session?.access_token;
          if (refreshedToken) {
            trackerAPI.setAuthToken(refreshedToken);
          }
        });
      }
    };

    getSupabase().then(async (sb: any) => {
      const pushLatestToken = async () => {
        const { data: { session } } = await sb.auth.getSession();
        if (session?.access_token) {
          trackerAPI.setAuthToken(session.access_token);
          return;
        }
        const refreshed = await sb.auth.refreshSession();
        const refreshedToken = refreshed?.data?.session?.access_token;
        if (refreshedToken) {
          trackerAPI.setAuthToken(refreshedToken);
        }
      };

      await pushLatestToken();

      const { data: { subscription } } = sb.auth.onAuthStateChange((_event: string, nextSession: any) => {
        const token = nextSession?.access_token;
        if (token) {
          trackerAPI.setAuthToken(token);
        }
      });

      // Keep Rust token fresh even if auth-state events are missed in long-running desktop sessions.
      timer = setInterval(() => {
        if (document.visibilityState === 'visible') {
          pushLatestToken();
        }
      }, 5 * 60_000); // Every 5 minutes instead of 1, only when visible
      document.addEventListener('visibilitychange', visibilityHandler);

      cleanup = () => subscription?.unsubscribe();
    });

    return () => {
      if (timer) clearInterval(timer);
      document.removeEventListener('visibilitychange', visibilityHandler);
      cleanup?.();
    };
  }, []);

  const discardIdleTime = async (minutes: number, shouldResume: boolean = true) => {
    if (!user || !sessionId) return;
    const sb = await getSupabase();

    // 1. Delete samples from the last X minutes
    const startTime = new Date(Date.now() - (minutes * 60000)).toISOString();
    await sb.from('activity_samples')
      .delete()
      .eq('session_id', sessionId)
      .gte('recorded_at', startTime);

    // 2. Adjust local timer and live idle counter
    const discardedSecs = minutes * 60;
    setElapsed(prev => Math.max(0, prev - discardedSecs));
    setLiveIdleSeconds(prev => Math.max(0, prev - discardedSecs));

    if (shouldResume) {
      setIdlePaused(false);
      handleResume();
    } else {
      setIdlePaused(false);
    }
  };

  // Mark the last N minutes of samples as idle=true in DB (when idle threshold is reached)
  const markSamplesAsIdle = async (minutes: number) => {
    if (!sessionId) return;
    const sb = await getSupabase();
    const startTime = new Date(Date.now() - (minutes * 60000)).toISOString();
    await sb.from('activity_samples')
      .update({ idle: true, activity_percent: 0 })
      .eq('session_id', sessionId)
      .gte('recorded_at', startTime);
  };

  const reassignIdleTime = async (minutes: number, newProjectId: string) => {
    if (!user || !sessionId) return;
    const sb = await getSupabase();

    const startTime = new Date(Date.now() - (minutes * 60000)).toISOString();

    // Find or create a session for the target project using the atomic RPC
    const { data: rpcData, error: rpcError } = await sb.rpc('rpc_start_session', {
      p_user_id: user.id,
      p_project_id: newProjectId,
      p_organization_id: user.organization_id,
      p_ip_address: null // We don't necessarily have the IP here, or we could fetch it
    });

    if (rpcError) {
      console.error('Failed to reassign session via RPC:', rpcError);
      return;
    }

    const targetSessionId = rpcData.id;

    if (targetSessionId) {
      await sb.from('activity_samples')
        .update({ session_id: targetSessionId })
        .eq('session_id', sessionId)
        .gte('recorded_at', startTime);
    }

    // 2. Adjust local state
    setIdlePaused(false);
    handleResume();
    fetchDashboardStats(user.id, projects);
  };

  // Attach to window for the child components to call easily
  (window as any).discardIdleTime = discardIdleTime;
  (window as any).reassignIdleTime = reassignIdleTime;

  useEffect(() => {
    if (!isTracking || (user && user.idle_enabled === false)) return;

    let unlisten: (() => void) | null = null;

    const setupListener = async () => {
      unlisten = await trackerAPI.onTrackingSample((sample: any) => {
        // Count as idle if Rust idle flag is true OR if activity_percent is 0
        // (tiny cursor nudges can keep idle=false but still show 0% activity)
        const isIdleSample = sample.idle === true || (sample.activity_percent ?? 100) === 0;
        if (isIdleSample) {
          idleMinutesRef.current += 1;
          const limit = user?.idle_limit || 10;

          // Only show as "Idle" in the UI if we've crossed the threshold
          if (idleMinutesRef.current >= limit) {
            if (idleMinutesRef.current === limit) {
              // Just hit the threshold: add the accumulated backlog (e.g. 10 mins)
              setLiveIdleSeconds(prev => prev + (limit * 60));
            } else {
              // Already past threshold: add this new idle minute
              setLiveIdleSeconds(prev => prev + 60);
            }

            if (!isPaused) {
              const mode = user?.keep_idle_mode || 'prompt';

              // Retroactively mark those samples idle=true in DB so dashboard is accurate
              markSamplesAsIdle(limit);

              if (mode === 'always') {
                // In always mode, we keep marking but don't pause/prompt.
                // We reset the ref periodically or handle it differently?
                // For now, reset to allow next threshold detection if they become active and idle again.
                idleMinutesRef.current = 0;
                return;
              }

              if (mode === 'never') {
                handlePause();
                discardIdleTime(limit, false);
                idleMinutesRef.current = 0;
                (trackerAPI as any).startIdleMonitoring(limit);
                return;
              }

              // Default: 'prompt'
              setIdlePaused(true);
              handlePause();
              idleMinutesRef.current = 0;
              (trackerAPI as any).startIdleMonitoring(limit);
            }
          }
        } else {
          idleMinutesRef.current = 0;
        }
      });
    };

    setupListener();

    console.log('Tracking listener active:', { isPaused, idlePaused });

    return () => {
      if (unlisten) unlisten();
    };
  }, [isTracking, isPaused, user?.idle_limit, user?.keep_idle_mode]); // Re-subscribe when tracking state or limits/modes change

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    // Auto-refresh on projects screen — but only when visible and every 5m instead of 1m
    if (user && screen === 'projects') {
      interval = setInterval(() => {
        if (document.visibilityState === 'visible') {
          fetchDashboardStats(user.id, projects);
        }
      }, 5 * 60_000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [user?.id, screen, projects]);

  // Standalone effect to sync location once per session
  useEffect(() => {
    if (!user?.id) return;
    const syncLocation = async () => {
      try {
        const sb = await getSupabase();
        const r = await fetch('https://ipapi.co/json/');
        const d = await r.json();
        if (d.city && d.country_name) {
          const locString = `${d.city}, ${d.country_name}`;
          await sb.from('members').update({ location: locString }).eq('id', user.id);
          console.log('[App] Location synced:', locString);
        }
      } catch (e) {
        console.error('[App] Location sync failed:', e);
      }
    };
    syncLocation();
  }, [user?.id]);

  async function fetchAndSubscribeTodos(userId: string) {
    const sb = await getSupabase();
    const { data } = await sb
      .from('todos')
      .select('id, title, description, status, due_date, project_id, assignee_id, projects(name, color)')
      .eq('assignee_id', userId)
      .neq('status', 'Done')
      .order('created_at', { ascending: false });

    if (data) {
      setTodos(data.map((t: any) => ({
        ...t,
        projectName: t.projects?.name,
        projectColor: t.projects?.color,
      })));
    }
    if (realtimeRef.current) sb.removeChannel(realtimeRef.current);
    realtimeRef.current = sb
      .channel('my-todos-' + userId)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'todos', filter: `assignee_id=eq.${userId}` },
        async (payload: any) => {
          const t = payload.new;
          const { data: proj } = await sb.from('projects').select('name, color').eq('id', t.project_id).single();
          const enriched: Todo = { ...t, projectName: proj?.name, projectColor: proj?.color };
          setTodos(prev => [enriched, ...prev]);
          trackerAPI.showNotification('📋 New Task Assigned', t.title + (proj?.name ? ` — ${proj.name}` : ''));
        }
      )
      .subscribe();
  }

  // Real-time Member Profile Subscription (Enforce tracking_enabled)
  useEffect(() => {
    if (!user?.id) return;

    let sub: any = null;
    getSupabase().then((sb: any) => {
      sub = sb
        .channel(`member-${user.id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'members', filter: `id=eq.${user.id}` },
          (payload: any) => {
            const updated = payload.new;
            console.log('Member profile updated (real-time):', updated);

            // Update local state
            setUser(prev => prev ? { ...prev, ...updated } : null);

            // Enforce tracking_enabled
            if (updated.tracking_enabled === false && isTracking) {
              handleStop();
              trackerAPI.showNotification('Tracking Disabled', 'Your tracking permission has been removed by an administrator.');
              setTrackingError('Your tracking permission has been removed by an administrator.');
            } else if (updated.tracking_enabled === true) {
              setTrackingError(null);
            }
          }
        )
        .subscribe();
      memberSubscriptionRef.current = sub;
    });

    return () => {
      if (sub) {
        getSupabase().then((sb: any) => sb.removeChannel(sub));
      }
    };
  }, [user?.id, isTracking]); // Re-subscribe if user ID changes; check isTracking for enforcement

  useEffect(() => {
    if (isTracking && !isPaused) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isTracking, isPaused]);

  useEffect(() => {
    if (isTracking && !isPaused && user && activeProject) {
      // Calculate total today: (Sum of productive time for ALL OTHER projects today) + current elapsed
      const otherProjectsToday = projects
        .filter(p => p.id !== activeProject.id)
        .reduce((s, p) => s + Math.max(0, (p.stats?.todaySeconds || 0) - (p.stats?.keptIdleSeconds || 0)), 0);
      const currentToday = otherProjectsToday + elapsed;

      // Calculate total week: (Sum of productive time for ALL OTHER projects this week) + current elapsed
      const otherProjectsWeek = projects
        .filter(p => p.id !== activeProject.id)
        .reduce((s, p) => s + Math.max(0, (p.stats?.weeklySeconds || 0) - (p.stats?.weeklyIdleSeconds || 0)), 0);
      const currentWeek = otherProjectsWeek + elapsed;

      const weeklyLimitSecs = (user.weekly_limit || 40) * 3600;
      const dailyLimitSecs = (user.daily_limit || 8) * 3600;

      if (currentToday >= dailyLimitSecs || currentWeek >= weeklyLimitSecs) {
        trackerAPI.showNotification('Tracking Limit Reached', 'Your session has been automatically stopped because you reached your daily or weekly time limit.');
        handleStop();
        setTrackingError('Session stopped due to reaching tracking limit.');
      }
    }
  }, [elapsed, isTracking, isPaused, user, projects, activeProject]);



  async function handleLogin(email: string, password: string): Promise<string | null> {
    try {
      const sb = await getSupabase();
      const { data: authData, error: authError } = await sb.auth.signInWithPassword({ email, password });
      if (authError || !authData.user) {
        console.error('[Login] Auth failed:', authError?.message);
        return authError?.message || 'Login failed';
      }

      console.log('[Login] Session established:', {
        id: authData.user.id,
        email: authData.user.email,
        aud: authData.user.aud
      });

      console.log('[Login] Fetching member profile for user:', authData.user.id);
      let { data: member, error: memberError } = await sb
        .from('members').select('*, organizations(plan_type)').eq('auth_user_id', authData.user.id).single();

      // Fallback: lookup by email if auth_user_id is not yet linked
      if ((memberError || !member) && authData.user.email) {
        console.log('[Login] Profile not found by ID, attempting email fallback:', authData.user.email);
        const { data: byEmail } = await sb.from('members').select('*, organizations(plan_type)').eq('email', authData.user.email).single();
        if (byEmail && !byEmail.auth_user_id) {
          console.log('[Login] Found unlinked profile by email, linking now...');
          const { error: updateError } = await sb.from('members').update({ auth_user_id: authData.user.id }).eq('id', byEmail.id);
          if (!updateError) {
            member = { ...byEmail, auth_user_id: authData.user.id };
            memberError = null;
          }
        }
      }

      if (memberError || !member) {
        console.error('[Login] Profile verification failed:', memberError?.message || 'No member record');
        return `TrackOwl Error: Member profile not found for ${authData.user.email}. Please contact your administrator. (UID: ${authData.user.id.substring(0, 8)})`;
      }

      const tz = await syncTimezone(sb, member.id, member.timezone);
      const userObj: User = {
        id: member.id,
        email: member.email,
        full_name: member.full_name,
        role: member.role,
        weekly_limit: member.weekly_limit,
        daily_limit: member.daily_limit,
        idle_limit: member.idle_limit,
        idle_enabled: member.idle_enabled,
        keep_idle_mode: member.keep_idle_mode,
        tracking_enabled: member.tracking_enabled,
        avatar_url: member.avatar_url,
        organization_id: member.organization_id,
        timezone: tz || undefined,
        keep_idle: member.keep_idle,
        phone: member.phone,
        custom_fields: member.custom_fields || {},
        plan_type: member.organizations?.plan_type || 'Basic'
      };
      const { data: projectsData } = await sb.from('projects').select('*');
      const token = authData.session.access_token;
      trackerAPI.setAuthToken(token);

      if (rememberMe) saveSession(token, userObj);
      setUser(userObj);
      const projectList = projectsData || [];
      setProjects(projectList);
      setScreen('projects');
      fetchAndSubscribeTodos(userObj.id);
      fetchDashboardStats(userObj.id, projectList);
      return null;
    } catch (err: any) {
      return err.message || 'Login encountered an unexpected error.';
    }
  }

  function handleSelectProject(project: Project) {
    setActiveProject(project);
    if (hasConsented()) {
      startTracking(project);
    } else {
      setScreen('consent');
    }
  }

  function handleConsentAccepted() {
    saveConsent();
    if (activeProject) startTracking(activeProject);
  }

  function handleConsentDeclined() {
    setActiveProject(null);
    setScreen('projects');
  }

  async function startTracking(project: Project) {
    // Initialize timer to productive seconds already tracked today
    const todaySecs = project.stats?.todaySeconds || 0;
    const idleSecs = project.stats?.keptIdleSeconds || 0;
    const productiveStart = Math.max(0, todaySecs - idleSecs);
    setElapsed(productiveStart);
    setLiveIdleSeconds(0); // reset live idle counter for new session
    idleMinutesRef.current = 0; // reset inactivity counter for new session
    setIsPaused(false);
    setTrackingError(null);
    setIsTracking(true);
    setScreen('tracker');

    try {
      if (!isOnline) {
        setTrackingError('You are currently offline. Please check your internet connection to start tracking.');
        setIsTracking(false);
        setActiveProject(null);
        setScreen('projects');
        return;
      }
      const sb = await getSupabase();

      if (user?.tracking_enabled === false) {
        console.log('TRACKING BLOCKED: tracking_enabled is false', user);
        setTrackingError('Tracking has been disabled for your account by an administrator.');
        setIsTracking(false);
        setActiveProject(null);
        setScreen('projects');
        return;
      }

      // Enforcement: Daily & Weekly Limits
      const totalToday = projects.reduce((s, p) => s + Math.max(0, (p.stats?.todaySeconds || 0) - (p.stats?.keptIdleSeconds || 0)), 0);
      const totalWeek = projects.reduce((s, p) => s + Math.max(0, (p.stats?.weeklySeconds || 0) - (p.stats?.weeklyIdleSeconds || 0)), 0);
      const dailyLimitSecs = (user?.daily_limit || 8) * 3600;
      const weeklyLimitSecs = (user?.weekly_limit || 40) * 3600;

      if (totalToday >= dailyLimitSecs) {
        setTrackingError(`Daily limit (${user?.daily_limit || 8}h) reached. Please contact your manager.`);
        setIsTracking(false);
        setActiveProject(null);
        setScreen('projects');
        return;
      }
      if (totalWeek >= weeklyLimitSecs) {
        setTrackingError(`Weekly limit (${user?.weekly_limit || 40}h) reached. Please contact your manager.`);
        setIsTracking(false);
        setActiveProject(null);
        setScreen('projects');
        return;
      }

      console.log('TRACKING ALLOWED: tracking_enabled is', user?.tracking_enabled);

      const { data: { session } } = await sb.auth.getSession();
      const token = session?.access_token;

      const res: any = await trackerAPI.startTracking(project.id, user?.id ?? '', token);
      if (res?.status === 'error') {
        const rawErr = res.error || '';
        if (rawErr.includes('transport error') || rawErr.includes('Dns Failed')) {
          setTrackingError('Network error: Unable to reach the server. Please check your internet connection.');
          setIsOnline(false);
        } else {
          setTrackingError(rawErr || 'Failed to start tracking. Is the backend running?');
        }
        setIsTracking(false);
        setActiveProject(null);
        setScreen('projects');
        return;
      }
      setIsTracking(true);
      setSessionId(res?.session_id ?? null);
      // setScreen('tracker'); // already set at start for responsiveness

      // Notification Alert
      if (settingsRef.current?.tracking_alerts !== false) {
        trackerAPI.showNotification('Tracking Started', `Now tracking for ${project.name}`);
      }
    } catch (err: any) {
      const errMsg = err.toString();
      if (errMsg.includes('transport error') || errMsg.includes('Dns Failed')) {
        setTrackingError('Network error: Unable to reach the server. Please check your internet connection.');
        setIsOnline(false);
      } else {
        setTrackingError(errMsg);
      }
      setIsTracking(false);
      setActiveProject(null);
      setScreen('projects');
    }
  }

  async function handleStop() {
    console.log('[App] handleStop called. SessionId:', sessionId);
    try {
      const res: any = await trackerAPI.stopTracking();
      console.log('[App] stopTracking response:', res);
    } catch (err) {
      console.error('[App] stopTracking FAILED:', err);
    }

    setIsTracking(false);
    setIsPaused(false);
    setSessionId(null);
    setActiveProject(null);
    setElapsed(0);
    setScreen('projects');

    // Notification Alert
    if (settingsRef.current?.tracking_alerts !== false) {
      trackerAPI.showNotification('Tracking Stopped', 'Your session has ended.');
    }

    // Refresh from DB immediately after stop — this gives accurate numbers
    if (user) fetchDashboardStats(user.id, projects);
  }

  async function handlePause() {
    setIsPaused(true);
    await trackerAPI.pauseTracking();
  }

  async function handleResume() {
    setIsPaused(false);
    await trackerAPI.resumeTracking();
  }

  async function handleLogout() {
    await handleStop();
    clearSession();
    setUser(null);
    setProjects([]);
    setTodos([]);
    if (realtimeRef.current) {
      const ch = realtimeRef.current;
      realtimeRef.current = null;
      getSupabase().then((sb: any) => sb.removeChannel(ch));
    }
    setScreen('login');
  }

  const handleTodoDone = useCallback(async (todoId: string) => {
    setTodos(prev => prev.filter(t => t.id !== todoId));
    const sb = await getSupabase();
    await sb.from('todos').update({ status: 'Done' }).eq('id', todoId);
  }, []);

  async function handleUpdateProfile(updated: Partial<User>) {
    if (!user) return;
    try {
      const sb = await getSupabase();
      const { error } = await sb.from('members').update(updated).eq('id', user.id);
      if (error) throw error;

      const newUser = { ...user, ...updated };
      setUser(newUser);
      localStorage.setItem(USER_KEY, JSON.stringify(newUser));
      setScreen('projects');
    } catch (err: any) {
      alert('Error updating profile: ' + err.message);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Effects: Notifications
  // ─────────────────────────────────────────────────────────────────────────────

  // 1. Screenshot captured listener
  useEffect(() => {
    let unlisten: any = null;
    let isMounted = true;

    const setup = async () => {
      const u = await (trackerAPI as any).onScreenshotCaptured(() => {
        if (settingsRef.current?.screenshot_alerts !== false) {
          trackerAPI.showNotification('📸 Screenshot Captured', 'Your screen activity has been recorded.');
        }
      });
      if (!isMounted && u) {
        u(); // Clean up if unmounted before setup finished
      } else {
        unlisten = u;
      }
    };
    setup();
    // Listen for update progress
    const unlistenProgress = trackerAPI.onUpdateProgress((p: number) => setUpdateProgress(p));

    return () => {
      isMounted = false;
      if (unlisten) unlisten();
      unlistenProgress.then((fn: any) => fn && fn());
    };
  }, []); // Only run once on mount

  // 2. Tracking Reminder
  useEffect(() => {
    // Check ref immediately for interval creation
    if (!user || isTracking || settingsRef.current?.tracking_reminders === false) return;

    const intervalMin = settingsRef.current?.reminder_interval || 30;
    const intervalMs = intervalMin * 60_000;

    const interval = setInterval(() => {
      // Re-verify ref inside interval
      if (!isTracking && settingsRef.current?.tracking_reminders !== false) {
        trackerAPI.showNotification('⏰ Time to Track?', "You haven't started tracking time yet. Don't forget to clock in!");
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [isTracking, user?.id, user?.custom_fields?.notification_settings?.tracking_reminders, user?.custom_fields?.notification_settings?.reminder_interval]);

  const pageVariants = {
    initial: { opacity: 0, y: 8 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -8 }
  };
  const pageTransition: any = { type: 'tween', ease: 'easeInOut', duration: 0.2 };

  return (
    <div className="app-container">
      {/* Auto-update banner */}
      {updateVersion && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
          background: 'var(--primary-brand)', color: '#fff', fontSize: '11px',
          padding: '5px 12px', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span>⬆ v{updateVersion} available</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              disabled={updateInstalling}
              onClick={async () => {
                setUpdateInstalling(true);
                try {
                  await trackerAPI.installUpdate();
                } catch (e) {
                  console.error('Update failed:', e);
                  setUpdateInstalling(false);
                  alert('Update failed to install. Please try again later.');
                }
              }}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '11px', padding: '2px 7px', cursor: 'pointer' }}
            >
              {updateInstalling ? `⏳ ${updateProgress}%` : 'Install & Restart'}
            </button>
            <button
              onClick={() => setUpdateVersion(null)}
              style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: '14px', cursor: 'pointer', padding: '0 2px' }}
            >×</button>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {screen === 'login' && (
          <motion.div key="login" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} style={{ display: 'flex', flex: 1, minHeight: 0 }}>
            <LoginScreen onLogin={handleLogin} rememberMe={rememberMe} setRememberMe={setRememberMe} />
          </motion.div>
        )}
        {screen === 'projects' && (
          <motion.div key="projects" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0 }}>
            <ProjectsScreen user={user!} projects={projects} onSelect={handleSelectProject} onLogout={handleLogout} onSettings={() => setScreen('settings')} onSupport={() => setScreen('support')} trackingError={trackingError} setTrackingError={setTrackingError} todos={todos} onTodoDone={handleTodoDone} />
          </motion.div>
        )}
        {screen === 'consent' && (
          <motion.div key="consent" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} style={{ display: 'flex', flex: 1, flexDirection: 'column' }}>
            <ConsentScreen user={user!} project={activeProject!} onAccept={handleConsentAccepted} onDecline={handleConsentDeclined} />
          </motion.div>
        )}
        {screen === 'tracker' && (
          <motion.div key="tracker" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0 }}>
            <TrackerScreen
              user={user!}
              project={activeProject!}
              sessionId={sessionId}
              idlePaused={idlePaused}
              onResumeFromIdle={() => { setIdlePaused(false); (trackerAPI as any).stopIdleMonitoring(); handleResume(); }}
              elapsed={elapsed}
              liveIdleSeconds={liveIdleSeconds}
              onStop={handleStop}
              onSettings={() => setScreen('settings')}
              onSupport={() => setScreen('support')}
              todos={todos}
              onTodoDone={handleTodoDone}
              projects={projects}
            />
          </motion.div>
        )}
        {screen === 'settings' && user && (
          <motion.div key="settings" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0 }}>
            <SettingsScreen user={user} onSave={handleUpdateProfile} onBack={() => setScreen('projects')} onLogout={handleLogout} />
          </motion.div>
        )}
        {screen === 'support' && user && (
          <motion.div key="support" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0 }}>
            <SupportScreen user={user} onBack={() => setScreen('projects')} />
          </motion.div>
        )}
      </AnimatePresence>
      <AppFooter
        lastSyncTime={lastSyncTime}
        isSyncing={isSyncing}
        onSync={handleManualSync}
        isOnline={isOnline}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen: Login
// ─────────────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin, rememberMe, setRememberMe }: {
  onLogin: (email: string, password: string) => Promise<string | null>;
  rememberMe: boolean;
  setRememberMe: (v: boolean) => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSent, setForgotSent] = useState(false);

  async function submitForgot(e: React.FormEvent) {
    e.preventDefault();
    setForgotError(null);
    setForgotLoading(true);
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const sb = createClient(
        import.meta.env.VITE_SUPABASE_URL as string,
        import.meta.env.VITE_SUPABASE_ANON_KEY as string
      );
      const adminPortalUrl = import.meta.env.VITE_ADMIN_PORTAL_URL || 'http://localhost:5174';
      const { error } = await sb.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: `${adminPortalUrl}/update-password`,
      });
      if (error) throw new Error(error.message);
      setForgotSent(true);
    } catch (err: any) {
      setForgotError(err.message);
    } finally {
      setForgotLoading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const err = await onLogin(email.trim(), password);
    if (err) setError(err);
    setLoading(false);
  }

  return (
    <div className="login-screen">
      <motion.div
        className="login-card"
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.05, duration: 0.3 }}
      >
        <div className="brand-header">
          <div className="brand-logo">
            <img src="/logo.png" style={{ width: 64, height: 64, objectFit: 'contain' }} alt="TrackOwl" />
          </div>
          <div className="brand-header-text">
            <h1 className="heading-1">{forgotMode ? 'Reset Password' : 'Welcome back'}</h1>
            <p className="text-muted">{forgotMode ? 'Enter your email for a reset link' : 'Sign in to TrackOwl'}</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {forgotMode ? (
            <motion.div key="forgot" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
              {forgotSent ? (
                <div style={{ textAlign: 'center', padding: '1.25rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ fontSize: '2rem' }}>📧</div>
                  <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9375rem' }}>Check your email</p>
                  <p className="text-muted" style={{ maxWidth: 280 }}>
                    A reset link was sent to <strong>{forgotEmail}</strong>. Open it to set a new password.
                  </p>
                  <button className="btn btn-secondary" style={{ width: '100%', marginTop: '0.25rem' }}
                    onClick={() => { setForgotMode(false); setForgotSent(false); setForgotEmail(''); }}>
                    Back to Sign In
                  </button>
                </div>
              ) : (
                <form onSubmit={submitForgot} className="login-form">
                  <div className="field-group">
                    <label className="field-label">Your Email</label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                      <input type="email" required autoFocus value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                        placeholder="you@company.com" className="field-input" style={{ paddingLeft: '2.25rem' }} />
                    </div>
                  </div>
                  {forgotError && <div className="alert alert-error"><ShieldAlert size={14} /><span>{forgotError}</span></div>}
                  <button type="submit" disabled={forgotLoading || !forgotEmail.trim()} className="btn btn-primary" style={{ width: '100%' }}>
                    {forgotLoading ? 'Sending…' : 'Send Reset Link'}
                    {!forgotLoading && <ArrowRight size={16} />}
                  </button>
                  <button type="button" className="btn btn-ghost" style={{ width: '100%', fontSize: '0.8125rem' }}
                    onClick={() => { setForgotMode(false); setForgotError(null); }}>
                    ← Back to Sign In
                  </button>
                </form>
              )}
            </motion.div>
          ) : (
            <motion.form key="login" onSubmit={submit} className="login-form"
              initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.2 }}>
              <div className="field-group">
                <label className="field-label">Email</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                  <input type="email" required autoFocus value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@company.com" className="field-input" style={{ paddingLeft: '2.25rem' }} />
                </div>
              </div>

              <div className="field-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="field-label">Password</label>
                  <button type="button" onClick={() => { setForgotMode(true); setForgotEmail(email); setForgotError(null); }}
                    style={{ fontSize: '0.75rem', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    Forgot password?
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="field-input"
                    style={{ paddingLeft: '2.25rem', paddingRight: '2.25rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    tabIndex={-1}
                    style={{
                      position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center',
                      padding: '2px'
                    }}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {error && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="alert alert-error" style={{ overflow: 'hidden' }}>
                  <ShieldAlert size={14} /><span>{error}</span>
                </motion.div>
              )}

              <label className="checkbox-wrap">
                <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} />
                <span>Keep me signed in</span>
              </label>

              <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%' }}>
                {loading ? 'Signing in…' : 'Sign In'}
                {!loading && <ArrowRight size={16} />}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Topbar
// ─────────────────────────────────────────────────────────────────────────────
function Topbar({ user, onLogout, onSettings, onSupport, todoBadge, disabled }: { user?: User; onLogout?: () => void; onSettings?: () => void; onSupport?: () => void; todoBadge?: number; disabled?: boolean }) {
  const initials = user?.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'U';
  return (
    <header className="app-topbar">
      <div className="topbar-brand">
        <div className="topbar-logo">
          <img src="/header.svg" style={{ height: 24, width: 'auto', objectFit: 'contain' }} alt="TrackOwl" />
        </div>
      </div>
      {user && <LocalClock />}
      {user && onLogout && (
        <div className={`topbar-actions ${disabled ? 'disabled-actions' : ''}`}>
          {todoBadge != null && todoBadge > 0 && (
            <div style={{ position: 'relative', display: 'inline-flex' }} title={`${todoBadge} open task${todoBadge > 1 ? 's' : ''}`}>
              <ClipboardList size={18} style={{ color: 'var(--text-tertiary)' }} />
              <span style={{
                position: 'absolute', top: '-5px', right: '-7px',
                background: '#ef4444', color: '#fff', borderRadius: '999px',
                fontSize: '9px', fontWeight: 700, minWidth: '13px', height: '13px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 2px', lineHeight: 1,
              }}>{todoBadge > 9 ? '9+' : todoBadge}</span>
            </div>
          )}
          <div className="user-avatar" onClick={disabled ? undefined : onSettings} style={{ cursor: (onSettings && !disabled) ? 'pointer' : 'default', overflow: 'hidden' }}>
            <div className="user-avatar-wrap">
              {user.avatar_url ? (
                <SignedImage path={user.avatar_url} bucket="avatars" className="user-avatar-img" />
              ) : initials}
            </div>
          </div>
          <button onClick={disabled ? undefined : onSupport} className="btn btn-ghost" title="Support" style={{ padding: '0.3rem' }} disabled={disabled}>
            <HelpCircle size={16} />
          </button>
          <button onClick={disabled ? undefined : onLogout} className="btn btn-ghost" title={disabled ? "Stop timer to sign out" : "Sign out"} style={{ padding: '0.3rem' }} disabled={disabled}>
            <LogOut size={16} />
          </button>
        </div>
      )}
    </header>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// My Tasks Panel
// ─────────────────────────────────────────────────────────────────────────────
function MyTasksPanel({ todos, onDone, disabled }: { todos: Todo[]; onDone: (id: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(true);
  if (todos.length === 0) return null;
  return (
    <div className={`tasks-panel ${disabled ? 'disabled-actions' : ''}`}>
      <button onClick={() => setOpen(o => !o)} className={`tasks-panel-header ${open ? 'open' : ''}`}>
        <span className="tasks-panel-title">
          <ClipboardList size={12} />
          My Tasks
          <span className="tasks-badge">{todos.length > 9 ? '9+' : todos.length}</span>
        </span>
        {open ? <ChevronDown size={13} style={{ color: 'var(--text-tertiary)' }} /> : <ChevronUp size={13} style={{ color: 'var(--text-tertiary)' }} />}
      </button>

      {open && (
        <div className="tasks-list">
          {todos.map(todo => (
            <div key={todo.id} className="task-item">
              <button className="task-check-btn" onClick={() => onDone(todo.id)} title="Mark as done">
                <Circle size={14} />
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.25rem' }}>
                  <span className="task-title">{todo.title}</span>
                  {todo.projectName && (
                    <span className="task-project-tag" style={{
                      background: 'var(--accent-light)',
                      color: 'var(--accent)',
                    }}>{todo.projectName}</span>
                  )}
                </div>
                {todo.due_date && (
                  <div className="task-meta">
                    <Calendar size={10} />
                    {new Date(todo.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen: Projects
// ─────────────────────────────────────────────────────────────────────────────
function ProjectsScreen({ user, projects, onSelect, onLogout, onSettings, onSupport, trackingError, setTrackingError, todos, onTodoDone }: {
  user: User;
  projects: Project[];
  onSelect: (p: Project) => void;
  onLogout: () => void;
  onSettings: () => void;
  onSupport: () => void;
  trackingError?: string | null;
  setTrackingError: (err: string | null) => void;
  todos: Todo[];
  onTodoDone: (id: string) => void;
}) {
  // Productive = total tracked - idle
  const totalToday = projects.reduce((s, p) => s + Math.max(0, (p.stats?.todaySeconds || 0) - (p.stats?.keptIdleSeconds || 0)), 0);
  const totalWeek = projects.reduce((s, p) => s + Math.max(0, (p.stats?.weeklySeconds || 0) - (p.stats?.weeklyIdleSeconds || 0)), 0);
  const tracked = projects.filter(p => (p.stats?.weeklySeconds || 0) > 0);
  const avgActivity = tracked.length > 0
    ? Math.round(tracked.reduce((s, p) => s + (p.stats?.activityPercent || 0), 0) / tracked.length)
    : 0;

  const weeklyLimitSecs = (user.weekly_limit || 40) * 3600;
  const dailyLimitSecs = (user.daily_limit || 8) * 3600;

  const isWeeklyLimitReached = totalWeek >= weeklyLimitSecs;
  const isDailyLimitReached = totalToday >= dailyLimitSecs;

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="projects-layout">
      <Topbar user={user} onLogout={onLogout} onSettings={onSettings} onSupport={onSupport} todoBadge={todos.length} />

      <div className="projects-scroll">
        {/* Stats bar */}
        <div className="stats-bar">
          <div className="stats-bar-item">
            <div className="stats-bar-value accent">{formatTime(totalToday)}</div>
            <div className="stats-bar-label">Today</div>
          </div>
          <div className="stats-bar-item">
            <div className="stats-bar-value">{formatTime(totalWeek)}</div>
            <div className="stats-bar-label">This Week</div>
          </div>
          <div className="stats-bar-item">
            <div className="stats-bar-value">{avgActivity}%</div>
            <div className="stats-bar-label">Avg Activity</div>
          </div>
        </div>

        {trackingError && (
          <div className="alert alert-error" style={{ marginBottom: '0.75rem' }}>
            <ShieldAlert size={14} /><span>{trackingError}</span>
          </div>
        )}

        {user.tracking_enabled === false && (
          <div className="alert alert-error" style={{ marginBottom: '1.5rem', background: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
            <Lock size={14} style={{ color: 'var(--danger)' }} />
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Tracking is currently disabled for your account.</span>
          </div>
        )}

        <div className="section-header">
          <span className="section-title">Projects</span>
          <span className="section-count">{projects.length} available</span>
        </div>

        {projects.length === 0 ? (
          <div className="projects-empty">
            <div className="projects-empty-icon"><CheckCircle2 size={24} /></div>
            <h3 className="heading-3">All caught up!</h3>
            <p className="text-muted" style={{ maxWidth: 260 }}>No active projects assigned. Contact your manager if this seems wrong.</p>
          </div>
        ) : (
          <motion.div className="project-list" variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }} initial="hidden" animate="show">
            {projects.map(p => (
              <motion.div key={p.id} variants={itemVariants}>
                <div className="project-card" onClick={() => {
                  if (user.tracking_enabled === false) return;
                  if (isWeeklyLimitReached) {
                    setTrackingError(`Weekly limit (${user.weekly_limit}h) reached. Please contact your manager.`);
                    return;
                  }
                  if (isDailyLimitReached) {
                    setTrackingError(`Daily limit (${user.daily_limit}h) reached. Please contact your manager.`);
                    return;
                  }
                  onSelect(p);
                }} style={{ '--project-color': p.color } as any}>
                  <div className="project-card-body">
                    <div className="project-card-title">{p.name}</div>
                    {p.description && <div className="project-card-desc">{p.description}</div>}
                    {p.stats && (
                      <div style={{ display: 'flex', gap: '0.875rem', marginTop: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                          <strong style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{formatTime(p.stats.weeklySeconds)}</strong> this week
                        </span>
                        <span style={{ fontSize: '0.75rem', color: p.stats.activityPercent < 50 ? 'var(--danger)' : 'var(--text-tertiary)' }}>
                          <strong style={{ fontWeight: 600 }}>{p.stats.activityPercent}%</strong> activity
                        </span>
                      </div>
                    )}
                  </div>
                  {p.stats && (
                    <div className="project-card-stats">
                      <div className="project-card-time">{formatTime(p.stats.todaySeconds)}</div>
                      <div className="project-card-time-label">Today</div>
                    </div>
                  )}
                  <div className="project-card-footer">
                    <ChevronRight size={16} className="project-arrow" />
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      <MyTasksPanel todos={todos} onDone={onTodoDone} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen: Consent
// ─────────────────────────────────────────────────────────────────────────────
function ConsentScreen({ user, project, onAccept, onDecline }: {
  user: User;
  project: Project;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <div className="projects-layout">
      <Topbar />
      <div className="consent-scroll">
        <motion.div className="consent-card"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}>

          <div className="consent-header">
            <div className="consent-icon">
              <ShieldAlert size={22} />
            </div>
            <h2 className="heading-2">Tracking Permissions</h2>
            <p className="text-muted" style={{ marginTop: '0.375rem' }}>
              About to track <strong style={{ color: 'var(--text-primary)' }}>{project.name}</strong>. Here's what's collected.
            </p>
          </div>

          <div className="consent-body">
            {(user.plan_type === 'Premium' || user.plan_type === 'Trial') && (
              <ConsentItem icon={<Eye size={16} />} title="Screenshots" desc="Up to 3 random captures every 10 min to verify work." />
            )}
            {(user.plan_type === 'Premium' || user.plan_type === 'Trial') && (
              <ConsentItem icon={<MonitorPlay size={16} />} title="Active Application" desc="Names of active windows (e.g. Chrome, VS Code)." />
            )}
            <ConsentItem icon={<MousePointerClick size={16} />} title="Activity Counts" desc="Mouse clicks and keystrokes count (not content)." />
            <ConsentItem icon={<MapPin size={16} />} title="General Location" desc="IP-based location for security auditing." />
            <div className="consent-note">
              Data is encrypted and only visible to your organization's admins. You can stop at any time.
            </div>
          </div>

          <div className="consent-actions">
            <button onClick={onAccept} className="btn btn-primary" style={{ width: '100%' }}>
              I Understand — Start Tracking
            </button>
            <button onClick={onDecline} className="btn btn-secondary" style={{ width: '100%' }}>
              Cancel
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function ConsentItem({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="consent-item">
      <div className="consent-item-icon">{icon}</div>
      <div>
        <div className="consent-item-title">{title}</div>
        <div className="consent-item-desc">{desc}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen: Tracker
// ─────────────────────────────────────────────────────────────────────────────
function TrackerScreen({ user, project, idlePaused = false, onResumeFromIdle, elapsed, liveIdleSeconds = 0, onStop, onSettings, onSupport, todos, onTodoDone, projects }: {
  user: User;
  project: Project;
  sessionId?: string | null;
  idlePaused?: boolean;
  onResumeFromIdle?: () => void;
  elapsed: number;
  liveIdleSeconds?: number;
  onStop: () => void;
  onSettings: () => void;
  onSupport: () => void;
  todos: Todo[];
  onTodoDone: (id: string) => void;
  projects: Project[];
}) {
  const [showReassign, setShowReassign] = useState(false);
  const hrs = Math.floor(elapsed / 3600);
  const mins = Math.floor((elapsed % 3600) / 60);
  const secs = elapsed % 60;
  const fmt = (n: number) => String(n).padStart(2, '0');

  const baseKeptIdle = project.stats?.keptIdleSeconds || 0;

  // NEW FORMULA: Productive = Total Elapsed - Idle
  // liveIdleSeconds accumulates idle in the current unsaved session
  // baseKeptIdle is idle from previously completed/synced samples
  const totalIdleSeconds = baseKeptIdle + liveIdleSeconds;
  const displayProductive = Math.max(0, elapsed - liveIdleSeconds);
  const displayIdle = totalIdleSeconds;

  return (
    <div className="tracker-layout">
      <Topbar user={user} onLogout={onStop} onSettings={onSettings} onSupport={onSupport} todoBadge={todos.length} disabled={true} />

      <div className="tracker-body">
        <motion.div className="tracker-widget" initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.35 }}>
          {idlePaused && (
            <div className="idle-overlay" style={{
              position: 'absolute', inset: 0, zIndex: 100,
              background: 'rgba(255, 255, 255, 0.98)', backdropFilter: 'blur(12px)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '1.25rem', textAlign: 'center', borderRadius: 'inherit'
            }}>
              {!showReassign ? (
                <>
                  <div style={{ background: 'var(--amber-light)', padding: '0.75rem', borderRadius: '1rem', color: 'var(--amber)', marginBottom: '0.75rem' }}>
                    <ShieldAlert size={28} />
                  </div>
                  <h3 className="heading-3" style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>You've been idle</h3>
                  <p className="text-muted" style={{ marginBottom: '1.25rem', fontSize: '0.75rem', lineHeight: 1.4 }}>
                    We detected {user.idle_limit || 10} minutes of inactivity. What should we do with this time?
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem', width: '100%', marginBottom: '0.625rem' }}>
                    <button className="btn btn-primary" onClick={onResumeFromIdle} style={{ fontSize: '0.6875rem', padding: '0.625rem 0.25rem' }}>
                      Keep Time
                    </button>
                    <button className="btn btn-secondary" onClick={() => (window as any).discardIdleTime?.((user.idle_limit || 10))} style={{ fontSize: '0.6875rem', padding: '0.625rem 0.25rem', color: 'var(--danger)' }}>
                      Discard
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem', width: '100%' }}>
                    <button className="btn btn-secondary" onClick={() => setShowReassign(true)} style={{ fontSize: '0.6875rem', padding: '0.625rem 0.25rem' }}>
                      Reassign
                    </button>
                    <button className="btn btn-secondary" onClick={onStop} style={{ fontSize: '0.6875rem', padding: '0.625rem 0.25rem' }}>
                      Stop Timer
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="heading-3" style={{ margin: '0 0 0.75rem 0' }}>Reassign Time</h3>
                  <div className="project-list" style={{ width: '100%', maxHeight: '160px', overflowY: 'auto', marginBottom: '1rem' }}>
                    {projects.map((p: Project) => (
                      <div key={p.id} className="project-card"
                        onClick={() => {
                          (window as any).reassignIdleTime?.((user.idle_limit || 10), p.id);
                          setShowReassign(false);
                        }}
                        style={{ padding: '0.5rem', marginBottom: '0.375rem', fontSize: '0.75rem' }}>
                        {p.name}
                      </div>
                    ))}
                  </div>
                  <button className="btn btn-secondary" onClick={() => setShowReassign(false)} style={{ width: '100%' }}>
                    Back
                  </button>
                </>
              )}
            </div>
          )}
          <div className="tw-header">
            <div className="status-pill status-live">
              <div className="status-dot" />
              Live
            </div>
            <div className="tracker-project-pill">
              <div className="tracker-project-dot" style={{ backgroundColor: project.color || 'var(--accent)' }} />
              <span className="tracker-project-name">{project.name}</span>
            </div>
          </div>

          <div className="timer-display">
            {fmt(hrs)}:{fmt(mins)}:{fmt(secs)}
          </div>

          <div className="stats-dashboard">
            <div className="stat-item">
              <span className="stat-label">Productive</span>
              <span className="stat-value">{fmt(Math.floor(displayProductive / 3600))}:{fmt(Math.floor((displayProductive % 3600) / 60))}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Idle</span>
              <span className="stat-value">{fmt(Math.floor(displayIdle / 3600))}:{fmt(Math.floor((displayIdle % 3600) / 60))}</span>
            </div>
          </div>

          <div className="tracker-controls">
            <button className="control-btn action-stop" onClick={onStop}>
              <Square size={14} fill="currentColor" />
              Stop Session
            </button>
          </div>

          <p className="timer-subtext">
            TrackOwl
          </p>
        </motion.div>
      </div>

      <MyTasksPanel todos={todos} onDone={onTodoDone} />
    </div>
  );
}
