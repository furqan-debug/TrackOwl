import { useEffect, useState } from 'react';
import { listen, type Event } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { Download, RefreshCw, X } from 'lucide-react';

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
  const [dismissed, setDismissed] = useState(false);

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

  if (!updateInfo || dismissed) return null;

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

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 bg-white border border-slate-200 shadow-2xl rounded-2xl p-5 overflow-hidden animate-in slide-in-from-bottom-5">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 text-blue-600">
          <Download className="w-5 h-5" />
          <h3 className="font-bold text-slate-900">Update Available</h3>
        </div>
        {!installing && (
          <button onClick={() => setDismissed(true)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <p className="text-sm text-slate-600 font-medium mb-3">
        Version {updateInfo.version || 'New'} is ready to install!
      </p>

      {error && (
        <div className="mb-3 p-2 bg-red-50 text-red-600 text-xs rounded border border-red-100">
          {error}
        </div>
      )}

      {installing ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Downloading...</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-blue-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          {progress === 100 && (
            <p className="text-xs text-center text-slate-500 font-medium mt-2 animate-pulse">
              Restarting app...
            </p>
          )}
        </div>
      ) : (
        <button
          onClick={handleUpdate}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Update Now
        </button>
      )}
    </div>
  );
}
