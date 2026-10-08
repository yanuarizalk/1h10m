import React from 'react';
import type { CurriculumPreset, TaskNotificationConfig, GradeThreshold } from '../types';
import { ConfigurationMenu } from './ConfigurationMenu';
import { 
  Compass, 
  Moon, 
  Sun, 
  Wifi, 
  WifiOff, 
  Activity, 
  BookOpen, 
  CheckSquare, 
  Sparkles, 
  Download
} from 'lucide-react';

interface HeaderProps {
  activeTab: 'curriculum' | 'assignments';
  setActiveTab: (tab: 'curriculum' | 'assignments') => void;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  isOnline: boolean;
  onOpenDiagnostics: () => void;
  passedSks: number;
  totalTargetSks: number;
  gpa: number;
  presets: CurriculumPreset[];
  activePresetId: string;
  onSwitchPreset: (presetId: string) => void;
  onOpenManageModal: (initialTab?: 'presets' | 'courses') => void;
  onImportPreset: (preset: CurriculumPreset) => void;
  onExportPreset: (preset: CurriculumPreset) => void;
  notificationConfig: TaskNotificationConfig;
  onUpdateNotificationConfig: (config: TaskNotificationConfig) => void;
  gradeThresholds: GradeThreshold[];
  onUpdateGradeThresholds: (thresholds: GradeThreshold[]) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isDarkMode,
  setIsDarkMode,
  isOnline,
  onOpenDiagnostics,
  passedSks,
  totalTargetSks,
  gpa,
  presets,
  activePresetId,
  onSwitchPreset,
  onOpenManageModal,
  onImportPreset,
  onExportPreset,
  notificationConfig,
  onUpdateNotificationConfig,
  gradeThresholds,
  onUpdateGradeThresholds,
}) => {
  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);

  React.useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-[#090d16]/90 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & University Tag */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-emerald-500 to-cyan-400 p-0.5 shadow-md shadow-emerald-500/10">
              <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center text-white">
                <Compass className="w-5 h-5 text-emerald-400 animate-spin-slow" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isOnline ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-3 w-3 ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 via-emerald-500 to-cyan-500 bg-clip-text text-transparent">
                  SIA-Orbit
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  UNSIA PJJ
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                Curriculum Roadmap &amp; Offline Study Matrix
              </p>
            </div>
          </div>

          {/* Center Navigation Tabs */}
          <nav className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
            <button
              id="nav-curriculum-tab"
              onClick={() => setActiveTab('curriculum')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                activeTab === 'curriculum'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span className="hidden xs:inline">Curriculum Matrix</span>
              <span className="xs:hidden">Curriculum</span>
            </button>

            <button
              id="nav-assignments-tab"
              onClick={() => setActiveTab('assignments')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                activeTab === 'assignments'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              <span className="hidden xs:inline">PJJ Assignments</span>
              <span className="xs:hidden">Tasks</span>
            </button>
          </nav>

          {/* Right Action Toolbar */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Quick SKS Badge */}
            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 text-xs border border-slate-200 dark:border-slate-800 font-mono">
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
              <span>{passedSks}/{totalTargetSks} SKS</span>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">IPK {gpa.toFixed(2)}</span>
            </div>

            {/* Diagnostics Trigger Badge */}
            <button
              id="btn-open-diagnostics"
              onClick={onOpenDiagnostics}
              title="View Cache & System Diagnostics"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-800 bg-slate-100/80 hover:bg-slate-200/80 dark:bg-slate-900/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
            >
              {isOnline ? (
                <Wifi className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
              )}
              <Activity className="w-3.5 h-3.5 text-blue-500 hidden sm:inline" />
              <span className="hidden md:inline font-mono">Diagnostics</span>
            </button>

            {/* PWA Install Button (if available) */}
            {deferredPrompt && (
              <button
                onClick={handleInstallClick}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all"
                title="Install SIA-Orbit to your device"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Install App</span>
              </button>
            )}

            {/* Configuration (Cog Icon) Menu beside left of dark/light mode */}
            <ConfigurationMenu
              presets={presets}
              activePresetId={activePresetId}
              onSwitchPreset={onSwitchPreset}
              onOpenManageModal={onOpenManageModal}
              onImportPreset={onImportPreset}
              onExportPreset={onExportPreset}
              notificationConfig={notificationConfig}
              onUpdateNotificationConfig={onUpdateNotificationConfig}
              gradeThresholds={gradeThresholds}
              onUpdateGradeThresholds={onUpdateGradeThresholds}
            />

            {/* Dark / Light Mode Switch */}
            <button
              id="btn-theme-toggle"
              onClick={() => setIsDarkMode(!isDarkMode)}
              aria-label="Toggle Theme"
              className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200/50 dark:border-slate-800/50"
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </button>

          </div>

        </div>
      </div>
    </header>
  );
};
