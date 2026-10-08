import React, { useEffect } from 'react';
import type { CurriculumPreset } from '../types';
import { AlertTriangle, RefreshCw, CopyPlus, X, BookOpen, Layers } from 'lucide-react';

interface ImportConflictModalProps {
  isOpen: boolean;
  existingPreset: CurriculumPreset | null;
  importedPreset: CurriculumPreset | null;
  onReplace: () => void;
  onSaveAsNew: () => void;
  onCancel: () => void;
}

export const ImportConflictModal: React.FC<ImportConflictModalProps> = ({
  isOpen,
  existingPreset,
  importedPreset,
  onReplace,
  onSaveAsNew,
  onCancel,
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onCancel]);

  if (!isOpen || !existingPreset || !importedPreset) return null;

  const existingSks = existingPreset.courses.reduce((sum, c) => sum + c.sks, 0);
  const importedSks = importedPreset.courses.reduce((sum, c) => sum + c.sks, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="conflict-dialog-title"
        className="bg-white dark:bg-[#0c121e] border border-amber-500/30 dark:border-amber-500/20 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col animate-slide-up"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-amber-500/5 dark:bg-amber-500/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 id="conflict-dialog-title" className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Kurikulum Sudah Ada
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Preset dengan nama yang sama terdeteksi
              </p>
            </div>
          </div>

          <button
            onClick={onCancel}
            aria-label="Tutup"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-4 text-xs">
          <p className="text-slate-600 dark:text-slate-300">
            Kurikulum dengan nama <span className="font-bold text-slate-900 dark:text-white underline decoration-amber-500 decoration-2">"{existingPreset.name}"</span> sudah ada di daftar preset Anda. Apakah Anda ingin menimpanya atau menyimpannya sebagai kurikulum baru?
          </p>

          {/* Comparison Cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* Existing Preset Card */}
            <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1 mb-1.5">
                  <BookOpen className="w-3 h-3 text-slate-400" />
                  Preset Saat Ini
                </span>
                <div className="font-bold text-slate-900 dark:text-white line-clamp-1 mb-1">
                  {existingPreset.name}
                </div>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                <div>{existingPreset.courses.length} mata kuliah</div>
                <div>{existingSks} SKS Total</div>
              </div>
            </div>

            {/* Imported Preset Card */}
            <div className="p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mb-1.5">
                  <Layers className="w-3 h-3 text-emerald-500" />
                  File JSON Impor
                </span>
                <div className="font-bold text-emerald-950 dark:text-emerald-100 line-clamp-1 mb-1">
                  {importedPreset.name}
                </div>
              </div>
              <div className="text-[11px] text-emerald-700 dark:text-emerald-300 space-y-0.5 pt-2 border-t border-emerald-500/20">
                <div>{importedPreset.courses.length} mata kuliah</div>
                <div>{importedSks} SKS Total</div>
              </div>
            </div>
          </div>

          {/* Detailed Decision Actions */}
          <div className="space-y-2 pt-2">
            {/* Action 1: Replace */}
            <button
              id="btn-replace-preset"
              onClick={onReplace}
              className="w-full text-left p-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/15 dark:hover:bg-amber-500/20 text-slate-900 dark:text-white transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0">
                  <RefreshCw className="w-4 h-4" />
                </span>
                <div>
                  <div className="font-bold text-amber-900 dark:text-amber-200">
                    Ganti yang Ada (Replace)
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Timpa mata kuliah dan data kurikulum yang ada dengan versi dari file impor
                  </div>
                </div>
              </div>
            </button>

            {/* Action 2: Save as New */}
            <button
              id="btn-save-new-preset"
              onClick={onSaveAsNew}
              className="w-full text-left p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-900 dark:text-white transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                  <CopyPlus className="w-4 h-4" />
                </span>
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">
                    Simpan Sebagai Baru (Keep Both)
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Tambahkan sebagai preset baru tanpa mengubah kurikulum lama
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex justify-end">
          <button
            id="btn-cancel-conflict"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
};
