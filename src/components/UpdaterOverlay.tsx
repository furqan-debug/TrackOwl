import { useEffect, useState } from 'react';
import { listen, type Event } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { Loader2 } from 'lucide-react';

// In the Mac App Store build (VITE_APP_STORE=true) self-updating is
// forbidden by Apple Guideline 2.4.5(vii). The entire component is a
// no-op so that no Tauri event listeners are registered and no update
// UI is ever rendered.
const IS_APP_STORE = import.meta.env.VITE_APP_STORE === 'true';

import { isWindowsOS } from '../tauri-ipc';

interface UpdateStatus {
  available: boolean;
  version: string | null;
  notes: string | null;
  platform?: string;
}

export function UpdaterOverlay() {
  const [updateInfo, setUpdateInfo] = useState<UpdateStatus | null>(null);
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // App Store build: do nothing — updater not compiled in.
    if (IS_APP_STORE) return;

    let unlistenAvailable: (() => void) | undefined;
    let unlistenProgress: (() => void) | undefined;

    const setup = async () => {
      try {
        unlistenAvailable = await listen<UpdateStatus>('update-available', (event: Event<UpdateStatus>) => {
          console.log('[updater] Update available received:', event.payload);
          setUpdateInfo(event.payload);
        });

        unlistenProgress = await listen<number>('update-progress', (event: Event<number>) => {
          console.log('[updater] Download progress:', event.payload);
          setProgress(event.payload);
        });
      } catch (err) {
        console.warn('Updater listeners could not be set up (likely not in Tauri environment):', err);
      }
    };

    setup();

    return () => {
      if (unlistenAvailable) unlistenAvailable();
      if (unlistenProgress) unlistenProgress();
    };
  }, []);

  // Auto-trigger update when detected ONLY on Windows
  useEffect(() => {
    if (IS_APP_STORE) return;
    const isWin = updateInfo?.platform ? updateInfo.platform === 'windows' : isWindowsOS();
    if (isWin && updateInfo && !installing && !error) {
      handleUpdate();
    }
  }, [updateInfo]);

  const handleUpdate = async () => {
    if (IS_APP_STORE) return;
    setInstalling(true);
    setError(null);
    try {
      await invoke('install_update');
    } catch (err: any) {
      console.error('[updater] Failed to install update:', err);
      setError('Update failed. Please check your internet connection and try again later.');
      setInstalling(false);
    }
  };

  const isWin = updateInfo?.platform ? updateInfo.platform === 'windows' : isWindowsOS();

  // App Store build or no update pending or dismissed (non-Windows) — render nothing.
  if (IS_APP_STORE || !updateInfo || (!isWin && dismissed)) return null;

  // On macOS: non-forced floating card with dismiss
  if (!isWin) {
    return (
      <div style={{
        position: 'fixed', top: '16px', right: '16px', zIndex: 99999,
        maxWidth: '360px', width: 'calc(100% - 32px)',
        background: '#001338', border: '1px solid rgba(250, 204, 21, 0.35)',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
        borderRadius: '16px', padding: '16px', color: '#fff'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/header-white.svg" style={{ height: '24px', objectFit: 'contain' }} alt="TrackOwl" />
            <span style={{ fontWeight: '700', fontSize: '14px', color: '#fff' }}>Update Available</span>
          </div>
          {!installing && (
            <button
              onClick={() => setDismissed(true)}
              style={{
                background: 'transparent', border: 'none', color: '#94a3b8',
                fontSize: '18px', cursor: 'pointer', padding: '0 4px', lineHeight: 1
              }}
              title="Dismiss"
            >
              ×
            </button>
          )}
        </div>
        <p style={{ fontSize: '12px', color: '#cbd5e1', margin: '8px 0 14px 0', lineHeight: 1.4 }}>
          Version {updateInfo.version || 'New'} is ready to install with performance and feature improvements.
        </p>
        {installing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', fontWeight: '600' }}>
              <span>{progress === 100 ? 'Installing...' : 'Downloading assets...'}</span>
              <span style={{ color: '#facc15' }}>{progress}%</span>
            </div>
            <div style={{ width: '100%', background: 'rgba(255,255,255,0.1)', height: '6px', borderRadius: '9999px', overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, height: '100%', background: '#facc15', transition: 'width 0.2s ease' }} />
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setDismissed(true)}
              style={{
                padding: '7px 14px', borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.15)', background: 'transparent',
                color: '#cbd5e1', fontSize: '12px', fontWeight: '600', cursor: 'pointer'
              }}
            >
              Later
            </button>
            <button
              onClick={handleUpdate}
              style={{
                padding: '7px 16px', borderRadius: '8px', border: 'none',
                background: 'linear-gradient(135deg, #facc15 0%, #eab308 100%)',
                color: '#001338', fontSize: '12px', fontWeight: '700', cursor: 'pointer'
              }}
            >
              Update Now
            </button>
          </div>
        )}
      </div>
    );
  }

  // Windows: Forced fullscreen non-dismissible modal
  return (
    <div className="fixed inset-0 z-[9999] bg-[#001338] flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="max-w-md w-full flex flex-col items-center gap-8">
        {/* Brand Logo with golden glow */}
        <img 
          src="/header-white.svg" 
          className="h-16 object-contain drop-shadow-[0_0_20px_rgba(250,204,21,0.6)] animate-pulse" 
          alt="TrackOwl" 
        />

        <div className="space-y-3">
          <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center justify-center gap-3">
            <Loader2 className="w-7 h-7 text-[#facc15] animate-spin" />
            Updating TrackOwl
          </h2>
          <p className="text-sm font-medium text-slate-300">
            Installing Version {updateInfo.version || 'New'} — Please do not close the application.
          </p>
        </div>

        {error ? (
          <div className="w-full p-4 bg-amber-950/40 border border-amber-500/20 text-amber-200 text-sm rounded-xl font-medium">
            <p className="font-bold mb-1">Update Failed</p>
            <p className="text-xs text-amber-300/80 mb-4">{error}</p>
            <button
              onClick={handleUpdate}
              className="py-2.5 px-6 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              Retry Update
            </button>
          </div>
        ) : (
          <div className="w-full space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-1">
              <span>{progress === 100 ? 'Installing...' : 'Downloading assets...'}</span>
              <span className="text-[#facc15] font-mono">{progress}%</span>
            </div>
            
            {/* Custom styled progress bar */}
            <div className="w-full bg-white/5 border border-white/5 h-3 rounded-full overflow-hidden p-0.5">
              <div 
                className="h-full rounded-full transition-all duration-300"
                style={{ 
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, #facc15 0%, #eab308 100%)',
                  boxShadow: '0 0 10px rgba(250, 204, 21, 0.4)'
                }}
              />
            </div>

            {progress === 100 && (
              <p className="text-xs text-slate-400 font-semibold mt-4 animate-bounce">
                Finalizing installation and restarting...
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
