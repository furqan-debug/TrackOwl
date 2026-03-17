/**
 * tauri-ipc.ts
 * 
 * Drop-in replacement for Electron's window.trackerAPI.
 * When running inside Tauri, uses invoke() to call Rust commands.
 * When running in a plain browser (dev/demo), falls back to demo mode.
 */

// Tauri v2: invoke is accessed via @tauri-apps/api/core
type InvokeFn = (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;

function getInvoke(): InvokeFn | null {
  // Tauri v2 exposes __TAURI__ on the window
  if (typeof window !== 'undefined' && (window as any).__TAURI__) {
    return (window as any).__TAURI__.core.invoke as InvokeFn;
  }
  return null;
}

export function isTauri(): boolean {
  return getInvoke() !== null;
}

export const trackerAPI = {
  /** Start a new tracking session — returns { status, session_id?, error? } */
  startTracking: async (projectId: string, userId: string, token?: string) => {
    const invoke = getInvoke();
    if (!invoke) return { status: 'running', session_id: 'demo-' + Date.now() };
    return invoke('start_tracking', { projectId, userId, token: token ?? '' });
  },

  /** Stop the current tracking session */
  stopTracking: async () => {
    const invoke = getInvoke();
    if (!invoke) return { status: 'stopped' };
    return invoke('stop_tracking');
  },

  /** Pause the current tracking session */
  pauseTracking: async () => {
    const invoke = getInvoke();
    if (!invoke) return { status: 'paused' };
    return invoke('pause_tracking');
  },

  /** Resume the paused tracking session */
  resumeTracking: async () => {
    const invoke = getInvoke();
    if (!invoke) return { status: 'running' };
    return invoke('resume_tracking');
  },

  /** Show a native desktop notification */
  showNotification: async (title: string, body: string) => {
    const invoke = getInvoke();
    if (!invoke) return;
    return invoke('show_notification_cmd', { title, body });
  },

  /** Phase 3 — stub for now; Phase 3 native hooks will emit events from Rust */
  onTrackingSample: (_cb: (data: unknown) => void) => {
    // Phase 3: Tauri will emit events from Rust instead of Electron IPC
  },

  /** Install the pending auto-update (downloads + restarts app) */
  installUpdate: async () => {
    const invoke = getInvoke();
    if (!invoke) return;
    return invoke('install_update');
  },
};
