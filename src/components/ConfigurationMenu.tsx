import React, { useState, useRef, useEffect } from 'react';
import type { CurriculumPreset } from '../types';
import { parseCurriculumJson } from '../utils/curriculumIO';
import { 
  Settings, 
  Layers, 
  CheckCircle2, 
  Circle, 
  SlidersHorizontal, 
  Upload, 
  Download, 
  ChevronRight,
  BookOpen
} from 'lucide-react';

interface ConfigurationMenuProps {
  presets: CurriculumPreset[];
  activePresetId: string;
  onSwitchPreset: (presetId: string) => void;
  onOpenManageModal: (initialTab?: 'presets' | 'courses') => void;
  onImportPreset: (preset: CurriculumPreset) => void;
  onExportPreset: (preset: CurriculumPreset) => void;
}

export const ConfigurationMenu: React.FC<ConfigurationMenuProps> = ({
  presets,
  activePresetId,
  onSwitchPreset,
  onOpenManageModal,
  onImportPreset,
  onExportPreset,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activePreset = presets.find(p => p.id === activePresetId) || presets[0];

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleSelectPreset = (id: string, name: string) => {
    onSwitchPreset(id);
    showToast(`Kurikulum aktif: ${name}`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const fallbackName = file.name.replace(/\.[^/.]+$/, '');
        const importedPreset = parseCurriculumJson(text, fallbackName);

        if (importedPreset) {
          onImportPreset(importedPreset);
          showToast(`Memproses kurikulum: ${importedPreset.name}`);
        } else {
          alert('Format JSON tidak valid. Pastikan file JSON memuat data kurikulum atau daftar mata kuliah yang valid.');
        }
      } catch (err) {
        console.error('Failed reading import json', err);
        alert('Gagal membaca file JSON. Pastikan format JSON valid.');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Cog Icon Button (beside left of dark/light mode) */}
      <button
        id="btn-config-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Configuration"
        title="Curriculum Settings & Presets"
        className={`p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-slate-200/50 dark:border-slate-800/50 flex items-center justify-center relative ${
          isOpen ? 'bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-emerald-400 ring-2 ring-emerald-500/20 shadow-sm' : ''
        }`}
      >
        <Settings className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-90 text-emerald-500' : ''}`} />
      </button>

      {/* Pop-up Menu */}
      {isOpen && (
        <div 
          role="menu"
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white/95 dark:bg-[#0c121e]/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 shadow-2xl p-2 z-50 text-slate-800 dark:text-slate-100 animate-slide-up space-y-2"
        >
          {/* Section: Curriculum Header */}
          <div className="px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <BookOpen className="w-4 h-4" />
              </span>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Curriculum
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                  Preset &amp; Course Management
                </p>
              </div>
            </div>

            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold shrink-0">
              {presets.length} Preset
            </span>
          </div>

          {/* Submenu: Preset (Switch curriculum) */}
          <div className="px-2 pt-1 pb-1.5">
            <div className="flex items-center justify-between mb-1.5 px-1">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
                <Layers className="w-3.5 h-3.5 text-blue-500" />
                <span>Preset</span>
                <span className="text-[10px] font-normal lowercase text-slate-400">(Switch curriculum)</span>
              </span>
            </div>

            {/* List of curriculums */}
            <div className="space-y-1 max-h-48 overflow-y-auto pr-0.5">
              {presets.map((preset) => {
                const isSelected = preset.id === activePresetId;
                const totalSks = preset.courses.reduce((sum, c) => sum + c.sks, 0);

                return (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset.id, preset.name)}
                    className={`w-full text-left p-2 rounded-xl transition-all flex items-center justify-between gap-2.5 group ${
                      isSelected
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-500/30'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isSelected ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0 group-hover:text-slate-400" />
                      )}
                      <div className="min-w-0">
                        <div className="text-xs truncate font-medium">
                          {preset.name}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                          <span>{preset.courses.length} matkul</span>
                          <span>•</span>
                          <span>{totalSks} SKS</span>
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500 text-white font-bold shrink-0">
                        Aktif
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-px bg-slate-200/80 dark:bg-slate-800 my-1" />

          {/* Action Items: Manage, Import, Export */}
          <div className="space-y-1 p-1">
            {/* Manage item */}
            <button
              onClick={() => {
                setIsOpen(false);
                onOpenManageModal('presets');
              }}
              className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors flex items-center justify-between gap-2 text-slate-700 dark:text-slate-200 group"
            >
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <SlidersHorizontal className="w-4 h-4" />
                </span>
                <div>
                  <div className="text-xs font-semibold">Manage</div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500">
                    Add, Remove or edit curriculums &amp; courses
                  </div>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* Import item */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors flex items-center justify-between gap-2 text-slate-700 dark:text-slate-200 group"
            >
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <Upload className="w-4 h-4" />
                </span>
                <div>
                  <div className="text-xs font-semibold">Import</div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500">
                    Import JSON file to curriculums data
                  </div>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* Export item */}
            <button
              onClick={() => {
                onExportPreset(activePreset);
                showToast(`Kurikulum diekspor ke file JSON`);
              }}
              className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors flex items-center justify-between gap-2 text-slate-700 dark:text-slate-200 group"
            >
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Download className="w-4 h-4" />
                </span>
                <div>
                  <div className="text-xs font-semibold">Export</div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500">
                    Export entire curriculum to JSON
                  </div>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Hidden File Input for Import */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Quick Toast feedback inside menu */}
          {toastMessage && (
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-[11px] font-medium text-center animate-fade-in">
              {toastMessage}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
