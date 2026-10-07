import React from 'react';
import { Zap, RefreshCw, X, Loader2 } from 'lucide-react';

interface UpdateNotificationToastProps {
  isUpdateAvailable: boolean;
  isDownloadingUpdate: boolean;
  onReload: () => void;
  onDismiss: () => void;
}

export const UpdateNotificationToast: React.FC<UpdateNotificationToastProps> = ({
  isUpdateAvailable,
  isDownloadingUpdate,
  onReload,
  onDismiss,
}) => {
  if (isDownloadingUpdate) {
    return (
      <aside 
        aria-label="Unduhan Pembaruan" 
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full bg-slate-900/90 text-white dark:bg-slate-800/90 border border-slate-700/80 shadow-2xl backdrop-blur-md text-xs animate-fade-in"
      >
        <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
        <span>Mengunduh versi baru SIA-Orbit di latar belakang...</span>
      </aside>
    );
  }

  if (!isUpdateAvailable) return null;

  return (
    <aside 
      aria-label="Pemberitahuan Pembaruan Sistem" 
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[95%] sm:w-auto max-w-xl animate-slide-up"
    >
      <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-2xl bg-slate-950 text-white border border-emerald-500/40 shadow-2xl shadow-emerald-500/10 backdrop-blur-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4 animate-bounce" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
              <span>Update Available</span>
              <span className="text-[10px] font-mono font-normal px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                SW Cached
              </span>
            </h4>
            <p className="text-[11px] text-slate-300 line-clamp-1">
              A new version of SIA-Orbit has been cached. Reload to activate.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onReload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-xs shadow-md transition-all active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reload Now</span>
          </button>

          <button
            onClick={onDismiss}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
