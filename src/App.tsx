import React, { useState, useEffect, useMemo } from 'react';
import type { 
  Course, 
  Assignment, 
  GroupDeliverable, 
  CourseGrade, 
  CourseStatus, 
  AssignmentStatus, 
  CacheDiagnostics, 
  CurriculumPreset,
  TaskNotificationConfig
} from './types';
import { INITIAL_COURSES, INITIAL_ASSIGNMENTS, INITIAL_GROUP_DELIVERABLES, GRADE_POINT_MAP, DEFAULT_CURRICULUM_PRESETS } from './data/curriculumData';
import { Header } from './components/Header';
import { CurriculumExplorer } from './components/CurriculumExplorer';
import { AssignmentMatrix } from './components/AssignmentMatrix';
import { UpdateNotificationToast } from './components/UpdateNotificationToast';
import { SystemDiagnosticsModal } from './components/SystemDiagnosticsModal';
import { CurriculumManageModal } from './components/CurriculumManageModal';
import { ImportConflictModal } from './components/ImportConflictModal';
import { downloadCurriculumJson } from './utils/curriculumIO';
import { 
  getTaskNotificationConfig, 
  saveTaskNotificationConfig, 
  checkDueTasksAndNotify 
} from './utils/taskNotificationService';
import { getCacheDiagnostics, applyUpdateAndReload } from './serviceWorkerRegistration';
import { WifiOff, ShieldCheck } from 'lucide-react';

export const App: React.FC = () => {
  // Theme state with local persistence
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('sia_orbit_theme');
    if (saved !== null) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Tab navigation state
  const [activeTab, setActiveTab] = useState<'curriculum' | 'assignments'>('curriculum');

  // Online connectivity state
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });

  // Diagnostics modal state
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);
  const [diagnosticsData, setDiagnosticsData] = useState<CacheDiagnostics | null>(null);

  // Service worker update notification state
  const [isUpdateAvailable, setIsUpdateAvailable] = useState<boolean>(false);
  const [isDownloadingUpdate, setIsDownloadingUpdate] = useState<boolean>(false);

  // Curriculum Presets state with LocalStorage persistence
  const [presets, setPresets] = useState<CurriculumPreset[]>(() => {
    try {
      const saved = localStorage.getItem('sia_orbit_curriculum_presets');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      // Migrate from legacy sia_orbit_courses if exists
      const legacyCourses = localStorage.getItem('sia_orbit_courses');
      if (legacyCourses) {
        const parsedLegacy = JSON.parse(legacyCourses);
        if (Array.isArray(parsedLegacy) && parsedLegacy.length > 0) {
          return [
            {
              ...DEFAULT_CURRICULUM_PRESETS[0],
              courses: parsedLegacy,
            },
            ...DEFAULT_CURRICULUM_PRESETS.slice(1),
          ];
        }
      }
    } catch (e) {
      console.error('Failed reading curriculum presets from localStorage', e);
    }
    return DEFAULT_CURRICULUM_PRESETS;
  });

  // Active Curriculum Preset ID with LocalStorage persistence
  const [activePresetId, setActivePresetId] = useState<string>(() => {
    try {
      const savedId = localStorage.getItem('sia_orbit_active_curriculum_preset_id');
      if (savedId) return savedId;
    } catch (e) {
      console.error('Failed reading active preset ID from localStorage', e);
    }
    return DEFAULT_CURRICULUM_PRESETS[0].id;
  });

  // Curriculum Manage Modal state
  const [showManageModal, setShowManageModal] = useState<boolean>(false);
  const [manageModalTab, setManageModalTab] = useState<'presets' | 'courses'>('presets');

  // Import Conflict Prompt state
  const [importConflict, setImportConflict] = useState<{
    imported: CurriculumPreset;
    existing: CurriculumPreset;
  } | null>(null);

  // Active preset & courses memo
  const activePreset = useMemo(() => {
    return presets.find(p => p.id === activePresetId) || presets[0] || DEFAULT_CURRICULUM_PRESETS[0];
  }, [presets, activePresetId]);

  const courses = activePreset.courses;

  // Assignments state with LocalStorage persistence
  const [assignments, setAssignments] = useState<Assignment[]>(() => {
    try {
      const saved = localStorage.getItem('sia_orbit_assignments');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed reading assignments from localStorage', e);
    }
    return INITIAL_ASSIGNMENTS;
  });

  // Group Deliverables state with LocalStorage persistence
  const [groupDeliverables, setGroupDeliverables] = useState<GroupDeliverable[]>(() => {
    try {
      const saved = localStorage.getItem('sia_orbit_groups');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed reading groups from localStorage', e);
    }
    return INITIAL_GROUP_DELIVERABLES;
  });

  // Task Notification configuration state with LocalStorage persistence
  const [notificationConfig, setNotificationConfig] = useState<TaskNotificationConfig>(() => {
    return getTaskNotificationConfig();
  });

  const handleUpdateNotificationConfig = (newConfig: TaskNotificationConfig) => {
    setNotificationConfig(newConfig);
    saveTaskNotificationConfig(newConfig);
  };

  // Background Service: Automatically inspect due tasks and trigger OS notifications
  useEffect(() => {
    // Run initial inspection
    checkDueTasksAndNotify(assignments, notificationConfig, () => {
      setActiveTab('assignments');
    });

    // Run background interval check every 30 seconds
    const intervalId = window.setInterval(() => {
      checkDueTasksAndNotify(assignments, notificationConfig, () => {
        setActiveTab('assignments');
      });
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [assignments, notificationConfig]);

  // Sync theme to <html> tag
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('sia_orbit_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('sia_orbit_theme', 'light');
    }
  }, [isDarkMode]);

  // Online / Offline window listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      fetchDiagnostics();
    };
    const handleOffline = () => {
      setIsOnline(false);
      fetchDiagnostics();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial diagnostics fetch
    fetchDiagnostics();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Listen for custom SW update events triggered by serviceWorkerRegistration
  useEffect(() => {
    const handleSWUpdate = () => {
      setIsUpdateAvailable(true);
      setIsDownloadingUpdate(false);
    };
    const handleSWDownloading = () => {
      setIsDownloadingUpdate(true);
    };

    window.addEventListener('sia-orbit-sw-update', handleSWUpdate);
    window.addEventListener('sia-orbit-sw-downloading', handleSWDownloading);

    return () => {
      window.removeEventListener('sia-orbit-sw-update', handleSWUpdate);
      window.removeEventListener('sia-orbit-sw-downloading', handleSWDownloading);
    };
  }, []);

  // Save presets helper
  const savePresets = (newPresets: CurriculumPreset[]) => {
    setPresets(newPresets);
    try {
      localStorage.setItem('sia_orbit_curriculum_presets', JSON.stringify(newPresets));
    } catch (e) {
      console.error('Failed saving curriculum presets to localStorage', e);
    }
  };

  const handleSwitchPreset = (presetId: string) => {
    setActivePresetId(presetId);
    try {
      localStorage.setItem('sia_orbit_active_curriculum_preset_id', presetId);
    } catch (e) {
      console.error('Failed saving active preset ID to localStorage', e);
    }
  };

  // Persist course status update to active preset
  const handleUpdateCourseStatus = (courseId: string, status: CourseStatus, grade?: CourseGrade) => {
    const updatedPresets = presets.map((p) => {
      if (p.id === activePreset.id) {
        const updatedCourses = p.courses.map((c) => {
          if (c.id === courseId) {
            return {
              ...c,
              status,
              grade: status === 'completed' ? (grade || c.grade || 'A') : undefined,
            };
          }
          return c;
        });
        return {
          ...p,
          courses: updatedCourses,
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    });
    savePresets(updatedPresets);
  };

  const handleResetCurriculum = () => {
    if (window.confirm(`Reset rencana kurikulum "${activePreset.name}" ke konfigurasi standar contoh UNSIA?`)) {
      const updatedPresets = presets.map((p) => {
        if (p.id === activePreset.id) {
          return {
            ...p,
            courses: INITIAL_COURSES,
            updatedAt: new Date().toISOString(),
          };
        }
        return p;
      });
      savePresets(updatedPresets);
    }
  };

  // Preset CRUD Handlers
  const handleAddPreset = (newPreset: CurriculumPreset) => {
    const updated = [...presets, newPreset];
    savePresets(updated);
    handleSwitchPreset(newPreset.id);
  };

  const handleUpdatePreset = (updatedPreset: CurriculumPreset) => {
    const updated = presets.map(p => p.id === updatedPreset.id ? updatedPreset : p);
    savePresets(updated);
  };

  const handleDeletePreset = (presetId: string) => {
    if (presets.length <= 1) return;
    const updated = presets.filter(p => p.id !== presetId);
    savePresets(updated);
    if (activePresetId === presetId) {
      handleSwitchPreset(updated[0].id);
    }
  };

  const handleImportCurriculum = (importedPreset: CurriculumPreset) => {
    // Check if a preset with the same name already exists (case-insensitive & trimmed)
    const existingByName = presets.find(
      p => p.name.trim().toLowerCase() === importedPreset.name.trim().toLowerCase()
    );

    if (existingByName) {
      setImportConflict({
        imported: importedPreset,
        existing: existingByName,
      });
      return;
    }

    // No conflict: add as new preset
    const uniqueId = presets.some(p => p.id === importedPreset.id)
      ? `preset-${Date.now()}`
      : importedPreset.id;

    const newPreset: CurriculumPreset = {
      ...importedPreset,
      id: uniqueId,
      updatedAt: new Date().toISOString(),
    };

    const updated = [...presets, newPreset];
    savePresets(updated);
    handleSwitchPreset(newPreset.id);
  };

  const handleConfirmReplaceImport = () => {
    if (!importConflict) return;
    const { imported, existing } = importConflict;

    const updated = presets.map((p) => {
      if (p.id === existing.id) {
        return {
          ...imported,
          id: existing.id,
          name: existing.name, // keep original preset name casing/format
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    });

    savePresets(updated);
    handleSwitchPreset(existing.id);
    setImportConflict(null);
  };

  const handleConfirmSaveAsNewImport = () => {
    if (!importConflict) return;
    const { imported } = importConflict;

    // Generate unique name e.g. "Nama (Imported)" or "Nama (Imported 2)"
    let newName = `${imported.name} (Imported)`;
    let counter = 1;
    while (presets.some(p => p.name.trim().toLowerCase() === newName.trim().toLowerCase())) {
      counter++;
      newName = `${imported.name} (Imported ${counter})`;
    }

    const newPreset: CurriculumPreset = {
      ...imported,
      id: `preset-${Date.now()}`,
      name: newName,
      updatedAt: new Date().toISOString(),
    };

    const updated = [...presets, newPreset];
    savePresets(updated);
    handleSwitchPreset(newPreset.id);
    setImportConflict(null);
  };

  const handleCancelImportConflict = () => {
    setImportConflict(null);
  };

  const handleExportCurriculum = (presetToExport: CurriculumPreset) => {
    downloadCurriculumJson(presetToExport);
  };

  // Course CRUD Handlers for active preset
  const handleAddCourse = (course: Course) => {
    const updatedPresets = presets.map((p) => {
      if (p.id === activePreset.id) {
        return {
          ...p,
          courses: [...p.courses, course],
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    });
    savePresets(updatedPresets);
  };

  const handleUpdateCourse = (course: Course) => {
    const updatedPresets = presets.map((p) => {
      if (p.id === activePreset.id) {
        return {
          ...p,
          courses: p.courses.map(c => c.id === course.id ? course : c),
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    });
    savePresets(updatedPresets);
  };

  const handleDeleteCourse = (courseId: string) => {
    const updatedPresets = presets.map((p) => {
      if (p.id === activePreset.id) {
        return {
          ...p,
          courses: p.courses.filter(c => c.id !== courseId),
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    });
    savePresets(updatedPresets);
  };

  // Assignment handlers
  const handleAddAssignment = (newAsg: Omit<Assignment, 'id' | 'createdAt'>) => {
    const item: Assignment = {
      ...newAsg,
      id: `asg-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setAssignments((prev) => {
      const updated = [item, ...prev];
      localStorage.setItem('sia_orbit_assignments', JSON.stringify(updated));
      return updated;
    });
  };

  const handleUpdateAssignmentStatus = (id: string, status: AssignmentStatus) => {
    setAssignments((prev) => {
      const updated = prev.map((a) => (a.id === id ? { ...a, status } : a));
      localStorage.setItem('sia_orbit_assignments', JSON.stringify(updated));
      return updated;
    });
  };

  const handleDeleteAssignment = (id: string) => {
    setAssignments((prev) => {
      const updated = prev.filter((a) => a.id !== id);
      localStorage.setItem('sia_orbit_assignments', JSON.stringify(updated));
      return updated;
    });
  };

  // Group Deliverable handlers
  const handleSaveGroupDeliverable = (group: GroupDeliverable) => {
    setGroupDeliverables((prev) => {
      const exists = prev.some((g) => g.id === group.id);
      const updated = exists ? prev.map((g) => (g.id === group.id ? group : g)) : [group, ...prev];
      localStorage.setItem('sia_orbit_groups', JSON.stringify(updated));
      return updated;
    });
  };

  const handleDeleteGroupDeliverable = (id: string) => {
    setGroupDeliverables((prev) => {
      const updated = prev.filter((g) => g.id !== id);
      localStorage.setItem('sia_orbit_groups', JSON.stringify(updated));
      return updated;
    });
  };

  // Diagnostics fetch helper
  const fetchDiagnostics = async () => {
    try {
      const info = await getCacheDiagnostics();
      setDiagnosticsData(info);
    } catch (e) {
      console.warn('Diagnostics query error', e);
    }
  };

  // Academic summary calculation for Header
  const summaryStats = useMemo(() => {
    let passedSks = 0;
    let totalGradePoints = 0;
    let gradedSks = 0;

    courses.forEach((c) => {
      if (c.status === 'completed') {
        passedSks += c.sks;
        const pts = c.grade ? GRADE_POINT_MAP[c.grade] ?? 4.0 : 4.0;
        totalGradePoints += pts * c.sks;
        gradedSks += c.sks;
      }
    });

    const gpa = gradedSks > 0 ? totalGradePoints / gradedSks : 0.0;
    return { passedSks, totalTargetSks: activePreset.targetSks || 144, gpa };
  }, [courses, activePreset]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#090d16] text-slate-800 dark:text-slate-100 selection:bg-emerald-500 selection:text-white">
      
      {/* Ambient Offline Banner (Requirement 2.2) */}
      {!isOnline && (
        <div 
          role="status"
          className="sticky top-0 z-50 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white text-xs font-semibold py-2 px-4 shadow-md flex items-center justify-center gap-2"
        >
          <WifiOff className="w-4 h-4 animate-pulse" />
          <span>
            Offline Mode Active — All data is securely loaded from your local browser cache.
          </span>
          <button
            onClick={() => {
              setShowDiagnostics(true);
              fetchDiagnostics();
            }}
            className="ml-2 underline text-[11px] font-bold text-amber-100 hover:text-white"
          >
            Diagnostics
          </button>
        </div>
      )}

      {/* Main Navbar Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        isOnline={isOnline}
        onOpenDiagnostics={() => {
          fetchDiagnostics();
          setShowDiagnostics(true);
        }}
        passedSks={summaryStats.passedSks}
        totalTargetSks={summaryStats.totalTargetSks}
        gpa={summaryStats.gpa}
        presets={presets}
        activePresetId={activePresetId}
        onSwitchPreset={handleSwitchPreset}
        onOpenManageModal={(tab) => {
          setManageModalTab(tab || 'presets');
          setShowManageModal(true);
        }}
        onImportPreset={handleImportCurriculum}
        onExportPreset={handleExportCurriculum}
        notificationConfig={notificationConfig}
        onUpdateNotificationConfig={handleUpdateNotificationConfig}
      />

      {/* App Body Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'curriculum' ? (
          <CurriculumExplorer
            courses={courses}
            onUpdateCourseStatus={handleUpdateCourseStatus}
            onResetCurriculum={handleResetCurriculum}
            curriculumName={activePreset.name}
            targetSks={activePreset.targetSks || 144}
          />
        ) : (
          <AssignmentMatrix
            assignments={assignments}
            onAddAssignment={handleAddAssignment}
            onUpdateAssignmentStatus={handleUpdateAssignmentStatus}
            onDeleteAssignment={handleDeleteAssignment}
            groupDeliverables={groupDeliverables}
            onSaveGroupDeliverable={handleSaveGroupDeliverable}
            onDeleteGroupDeliverable={handleDeleteGroupDeliverable}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800/80 bg-white/50 dark:bg-[#060910]/50 py-8 text-xs text-slate-500 dark:text-slate-400 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
              Ω
            </div>
            <div>
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                SIA-Orbit — UNSIA PJJ Distance Learning Hub
              </p>
              <p className="text-[11px] text-slate-400">
                Program Studi Sistem Informasi (S1) • Universitas Siber Asia (UNSIA)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <button
              onClick={() => {
                fetchDiagnostics();
                setShowDiagnostics(true);
              }}
              className="hover:underline flex items-center gap-1 text-blue-600 dark:text-emerald-400"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>System &amp; Cache Diagnostics</span>
            </button>
            <span>•</span>
            <span className="font-mono text-slate-400">Cloudflare Pages Edge Ready</span>
            <span>•</span>
            <span className="font-mono">100% Client-Side PWA</span>
          </div>
        </div>
      </footer>

      {/* Floating Service Worker Update Toast */}
      <UpdateNotificationToast
        isUpdateAvailable={isUpdateAvailable}
        isDownloadingUpdate={isDownloadingUpdate}
        onReload={() => applyUpdateAndReload()}
        onDismiss={() => setIsUpdateAvailable(false)}
      />

      {/* System Diagnostics Transparency Modal */}
      <SystemDiagnosticsModal
        isOpen={showDiagnostics}
        onClose={() => setShowDiagnostics(false)}
        diagnostics={diagnosticsData}
        onRefreshDiagnostics={fetchDiagnostics}
      />

      {/* Curriculum & Presets Management Modal */}
      <CurriculumManageModal
        isOpen={showManageModal}
        onClose={() => setShowManageModal(false)}
        presets={presets}
        activePresetId={activePresetId}
        onSwitchPreset={handleSwitchPreset}
        onAddPreset={handleAddPreset}
        onUpdatePreset={handleUpdatePreset}
        onDeletePreset={handleDeletePreset}
        onAddCourse={handleAddCourse}
        onUpdateCourse={handleUpdateCourse}
        onDeleteCourse={handleDeleteCourse}
        onImportCurriculum={handleImportCurriculum}
        onExportCurriculum={handleExportCurriculum}
        initialTab={manageModalTab}
      />

      {/* Curriculum Import Conflict Dialog */}
      <ImportConflictModal
        isOpen={importConflict !== null}
        existingPreset={importConflict?.existing || null}
        importedPreset={importConflict?.imported || null}
        onReplace={handleConfirmReplaceImport}
        onSaveAsNew={handleConfirmSaveAsNewImport}
        onCancel={handleCancelImportConflict}
      />

    </div>
  );
};

export default App;
