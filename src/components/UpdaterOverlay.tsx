import { useEffect, useState } from 'react';
import { listen, type Event } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { Loader2 } from 'lucide-react';
interface UpdateStatus {
  available: boolean;
  version: string | null;
  notes: string | null;
}

export function UpdaterOverlay() {
  const [updateInfo, setUpdateInfo] = useState<UpdateStatus | null>(null);
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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

  // Auto-trigger update when detected
  useEffect(() => {
    if (updateInfo && !installing && !error) {
      handleUpdate();
    }
  }, [updateInfo]);

  const handleUpdate = async () => {
    setInstalling(true);
    setError(null);
    try {
      await invoke('install_update');
    } catch (err: any) {
      console.error('[updater] Failed to install update:', err);
      setError(err.toString());
      setInstalling(false);
    }
  };

  if (!updateInfo) return null;

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
          <div className="w-full p-4 bg-red-950/40 border border-red-500/20 text-red-200 text-sm rounded-xl font-medium">
            <p className="font-bold mb-1">Update Failed</p>
            <p className="text-xs text-red-300/80 mb-4">{error}</p>
            <button
              onClick={handleUpdate}
              className="py-2.5 px-6 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
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
