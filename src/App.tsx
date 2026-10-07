import React, { useState, useEffect, useMemo } from 'react';
import type { Course, Assignment, GroupDeliverable, CourseGrade, CourseStatus, AssignmentStatus, CacheDiagnostics } from './types';
import { INITIAL_COURSES, INITIAL_ASSIGNMENTS, INITIAL_GROUP_DELIVERABLES, GRADE_POINT_MAP } from './data/curriculumData';
import { Header } from './components/Header';
import { CurriculumExplorer } from './components/CurriculumExplorer';
import { AssignmentMatrix } from './components/AssignmentMatrix';
import { UpdateNotificationToast } from './components/UpdateNotificationToast';
import { SystemDiagnosticsModal } from './components/SystemDiagnosticsModal';
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

  // Curriculum courses state with LocalStorage persistence
  const [courses, setCourses] = useState<Course[]>(() => {
    try {
      const saved = localStorage.getItem('sia_orbit_courses');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed reading courses from localStorage', e);
    }
    return INITIAL_COURSES;
  });

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

  // Persist courses when modified
  const handleUpdateCourseStatus = (courseId: string, status: CourseStatus, grade?: CourseGrade) => {
    setCourses((prevCourses) => {
      const updated = prevCourses.map((c) => {
        if (c.id === courseId) {
          return {
            ...c,
            status,
            grade: status === 'completed' ? (grade || c.grade || 'A') : undefined,
          };
        }
        return c;
      });
      localStorage.setItem('sia_orbit_courses', JSON.stringify(updated));
      return updated;
    });
  };

  const handleResetCurriculum = () => {
    if (window.confirm('Reset rencana kurikulum ke konfigurasi standar contoh UNSIA?')) {
      setCourses(INITIAL_COURSES);
      localStorage.setItem('sia_orbit_courses', JSON.stringify(INITIAL_COURSES));
    }
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
    return { passedSks, totalTargetSks: 144, gpa };
  }, [courses]);

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
      />

      {/* App Body Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'curriculum' ? (
          <CurriculumExplorer
            courses={courses}
            onUpdateCourseStatus={handleUpdateCourseStatus}
            onResetCurriculum={handleResetCurriculum}
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

    </div>
  );
};

export default App;
