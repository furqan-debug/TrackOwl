import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock, Mail, ArrowRight, Play, Square, Pause,
  ChevronRight, LogOut, CheckCircle2,
  ShieldAlert, Eye, MapPin, MonitorPlay, MousePointerClick,
  ClipboardList, Calendar, Circle, ChevronDown, ChevronUp
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

type Screen = 'login' | 'projects' | 'consent' | 'tracker';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  stats?: {
    todaySeconds: number;
    weeklySeconds: number;
    activityPercent: number;
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
  if (seconds < 60) return `${seconds}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
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
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const realtimeRef = useRef<any>(null);
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);
  const [updateInstalling, setUpdateInstalling] = useState(false);

  useEffect(() => {
    trackerAPI.onTrackingSample((_sample: unknown) => { });

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

      const { data: member } = await sb.from('members').select('*').eq('id', session.user.id).single();
      if (member) {
        const userObj = { id: member.id, email: member.email, full_name: member.full_name, role: member.role };
        setUser(userObj);
        const { data: projs } = await sb.from('projects').select('*');
        setProjects(projs || []);
        setScreen('projects');
        fetchAndSubscribeTodos(userObj.id);
      } else {
        clearSession();
      }
    });
  }, []);

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

  useEffect(() => {
    if (isTracking && !isPaused) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isTracking, isPaused]);

  async function handleLogin(email: string, password: string): Promise<string | null> {
    try {
      const sb = await getSupabase();
      const { data: authData, error: authError } = await sb.auth.signInWithPassword({ email, password });
      if (authError || !authData.user) return authError?.message || 'Login failed';

      const { data: member, error: memberError } = await sb
        .from('members').select('*').eq('id', authData.user.id).single();
      if (memberError || !member) return 'User profile not found in your organization.';

      const userObj = { id: member.id, email: member.email, full_name: member.full_name, role: member.role };
      const { data: projectsData } = await sb.from('projects').select('*');
      const token = authData.session.access_token;

      if (rememberMe) saveSession(token, userObj);
      setUser(userObj);
      setProjects(projectsData || []);
      setScreen('projects');
      fetchAndSubscribeTodos(userObj.id);
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
    setElapsed(project.stats?.todaySeconds || 0);
    setIsPaused(false);
    setTrackingError(null);

    const res: any = await trackerAPI.startTracking(project.id, user?.id ?? '', undefined);
    if (res?.status === 'error') {
      setTrackingError(res.error || 'Failed to start tracking. Is the backend running?');
      setActiveProject(null);
      return;
    }
    setIsTracking(true);
    setSessionId(res?.session_id ?? null);
    setScreen('tracker');
  }

  async function handleStop() {
    await trackerAPI.stopTracking();
    setIsTracking(false);
    setIsPaused(false);
    setSessionId(null);
    setActiveProject(null);
    setElapsed(0);
    setScreen('projects');
  }

  async function handlePause() {
    setIsPaused(true);
    await trackerAPI.pauseTracking();
  }

  async function handleResume() {
    setIsPaused(false);
    await trackerAPI.resumeTracking();
  }

  function handleLogout() {
    handleStop();
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

  const pageVariants = {
    initial: { opacity: 0, y: 8 },
    in:      { opacity: 1, y: 0 },
    out:     { opacity: 0, y: -8 }
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
          <motion.div key="login" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} style={{ display: 'flex', flex: 1 }}>
            <LoginScreen onLogin={handleLogin} rememberMe={rememberMe} setRememberMe={setRememberMe} />
          </motion.div>
        )}
        {screen === 'projects' && (
          <motion.div key="projects" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} style={{ display: 'flex', flex: 1, flexDirection: 'column' }}>
            <ProjectsScreen user={user!} projects={projects} onSelect={handleSelectProject} onLogout={handleLogout} trackingError={trackingError} todos={todos} onTodoDone={handleTodoDone} />
          </motion.div>
        )}
        {screen === 'consent' && (
          <motion.div key="consent" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} style={{ display: 'flex', flex: 1, flexDirection: 'column' }}>
            <ConsentScreen project={activeProject!} onAccept={handleConsentAccepted} onDecline={handleConsentDeclined} />
          </motion.div>
        )}
        {screen === 'tracker' && (
          <motion.div key="tracker" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} style={{ display: 'flex', flex: 1, flexDirection: 'column' }}>
            <TrackerScreen user={user!} project={activeProject!} sessionId={sessionId} isPaused={isPaused} elapsed={elapsed} onStop={handleStop} onPause={handlePause} onResume={handleResume} todos={todos} onTodoDone={handleTodoDone} />
          </motion.div>
        )}
      </AnimatePresence>
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
            <div style={{ width: 18, height: 18, border: '2.5px solid white', borderRadius: 3, transform: 'rotate(45deg)' }} />
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
                  <Lock size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                  <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" className="field-input" style={{ paddingLeft: '2.25rem' }} />
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
function Topbar({ user, onLogout, todoBadge }: { user?: User; onLogout?: () => void; todoBadge?: number }) {
  const initials = user?.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'U';
  return (
    <header className="app-topbar">
      <div className="topbar-brand">
        <div className="topbar-logo">
          <div style={{ width: 12, height: 12, border: '2px solid white', borderRadius: 2, transform: 'rotate(45deg)' }} />
        </div>
        <span className="topbar-title">Trackora</span>
      </div>
      {user && onLogout && (
        <div className="topbar-actions">
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
          <div className="user-avatar">{initials}</div>
          <button onClick={onLogout} className="btn btn-ghost" title="Sign out" style={{ padding: '0.3rem' }}>
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
function MyTasksPanel({ todos, onDone }: { todos: Todo[]; onDone: (id: string) => void }) {
  const [open, setOpen] = useState(true);
  if (todos.length === 0) return null;
  return (
    <div className="tasks-panel">
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
function ProjectsScreen({ user, projects, onSelect, onLogout, trackingError, todos, onTodoDone }: {
  user: User;
  projects: Project[];
  onSelect: (p: Project) => void;
  onLogout: () => void;
  trackingError?: string | null;
  todos: Todo[];
  onTodoDone: (id: string) => void;
}) {
  const totalToday   = projects.reduce((s, p) => s + (p.stats?.todaySeconds || 0), 0);
  const totalWeek    = projects.reduce((s, p) => s + (p.stats?.weeklySeconds || 0), 0);
  const tracked      = projects.filter(p => (p.stats?.weeklySeconds || 0) > 0);
  const avgActivity  = tracked.length > 0
    ? Math.round(tracked.reduce((s, p) => s + (p.stats?.activityPercent || 0), 0) / tracked.length)
    : 0;

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show:   { opacity: 1,  y: 0 },
  };

  return (
    <div className="projects-layout">
      <Topbar user={user} onLogout={onLogout} todoBadge={todos.length} />

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
                <div className="project-card" onClick={() => onSelect(p)} style={{ '--project-color': p.color } as any}>
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
            <ConsentItem icon={<Eye size={16} />}      title="Screenshots"        desc="Up to 3 random captures every 10 min to verify work." />
            <ConsentItem icon={<MonitorPlay size={16} />} title="Active Application" desc="Names of active windows (e.g. Chrome, VS Code)." />
            <ConsentItem icon={<MousePointerClick size={16} />} title="Activity Counts"    desc="Mouse clicks and keystrokes count (not content)." />
            <ConsentItem icon={<MapPin size={16} />}   title="General Location"   desc="IP-based location for security auditing." />
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
function TrackerScreen({ user, project, isPaused = false, elapsed, onStop, onPause, onResume, todos, onTodoDone }: {
  user: User;
  project: Project;
  sessionId?: string | null;
  isPaused?: boolean;
  elapsed: number;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  todos: Todo[];
  onTodoDone: (id: string) => void;
}) {
  const hrs  = Math.floor(elapsed / 3600);
  const mins = Math.floor((elapsed % 3600) / 60);
  const secs = elapsed % 60;
  const fmt  = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="tracker-layout">
      <Topbar user={user} />

      <div className="tracker-body">
        <motion.div className="tracker-widget" initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.35 }}>
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

          <p className="timer-subtext">
            {isPaused
              ? 'Activity is not being recorded.'
              : 'Screenshots and metrics are securely recorded.'}
          </p>

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
