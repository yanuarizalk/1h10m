import React, { useState, useRef, useEffect } from 'react';
import type { CurriculumPreset, TaskNotificationConfig } from '../types';
import { parseCurriculumJson } from '../utils/curriculumIO';
import { 
  getNotificationPermission, 
  requestNotificationPermission, 
  sendTestNotification, 
  clearNotifiedTaskHistory 
} from '../utils/taskNotificationService';
import { 
  Settings, 
  Layers, 
  CheckCircle2, 
  Circle, 
  SlidersHorizontal, 
  Upload, 
  Download, 
  ChevronRight,
  BookOpen,
  Bell,
  BellRing,
  BellOff,
  Clock,
  CheckSquare,
  ShieldCheck,
  ShieldAlert,
  RotateCcw,
  Sparkles
} from 'lucide-react';

interface ConfigurationMenuProps {
  presets: CurriculumPreset[];
  activePresetId: string;
  onSwitchPreset: (presetId: string) => void;
  onOpenManageModal: (initialTab?: 'presets' | 'courses') => void;
  onImportPreset: (preset: CurriculumPreset) => void;
  onExportPreset: (preset: CurriculumPreset) => void;
  notificationConfig: TaskNotificationConfig;
  onUpdateNotificationConfig: (config: TaskNotificationConfig) => void;
}

export const ConfigurationMenu: React.FC<ConfigurationMenuProps> = ({
  presets,
  activePresetId,
  onSwitchPreset,
  onOpenManageModal,
  onImportPreset,
  onExportPreset,
  notificationConfig,
  onUpdateNotificationConfig,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeConfigTab, setActiveConfigTab] = useState<'curriculum' | 'task'>('curriculum');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<NotificationPermission | 'unsupported'>('default');
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [isTestingNotification, setIsTestingNotification] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activePreset = presets.find(p => p.id === activePresetId) || presets[0];

  // Refresh permission state on mount and open
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPermissionState(getNotificationPermission());
    }
  }, [isOpen]);

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

  const handleRequestPermission = async () => {
    setIsRequestingPermission(true);
    try {
      const res = await requestNotificationPermission();
      setPermissionState(res);
      if (res === 'granted') {
        showToast('Izin notifikasi diberikan!');
      } else if (res === 'denied') {
        showToast('Izin notifikasi ditolak.');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsRequestingPermission(false);
    }
  };

  const handleToggleNotification = (enabled: boolean) => {
    onUpdateNotificationConfig({
      ...notificationConfig,
      enabled,
    });
    showToast(enabled ? 'Pengingat tugas diaktifkan' : 'Pengingat tugas dinonaktifkan');
  };

  const handleSetReminderMinutes = (minutes: number) => {
    const safeMinutes = Math.max(1, Math.min(10080, minutes)); // between 1 min and 7 days
    onUpdateNotificationConfig({
      ...notificationConfig,
      reminderMinutes: safeMinutes,
    });
  };

  const handleTestNotification = async () => {
    if (permissionState !== 'granted') {
      const res = await requestNotificationPermission();
      setPermissionState(res);
      if (res !== 'granted') {
        alert('Harap berikan izin notifikasi terlebih dahulu untuk menguji notifikasi OS.');
        return;
      }
    }

    setIsTestingNotification(true);
    try {
      const sent = await sendTestNotification(notificationConfig.reminderMinutes);
      if (sent) {
        showToast('Notifikasi uji coba dikirim ke OS!');
      } else {
        alert('Gagal mengirim notifikasi. Pastikan notifikasi peramban tidak diblokir di Windows/OS.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsTestingNotification(false);
    }
  };

  const handleResetHistory = () => {
    clearNotifiedTaskHistory();
    showToast('Riwayat pengingat berhasil direset');
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Cog Icon Button */}
      <button
        id="btn-config-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Configuration"
        title="Configuration &amp; Notification Settings"
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
          className="absolute right-0 mt-2 w-84 sm:w-[410px] rounded-2xl bg-white/95 dark:bg-[#0c121e]/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 shadow-2xl p-3 z-50 text-slate-800 dark:text-slate-100 animate-slide-up space-y-3"
        >
          {/* Top Tabs: Curriculum vs Task */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
            <button
              onClick={() => setActiveConfigTab('curriculum')}
              className={`flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                activeConfigTab === 'curriculum'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Curriculum</span>
            </button>

            <button
              onClick={() => setActiveConfigTab('task')}
              className={`flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all relative ${
                activeConfigTab === 'task'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Task &amp; Notification</span>
              {notificationConfig.enabled && permissionState === 'granted' && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </button>
          </div>

          {/* TAB 1: CURRICULUM CONFIGURATION */}
          {activeConfigTab === 'curriculum' && (
            <div className="space-y-2 animate-fade-in">
              {/* Header info */}
              <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <BookOpen className="w-3.5 h-3.5" />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                      Curriculum Presets
                    </h4>
                    <p className="text-[10px] text-slate-400">
                      Ganti atau kelola kurikulum akademik
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">
                  {presets.length} Preset
                </span>
              </div>

              {/* Submenu: Preset (Switch curriculum) */}
              <div className="px-1">
                <div className="flex items-center justify-between mb-1 px-1">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
                    <Layers className="w-3.5 h-3.5 text-blue-500" />
                    <span>Pilih Kurikulum</span>
                  </span>
                </div>

                {/* List of curriculums */}
                <div className="space-y-1 max-h-40 overflow-y-auto pr-0.5">
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
              <div className="space-y-1 p-0.5">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onOpenManageModal('presets');
                  }}
                  className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors flex items-center justify-between gap-2 text-slate-700 dark:text-slate-200 group"
                >
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                    </span>
                    <div>
                      <div className="text-xs font-semibold">Manage Curriculums</div>
                      <div className="text-[10px] text-slate-400">Tambah, hapus, atau ubah kurikulum &amp; mata kuliah</div>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors flex items-center justify-between gap-2 text-slate-700 dark:text-slate-200 group"
                >
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                      <Upload className="w-3.5 h-3.5" />
                    </span>
                    <div>
                      <div className="text-xs font-semibold">Import JSON</div>
                      <div className="text-[10px] text-slate-400">Impor kurikulum dari file eksternal</div>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </button>

                <button
                  onClick={() => {
                    onExportPreset(activePreset);
                    showToast(`Kurikulum diekspor ke file JSON`);
                  }}
                  className="w-full text-left px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors flex items-center justify-between gap-2 text-slate-700 dark:text-slate-200 group"
                >
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <Download className="w-3.5 h-3.5" />
                    </span>
                    <div>
                      <div className="text-xs font-semibold">Export JSON</div>
                      <div className="text-[10px] text-slate-400">Ekspor seluruh mata kuliah aktif</div>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: TASK -> NOTIFICATION CONFIGURATION */}
          {activeConfigTab === 'task' && (
            <div className="space-y-3 animate-fade-in">
              {/* Breadcrumb Header: Configuration -> Task -> Notification */}
              <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                  <span>Configuration</span>
                  <span>&gt;</span>
                  <span className="text-blue-500">Task</span>
                  <span>&gt;</span>
                  <span className="text-emerald-500 font-bold">Notification</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-emerald-500" />
                    Task Due Notification Engine
                  </h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-mono">
                    OS Background
                  </span>
                </div>
              </div>

              {/* 1. Permission Access Feature Card */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Status Izin Browser / OS</span>
                  </span>

                  {permissionState === 'granted' ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Granted (Aktif)
                    </span>
                  ) : permissionState === 'denied' ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3 text-rose-500" />
                      Denied (Diblokir)
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      Belum Diizinkan
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  {permissionState === 'granted'
                    ? 'Aplikasi memiliki izin resmi untuk mengirimkan pemberitahuan ke Action Center / Desktop OS.'
                    : permissionState === 'denied'
                    ? 'Izin notifikasi diblokir oleh browser. Klik ikon gembok/setelan situs di URL bar untuk mengizinkan.'
                    : 'Izinkan peramban agar SIA-Orbit dapat memunculkan pengingat deadline tugas di desktop OS.'}
                </p>

                {permissionState !== 'granted' && (
                  <button
                    onClick={handleRequestPermission}
                    disabled={isRequestingPermission}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-all"
                  >
                    <BellRing className="w-3.5 h-3.5" />
                    <span>{isRequestingPermission ? 'Menunggu Izin...' : 'Minta Izin Notifikasi (Request Permission)'}</span>
                  </button>
                )}
              </div>

              {/* 2. Notification Toggle & Due Timing Card */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 space-y-3">
                
                {/* Enable / Disable Switch */}
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer">
                      {notificationConfig.enabled ? (
                        <Bell className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <BellOff className="w-3.5 h-3.5 text-slate-400" />
                      )}
                      <span>Aktifkan Pengingat Tenggat Tugas</span>
                    </label>
                    <p className="text-[10px] text-slate-400">
                      Notifikasi otomatis ketika batas waktu tugas mendekat
                    </p>
                  </div>

                  {/* iOS Style Switch */}
                  <button
                    role="switch"
                    aria-checked={notificationConfig.enabled}
                    onClick={() => handleToggleNotification(!notificationConfig.enabled)}
                    className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      notificationConfig.enabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        notificationConfig.enabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Timing Config: Appear in minutes */}
                {notificationConfig.enabled && (
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-blue-500" />
                        <span>Muncul Sebelum Tenggat (In Minutes):</span>
                      </span>
                      <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        {notificationConfig.reminderMinutes} Menit
                      </span>
                    </div>

                    {/* Quick Preset Pills */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[
                        { label: '15m', val: 15 },
                        { label: '30m', val: 30 },
                        { label: '60m (1j)', val: 60 },
                        { label: '120m (2j)', val: 120 },
                        { label: '1440m (24j)', val: 1440 },
                      ].map((preset) => (
                        <button
                          key={preset.val}
                          onClick={() => handleSetReminderMinutes(preset.val)}
                          className={`text-[10px] font-mono px-2 py-1 rounded-lg border transition-all ${
                            notificationConfig.reminderMinutes === preset.val
                              ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    {/* Custom Input */}
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[10px] text-slate-400">Kustom:</span>
                      <input
                        type="number"
                        min="1"
                        max="10080"
                        value={notificationConfig.reminderMinutes}
                        onChange={(e) => handleSetReminderMinutes(parseInt(e.target.value) || 1)}
                        className="w-24 text-xs font-mono px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <span className="text-[10px] text-slate-400">menit sebelum deadline</span>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Background Service Telemetry & Testing Actions */}
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span>Background Service Aktif</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    Interval: 30 detik
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleTestNotification}
                    disabled={isTestingNotification}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-all disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                    <span>{isTestingNotification ? 'Mengirim...' : 'Kirim Notifikasi Uji Coba'}</span>
                  </button>

                  <button
                    onClick={handleResetHistory}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                    title="Reset Riwayat Notifikasi Terkirim"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

            </div>
          )}

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
