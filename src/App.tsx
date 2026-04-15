import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock, Mail, ArrowRight, Play, Square, Pause,
  ChevronRight, LogOut, CheckCircle2,
  ShieldAlert, Eye, EyeOff, MapPin, MonitorPlay, MousePointerClick,
  ClipboardList, Calendar, Circle, ChevronDown, ChevronUp,
  User as UserIcon, Camera, Save,
  Clock, Activity
} from 'lucide-react';
import { trackerAPI } from './tauri-ipc';
import './App.css';

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string;

let _supabase: any = null;
async function getSupabase() {
  if (!_supabase) {
    const { createClient } = await import('@supabase/supabase-js');
    _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return _supabase;
}

type Screen = 'login' | 'projects' | 'consent' | 'tracker' | 'settings';

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
  organization_id?: string;
  timezone?: string;
  keep_idle?: boolean;
  custom_fields?: {
    notification_settings?: NotificationSettings;
  };
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

// ── App Footer (Version & Location) ──────────────────────────────────────────
function AppFooter() {
  const [version, setVersion] = useState<string>('...');
  const [loc, setLoc] = useState<string | null>(null);

  useEffect(() => {
    // 1. Get Version
    const tauri = (window as any).__TAURI__;
    if (tauri?.app) {
      tauri.app.getVersion().then(setVersion);
    } else {
      setVersion('1.1.7'); 
    }

    // 2. Get Location
    const fetchLoc = async () => {
      const locStr = await trackerAPI.getLocation();
      if (locStr) setLoc(locStr);
    };

    fetchLoc();
  }, []);

  return (
    <footer className="app-footer">
      <div className="footer-version">Version {version}</div>
      {loc && <div className="footer-location">{loc}</div>}
    </footer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen: Settings
// ─────────────────────────────────────────────────────────────────────────────
function SettingsScreen({ user, onSave, onBack }: {
  user: User;
  onSave: (updated: Partial<User>) => Promise<void>;
  onBack: () => void;
}) {
  const [fullName, setFullName] = useState(user.full_name);
  const [phone, setPhone] = useState(user.phone || '');
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url || '');
  const [notifyTracking, setNotifyTracking] = useState(user.custom_fields?.notification_settings?.tracking_alerts ?? true);
  const [notifyScreenshots, setNotifyScreenshots] = useState(user.custom_fields?.notification_settings?.screenshot_alerts ?? true);
  const [notifyReminders, setNotifyReminders] = useState(user.custom_fields?.notification_settings?.tracking_reminders ?? true);
  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        tracking_alerts: notifyTracking,
        screenshot_alerts: notifyScreenshots,
        tracking_reminders: notifyReminders
      }
    };
    await onSave({
      full_name: fullName,
      phone,
      avatar_url: avatarUrl,
      custom_fields: updatedCustomFields
    });
    setIsSaving(false);
  }

  return (
    <div className="settings-screen">
      <header className="settings-header">
        <button onClick={onBack} className="settings-back-btn">
          <img src="/back-button.png" alt="Back" className="settings-back-logo" />
        </button>
        <div>
          <h2 className="heading-2">Profile Settings</h2>
          <p className="text-muted" style={{ fontSize: '0.6875rem', marginTop: '0.125rem' }}>Manage your account details</p>
        </div>
      </header>

      <div className="settings-content">
        <div className="avatar-section">
          <div className="avatar-preview-container">
            {avatarUrl ? (
              <SignedImage path={avatarUrl} bucket="avatars" className="avatar-preview-large" />
            ) : (
              <div className="avatar-placeholder-large">
                <UserIcon size={32} />
              </div>
            )}
            <button className="btn-avatar-edit" onClick={() => fileInputRef.current?.click()}>
              {uploading ? '...' : <Camera size={16} strokeWidth={2.5} />}
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />
          </div>
          <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.75rem' }}>{fullName || 'Your Name'}</p>
          <p className="label" style={{ marginTop: '0.125rem' }}>{user.email}</p>
        </div>

        <div className="settings-form">
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
              <span className="field-icon" style={{ fontSize: '14px' }}>📞</span>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="field-input" placeholder="+1 (555) 000-0000" />
            </div>
          </div>

          <div className="field-group">
            <label className="field-label">Email Address</label>
            <div className="field-input-wrap disabled">
              <Mail size={14} className="field-icon" />
              <input type="email" value={user.email} disabled className="field-input" />
              <span style={{ position: 'absolute', right: '0.75rem', fontSize: '0.625rem', fontWeight: 600, color: 'var(--success)', background: 'var(--success-bg)', padding: '0.125rem 0.4rem', borderRadius: '999px', letterSpacing: '0.03em' }}>VERIFIED</span>
            </div>
          </div>

          <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem', borderTop: '1px solid var(--border-light)', paddingTop: '1.25rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem' }}>Desktop Notifications</h3>

            <div className="field-group" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
              <div style={{ flex: 1 }}>
                <label className="field-label" style={{ marginBottom: 0 }}>Tracking Alerts</label>
                <p className="text-muted" style={{ fontSize: '0.625rem' }}>Notify when tracking starts or stops</p>
              </div>
              <label className="switch">
                <input type="checkbox" checked={notifyTracking} onChange={e => setNotifyTracking(e.target.checked)} />
                <span className="slider round"></span>
              </label>
            </div>

            <div className="field-group" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginTop: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label className="field-label" style={{ marginBottom: 0 }}>Screenshot Alerts</label>
                <p className="text-muted" style={{ fontSize: '0.625rem' }}>Notify when a screenshot is captured</p>
              </div>
              <label className="switch">
                <input type="checkbox" checked={notifyScreenshots} onChange={e => setNotifyScreenshots(e.target.checked)} />
                <span className="slider round"></span>
              </label>
            </div>

            <div className="field-group" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginTop: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label className="field-label" style={{ marginBottom: 0 }}>Tracking Reminders</label>
                <p className="text-muted" style={{ fontSize: '0.625rem' }}>Remind me to track if I'm inactive</p>
              </div>
              <label className="switch">
                <input type="checkbox" checked={notifyReminders} onChange={e => setNotifyReminders(e.target.checked)} />
                <span className="slider round"></span>
              </label>
            </div>

          </div>

          <button onClick={save} disabled={isSaving || uploading} className="btn btn-primary" style={{ width: '100%' }}>
            <Save size={16} />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
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
  const [todos, setTodos] = useState<Todo[]>([]);
  const idleMinutesRef = useRef(0);
  const [idlePaused, setIdlePaused] = useState(false);
  const [liveIdleSeconds, setLiveIdleSeconds] = useState(0); // live idle tracking for current session
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const realtimeRef = useRef<any>(null);
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);
  const [updateInstalling, setUpdateInstalling] = useState(false);
  const memberSubscriptionRef = useRef<any>(null);

  // Keep a ref of notification settings for listeners/intervals to avoid stale closures
  const settingsRef = useRef(user?.custom_fields?.notification_settings);
  useEffect(() => {
    settingsRef.current = user?.custom_fields?.notification_settings;
  }, [user?.custom_fields?.notification_settings]);

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

  async function fetchDashboardStats(userId: string, currentProjects: Project[]) {
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



      const seen = new Set<string>();
      const dedupedSamples: any[] = [];
      const sortedSamples = [...(samples || [])].sort((a, b) => (b.activity_percent ?? 0) - (a.activity_percent ?? 0));

      sortedSamples.forEach(s => {
        const minute = new Date(s.recorded_at).toISOString().substring(0, 16);
        if (seen.has(minute)) return;
        seen.add(minute);
        dedupedSamples.push(s);
      });

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
    } catch (err) {
      console.error('fetchStats error:', err);
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

      let { data: member } = await sb.from('members').select('*').eq('auth_user_id', session.user.id).single();
      if (!member && session.user.email) {
        const { data: byEmail } = await sb.from('members').select('*').eq('email', session.user.email).single();
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
          keep_idle: member.keep_idle
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

    // Find or create a session for the target project
    const { data: existingSession } = await sb.from('sessions')
      .select('id')
      .eq('user_id', user.id)
      .eq('project_id', newProjectId)
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    let targetSessionId = existingSession?.id;
    if (!targetSessionId) {
      const { data: newSess } = await sb.from('sessions').insert({
        user_id: user.id,
        project_id: newProjectId,
        started_at: startTime
      }).select().single();
      targetSessionId = newSess?.id;
    }

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
    if (isTracking && !isPaused && user) {
      // Use productive time (elapsed already represents productive seconds)
      const currentToday = elapsed;
      const initialWeek = projects.reduce((s, p) => {
        const pWeekly = Math.max(0, (p.stats?.weeklySeconds || 0) - (p.stats?.weeklyIdleSeconds || 0));
        return s + pWeekly;
      }, 0);
      const currentWeek = initialWeek + elapsed;

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
      if (authError || !authData.user) return authError?.message || 'Login failed';

      let { data: member, error: memberError } = await sb
        .from('members').select('*').eq('auth_user_id', authData.user.id).single();

      // Fallback: lookup by email if auth_user_id is not yet linked
      if ((memberError || !member) && authData.user.email) {
        const { data: byEmail } = await sb.from('members').select('*').eq('email', authData.user.email).single();
        if (byEmail && !byEmail.auth_user_id) {
          const { error: updateError } = await sb.from('members').update({ auth_user_id: authData.user.id }).eq('id', byEmail.id);
          if (!updateError) {
            member = { ...byEmail, auth_user_id: authData.user.id };
            memberError = null;
          }
        }
      }

      if (memberError || !member) return 'User profile not found in your organization.';

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
        keep_idle: member.keep_idle
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

    try {
      const sb = await getSupabase();

      if (user?.tracking_enabled === false) {
        console.log('TRACKING BLOCKED: tracking_enabled is false', user);
        setTrackingError('Tracking has been disabled for your account by an administrator.');
        setActiveProject(null);
        setScreen('projects');
        return;
      }
      console.log('TRACKING ALLOWED: tracking_enabled is', user?.tracking_enabled);

      const { data: { session } } = await sb.auth.getSession();
      const token = session?.access_token;

      const res: any = await trackerAPI.startTracking(project.id, user?.id ?? '', token);
      if (res?.status === 'error') {
        setTrackingError(res.error || 'Failed to start tracking. Is the backend running?');
        setActiveProject(null);
        setScreen('projects');
        return;
      }
      setIsTracking(true);
      setSessionId(res?.session_id ?? null);
      setScreen('tracker');

      // Notification Alert
      if (settingsRef.current?.tracking_alerts !== false) {
        trackerAPI.showNotification('Tracking Started', `Now tracking for ${project.name}`);
      }
    } catch (err: any) {
      setTrackingError(err.toString());
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
    return () => {
      isMounted = false;
      if (unlisten) unlisten();
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
          background: '#4f46e5', color: '#fff', fontSize: '11px',
          padding: '5px 12px', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span>⬆ v{updateVersion} available</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              disabled={updateInstalling}
              onClick={async () => { setUpdateInstalling(true); await trackerAPI.installUpdate(); }}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '11px', padding: '2px 7px', cursor: 'pointer' }}
            >
              {updateInstalling ? '⏳ Installing…' : 'Install & Restart'}
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
            <ProjectsScreen user={user!} projects={projects} onSelect={handleSelectProject} onLogout={handleLogout} onSettings={() => setScreen('settings')} trackingError={trackingError} setTrackingError={setTrackingError} todos={todos} onTodoDone={handleTodoDone} />
          </motion.div>
        )}
        {screen === 'consent' && (
          <motion.div key="consent" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} style={{ display: 'flex', flex: 1, flexDirection: 'column' }}>
            <ConsentScreen project={activeProject!} onAccept={handleConsentAccepted} onDecline={handleConsentDeclined} />
          </motion.div>
        )}
        {screen === 'tracker' && (
          <motion.div key="tracker" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0 }}>
            <TrackerScreen
              user={user!}
              project={activeProject!}
              sessionId={sessionId}
              isPaused={isPaused}
              idlePaused={idlePaused}
              onResumeFromIdle={() => { setIdlePaused(false); (trackerAPI as any).stopIdleMonitoring(); handleResume(); }}
              elapsed={elapsed}
              liveIdleSeconds={liveIdleSeconds}
              onStop={handleStop}
              onPause={handlePause}
              onResume={handleResume}
              onSettings={() => setScreen('settings')}
              todos={todos}
              onTodoDone={handleTodoDone}
              projects={projects}
            />
          </motion.div>
        )}
        {screen === 'settings' && user && (
          <motion.div key="settings" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} style={{ display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0 }}>
            <SettingsScreen user={user} onSave={handleUpdateProfile} onBack={() => setScreen('projects')} />
          </motion.div>
        )}
      </AnimatePresence>
      <AppFooter />
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
        (import.meta as any).env?.VITE_SUPABASE_URL as string,
        (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string
      );
      const adminPortalUrl = (import.meta as any).env?.VITE_ADMIN_PORTAL_URL || 'http://localhost:5174';
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
            <img src="/logo.svg" style={{ width: 64, height: 64, objectFit: 'contain' }} alt="Trackora" />
          </div>
          <div className="brand-header-text">
            <h1 className="heading-1">{forgotMode ? 'Reset Password' : 'Welcome back'}</h1>
            <p className="text-muted">{forgotMode ? 'Enter your email for a reset link' : 'Sign in to Trackora'}</p>
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
function Topbar({ user, onLogout, onSettings, todoBadge, disabled }: { user?: User; onLogout?: () => void; onSettings?: () => void; todoBadge?: number; disabled?: boolean }) {
  const initials = user?.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'U';
  return (
    <header className="app-topbar">
      <div className="topbar-brand">
        <div className="topbar-logo">
          <img src="/logo.svg" style={{ width: 30, height: 30, objectFit: 'contain' }} alt="Trackora" />
        </div>
        <span className="topbar-title">Trackora</span>
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
                      background: todo.projectColor ? `${todo.projectColor}1a` : 'var(--accent-light)',
                      color: todo.projectColor || 'var(--accent)',
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
function ProjectsScreen({ user, projects, onSelect, onLogout, onSettings, trackingError, setTrackingError, todos, onTodoDone }: {
  user: User;
  projects: Project[];
  onSelect: (p: Project) => void;
  onLogout: () => void;
  onSettings: () => void;
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
      <Topbar user={user} onLogout={onLogout} onSettings={onSettings} todoBadge={todos.length} />

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
function ConsentScreen({ project, onAccept, onDecline }: {
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
            <ConsentItem icon={<Eye size={16} />} title="Screenshots" desc="Up to 3 random captures every 10 min to verify work." />
            <ConsentItem icon={<MonitorPlay size={16} />} title="Active Application" desc="Names of active windows (e.g. Chrome, VS Code)." />
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
function TrackerScreen({ user, project, isPaused = false, idlePaused = false, onResumeFromIdle, elapsed, liveIdleSeconds = 0, onStop, onPause, onResume, onSettings, todos, onTodoDone, projects }: {
  user: User;
  project: Project;
  sessionId?: string | null;
  isPaused?: boolean;
  idlePaused?: boolean;
  onResumeFromIdle?: () => void;
  elapsed: number;
  liveIdleSeconds?: number;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  onSettings: () => void;
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
      <Topbar user={user} onLogout={onStop} onSettings={onSettings} todoBadge={todos.length} disabled={true} />

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
          <div className={`status-pill ${isPaused ? 'status-paused' : 'status-live'}`}>
            <div className="status-dot" />
            {isPaused ? 'Paused' : 'Tracking Live'}
          </div>

          <div className="tracker-project-pill">
            <div className="tracker-project-dot" style={{ backgroundColor: project.color }} />
            <span className="tracker-project-name">{project.name}</span>
          </div>

          <div className={`timer-display ${isPaused ? 'timer-paused' : ''}`}>
            {fmt(hrs)}:{fmt(mins)}:{fmt(secs)}
          </div>

          <p className="timer-subtext" style={{ marginBottom: '0.75rem' }}>
            {isPaused
              ? 'Activity is not being recorded.'
              : 'Screenshots and metrics are securely recorded.'}
          </p>

          <div style={{ marginTop: '1rem', padding: '0.625rem 0.875rem', background: 'var(--bg-secondary)', borderRadius: '0.75rem', fontSize: '0.8125rem', display: 'grid', gridTemplateColumns: 'min-content 1fr min-content', gap: '0.5rem 0.75rem', textAlign: 'left', minWidth: '240px', margin: '0 auto 1.5rem auto', border: '1px solid var(--border-light)' }}>
            <div style={{ color: 'var(--primary)', alignSelf: 'center' }}><Clock size={14} /></div>
            <div style={{ color: 'var(--text-secondary)' }}>Productive Time</div>
            <div style={{ fontFamily: 'monospace', color: 'var(--text-primary)', fontWeight: 600 }}>
              {fmt(Math.floor(displayProductive / 3600))}:{fmt(Math.floor((displayProductive % 3600) / 60))}
            </div>

            <div style={{ color: 'var(--amber)', alignSelf: 'center' }}><Activity size={14} /></div>
            <div style={{ color: 'var(--text-secondary)' }}>Idle Time</div>
            <div style={{ fontFamily: 'monospace', color: 'var(--text-primary)', fontWeight: 600 }}>
              {fmt(Math.floor(displayIdle / 3600))}:{fmt(Math.floor((displayIdle % 3600) / 60))}
            </div>
          </div>

          <div className="tracker-controls">
            {isPaused ? (
              <button className="control-btn active-resume" onClick={onResume}>
                <Play className="control-icon" size={18} fill="currentColor" />
                Resume
              </button>
            ) : (
              <button className="control-btn active-pause" onClick={onPause}>
                <Pause className="control-icon" size={18} fill="currentColor" />
                Break
              </button>
            )}
            <button className="control-btn action-stop" onClick={onStop}>
              <Square className="control-icon" size={18} fill="currentColor" />
              Stop
            </button>
          </div>
        </motion.div>
      </div>

      <MyTasksPanel todos={todos} onDone={onTodoDone} />
    </div>
  );
}
