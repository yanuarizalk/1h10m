import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Course, CurriculumPreset, CourseCategory, CourseStatus } from '../types';
import { parseCurriculumJson } from '../utils/curriculumIO';
import { 
  X, 
  Plus, 
  Trash2, 
  Edit3, 
  Copy, 
  Check, 
  Download, 
  Upload, 
  Layers, 
  BookOpen, 
  Search
} from 'lucide-react';

interface CurriculumManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  presets: CurriculumPreset[];
  activePresetId: string;
  onSwitchPreset: (presetId: string) => void;
  onAddPreset: (newPreset: CurriculumPreset) => void;
  onUpdatePreset: (updatedPreset: CurriculumPreset) => void;
  onDeletePreset: (presetId: string) => void;
  onAddCourse: (course: Course) => void;
  onUpdateCourse: (course: Course) => void;
  onDeleteCourse: (courseId: string) => void;
  onImportCurriculum: (preset: CurriculumPreset) => void;
  onExportCurriculum: (preset: CurriculumPreset) => void;
  initialTab?: 'presets' | 'courses';
}

const CATEGORIES: CourseCategory[] = [
  'Foundation',
  'Algorithms',
  'Database',
  'Backend',
  'Web Engineering',
  'Enterprise Systems',
  'Cyber Security',
  'Capstone',
  'General',
];

export const CurriculumManageModal: React.FC<CurriculumManageModalProps> = ({
  isOpen,
  onClose,
  presets,
  activePresetId,
  onSwitchPreset,
  onAddPreset,
  onUpdatePreset,
  onDeletePreset,
  onAddCourse,
  onUpdateCourse,
  onDeleteCourse,
  onImportCurriculum,
  onExportCurriculum,
  initialTab = 'presets',
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'courses'>(initialTab);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Active preset
  const activePreset = useMemo(() => {
    return presets.find(p => p.id === activePresetId) || presets[0];
  }, [presets, activePresetId]);

  // Preset Form State (Create / Edit)
  const [showPresetForm, setShowPresetForm] = useState(false);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [presetFormName, setPresetFormName] = useState('');
  const [presetFormDesc, setPresetFormDesc] = useState('');
  const [presetFormTargetSks, setPresetFormTargetSks] = useState(144);
  const [presetFormTemplateSource, setPresetFormTemplateSource] = useState<'active' | 'empty'>('active');

  // Course Form State (Create / Edit)
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [courseFormCode, setCourseFormCode] = useState('');
  const [courseFormTitle, setCourseFormTitle] = useState('');
  const [courseFormTitleEn, setCourseFormTitleEn] = useState('');
  const [courseFormSks, setCourseFormSks] = useState(3);
  const [courseFormSemester, setCourseFormSemester] = useState(1);
  const [courseFormCategory, setCourseFormCategory] = useState<CourseCategory>('Foundation');
  const [courseFormPrereqs, setCourseFormPrereqs] = useState<string[]>([]);
  const [courseFormDesc, setCourseFormDesc] = useState('');
  const [courseFormTip, setCourseFormTip] = useState('');

  // Course filters
  const [courseSearch, setCourseSearch] = useState('');
  const [selectedSemesterFilter, setSelectedSemesterFilter] = useState<number | 'all'>('all');

  // Filtered courses in active preset
  const filteredCourses = useMemo(() => {
    return activePreset.courses.filter(c => {
      const matchSearch = courseSearch === '' || 
        c.code.toLowerCase().includes(courseSearch.toLowerCase()) ||
        c.title.toLowerCase().includes(courseSearch.toLowerCase());
      const matchSemester = selectedSemesterFilter === 'all' || c.semester === selectedSemesterFilter;
      return matchSearch && matchSemester;
    });
  }, [activePreset.courses, courseSearch, selectedSemesterFilter]);

  // Refs for scrolling & focusing forms
  const courseFormRef = useRef<HTMLDivElement>(null);
  const courseCodeInputRef = useRef<HTMLInputElement>(null);
  const presetFormRef = useRef<HTMLDivElement>(null);
  const presetNameInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll and focus to course form when opened (especially when editing a course)
  useEffect(() => {
    if (showCourseForm) {
      const timer = setTimeout(() => {
        if (courseFormRef.current) {
          courseFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        if (courseCodeInputRef.current) {
          courseCodeInputRef.current.focus({ preventScroll: true });
          courseCodeInputRef.current.select();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [showCourseForm, editingCourseId]);

  // Auto-scroll and focus to preset form when opened
  useEffect(() => {
    if (showPresetForm) {
      const timer = setTimeout(() => {
        if (presetFormRef.current) {
          presetFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        if (presetNameInputRef.current) {
          presetNameInputRef.current.focus({ preventScroll: true });
          presetNameInputRef.current.select();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [showPresetForm, editingPresetId]);

  const showToast = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  if (!isOpen) return null;

  // Handlers for Preset Management
  const handleOpenAddPreset = () => {
    setEditingPresetId(null);
    setPresetFormName('');
    setPresetFormDesc('');
    setPresetFormTargetSks(144);
    setPresetFormTemplateSource('active');
    setShowPresetForm(true);
  };

  const handleOpenEditPreset = (p: CurriculumPreset) => {
    setEditingPresetId(p.id);
    setPresetFormName(p.name);
    setPresetFormDesc(p.description || '');
    setPresetFormTargetSks(p.targetSks || 144);
    setShowPresetForm(true);
  };

  const handleSavePresetForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!presetFormName.trim()) return;

    if (editingPresetId) {
      const existing = presets.find(p => p.id === editingPresetId);
      if (existing) {
        onUpdatePreset({
          ...existing,
          name: presetFormName.trim(),
          description: presetFormDesc.trim(),
          targetSks: Number(presetFormTargetSks) || 144,
          updatedAt: new Date().toISOString(),
        });
        showToast(`Preset "${presetFormName.trim()}" diperbarui`);
      }
    } else {
      const sourceCourses = presetFormTemplateSource === 'active' ? activePreset.courses : [];
      const newPreset: CurriculumPreset = {
        id: `preset-${Date.now()}`,
        name: presetFormName.trim(),
        description: presetFormDesc.trim(),
        targetSks: Number(presetFormTargetSks) || 144,
        courses: sourceCourses.map(c => ({ ...c, id: `c-${Date.now()}-${Math.random().toString(36).substring(2, 6)}` })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      onAddPreset(newPreset);
      showToast(`Kurikulum baru "${newPreset.name}" dibuat`);
    }
    setShowPresetForm(false);
  };

  const handleDuplicatePreset = (p: CurriculumPreset) => {
    const clone: CurriculumPreset = {
      id: `preset-${Date.now()}`,
      name: `${p.name} (Salinan)`,
      description: p.description ? `Salinan dari: ${p.description}` : '',
      targetSks: p.targetSks || 144,
      courses: p.courses.map(c => ({ ...c, id: `c-${Date.now()}-${Math.random().toString(36).substring(2, 6)}` })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onAddPreset(clone);
    showToast(`Kurikulum "${clone.name}" diduplikasi`);
  };

  const handleDeletePresetClick = (p: CurriculumPreset) => {
    if (presets.length <= 1) {
      alert('Tidak dapat menghapus kurikulum terakhir. Minimal harus ada 1 kurikulum.');
      return;
    }
    if (window.confirm(`Hapus kurikulum "${p.name}"? Tindakan ini tidak dapat dibatalkan.`)) {
      onDeletePreset(p.id);
      showToast(`Kurikulum "${p.name}" dihapus`);
    }
  };

  // Handlers for Course Management in Active Preset
  const handleOpenAddCourse = () => {
    setEditingCourseId(null);
    setCourseFormCode('');
    setCourseFormTitle('');
    setCourseFormTitleEn('');
    setCourseFormSks(3);
    setCourseFormSemester(1);
    setCourseFormCategory('Foundation');
    setCourseFormPrereqs([]);
    setCourseFormDesc('');
    setCourseFormTip('');
    setShowCourseForm(true);

    requestAnimationFrame(() => {
      courseFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      courseCodeInputRef.current?.focus({ preventScroll: true });
    });
  };

  const handleOpenEditCourse = (c: Course) => {
    setEditingCourseId(c.id);
    setCourseFormCode(c.code);
    setCourseFormTitle(c.title);
    setCourseFormTitleEn(c.titleEn || '');
    setCourseFormSks(c.sks);
    setCourseFormSemester(c.semester);
    setCourseFormCategory(c.category);
    setCourseFormPrereqs(c.prerequisites || []);
    setCourseFormDesc(c.description || '');
    setCourseFormTip(c.lecturerTip || '');
    setShowCourseForm(true);

    requestAnimationFrame(() => {
      courseFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      courseCodeInputRef.current?.focus({ preventScroll: true });
      courseCodeInputRef.current?.select();
    });
  };

  const handleSaveCourseForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseFormCode.trim() || !courseFormTitle.trim()) return;

    if (editingCourseId) {
      const existing = activePreset.courses.find(c => c.id === editingCourseId);
      const updatedCourse: Course = {
        id: editingCourseId,
        code: courseFormCode.trim().toUpperCase(),
        title: courseFormTitle.trim(),
        titleEn: courseFormTitleEn.trim() || undefined,
        sks: Number(courseFormSks) || 3,
        semester: Number(courseFormSemester) || 1,
        category: courseFormCategory,
        prerequisites: courseFormPrereqs,
        description: courseFormDesc.trim(),
        lecturerTip: courseFormTip.trim() || undefined,
        status: existing ? existing.status : 'not_taken',
        grade: existing ? existing.grade : undefined,
        score: existing?.score !== undefined 
          ? (existing.score > 4 ? Math.round((existing.score / 25) * 100) / 100 : existing.score)
          : undefined,
      };
      onUpdateCourse(updatedCourse);
      showToast(`Mata kuliah "${updatedCourse.code}" diperbarui`);
    } else {
      const newCourse: Course = {
        id: `c-${Date.now()}`,
        code: courseFormCode.trim().toUpperCase(),
        title: courseFormTitle.trim(),
        titleEn: courseFormTitleEn.trim() || undefined,
        sks: Number(courseFormSks) || 3,
        semester: Number(courseFormSemester) || 1,
        category: courseFormCategory,
        prerequisites: courseFormPrereqs,
        description: courseFormDesc.trim(),
        lecturerTip: courseFormTip.trim() || undefined,
        status: 'not_taken' as CourseStatus,
      };
      onAddCourse(newCourse);
      showToast(`Mata kuliah "${newCourse.code}" ditambahkan`);
    }
    setShowCourseForm(false);
  };

  const handleDeleteCourseClick = (c: Course) => {
    // Check if other courses list this as prerequisite
    const dependents = activePreset.courses.filter(other => other.prerequisites.includes(c.code));
    let msg = `Hapus mata kuliah "${c.code} - ${c.title}" dari kurikulum "${activePreset.name}"?`;
    if (dependents.length > 0) {
      msg += `\n\nPerhatian: ${dependents.length} mata kuliah lain (${dependents.map(d => d.code).join(', ')}) memiliki mata kuliah ini sebagai prasyarat!`;
    }
    if (window.confirm(msg)) {
      onDeleteCourse(c.id);
      showToast(`Mata kuliah "${c.code}" dihapus`);
    }
  };

  const handlePrereqToggle = (code: string) => {
    if (courseFormPrereqs.includes(code)) {
      setCourseFormPrereqs(courseFormPrereqs.filter(c => c !== code));
    } else {
      setCourseFormPrereqs([...courseFormPrereqs, code]);
    }
  };

  // File import handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const fallbackName = file.name.replace(/\.[^/.]+$/, '');
        const importedPreset = parseCurriculumJson(content, fallbackName);

        if (importedPreset) {
          onImportCurriculum(importedPreset);
          showToast(`Memproses kurikulum "${importedPreset.name}"...`);
        } else {
          alert('Format JSON tidak sesuai. Pastikan file JSON memuat data kurikulum atau daftar courses yang valid.');
        }
      } catch (err) {
        console.error('Import error', err);
        alert('Gagal membaca file JSON. Pastikan file berformat JSON valid.');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white dark:bg-[#0c121e] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Kelola Kurikulum &amp; Mata Kuliah
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Atur preset kurikulum, tambah/edit mata kuliah, atau impor &amp; ekspor JSON
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Tutup Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-4 sm:px-6 pt-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 flex-wrap bg-white dark:bg-[#0c121e]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('presets')}
              className={`px-4 py-2 text-xs font-semibold rounded-t-xl border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'presets'
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Daftar Kurikulum ({presets.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('courses')}
              className={`px-4 py-2 text-xs font-semibold rounded-t-xl border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'courses'
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Mata Kuliah ({activePreset.courses.length})</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                {activePreset.name.length > 20 ? `${activePreset.name.slice(0, 20)}...` : activePreset.name}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 pb-2">
            {/* Quick Import / Export Buttons */}
            <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-blue-500" />
              <span>Import JSON</span>
              <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
            </label>

            <button
              onClick={() => onExportCurriculum(activePreset)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-emerald-500" />
              <span>Export JSON</span>
            </button>
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Toast Notification inside modal */}
          {feedbackMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-medium flex items-center gap-2 animate-fade-in">
              <Check className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>{feedbackMsg}</span>
            </div>
          )}

          {/* TAB 1: PRESETS / CURRICULUMS */}
          {activeTab === 'presets' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Pilihan Kurikulum &amp; Preset
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Pilih kurikulum yang ingin digunakan atau buat variasi kurikulum baru
                  </p>
                </div>

                <button
                  onClick={handleOpenAddPreset}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Kurikulum</span>
                </button>
              </div>

              {/* Preset Cards List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {presets.map((preset) => {
                  const isActive = preset.id === activePresetId;
                  const totalSks = preset.courses.reduce((sum, c) => sum + c.sks, 0);

                  return (
                    <div
                      key={preset.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                        isActive
                          ? 'border-emerald-500/80 bg-emerald-500/5 dark:bg-emerald-500/10 ring-1 ring-emerald-500/40 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <h5 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                            {preset.name}
                          </h5>
                          {isActive ? (
                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white shrink-0 flex items-center gap-1">
                              <Check className="w-2.5 h-2.5" />
                              <span>Aktif</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                onSwitchPreset(preset.id);
                                showToast(`Kurikulum beralih ke: "${preset.name}"`);
                              }}
                              className="text-[11px] font-semibold text-blue-600 dark:text-emerald-400 hover:underline shrink-0"
                            >
                              Gunakan
                            </button>
                          )}
                        </div>

                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                          {preset.description || 'Tidak ada deskripsi kurikulum.'}
                        </p>

                        <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500 dark:text-slate-400 pt-1">
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-3 h-3 text-emerald-500" />
                            {preset.courses.length} Matkul
                          </span>
                          <span>•</span>
                          <span>
                            {totalSks}/{preset.targetSks || 144} SKS
                          </span>
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenEditPreset(preset)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Edit nama & deskripsi"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDuplicatePreset(preset)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Duplikat kurikulum ini"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onExportCurriculum(preset)}
                            className="p-1.5 text-slate-500 hover:text-emerald-500 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Export ke JSON"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {presets.length > 1 && (
                          <button
                            onClick={() => handleDeletePresetClick(preset)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                            title="Hapus kurikulum"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Create / Edit Preset Subform Modal */}
              {showPresetForm && (
                <div 
                  ref={presetFormRef}
                  className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 space-y-4 ring-2 ring-emerald-500/20 shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      {editingPresetId ? 'Edit Detail Kurikulum' : 'Buat Kurikulum Baru'}
                    </h5>
                    <button
                      onClick={() => setShowPresetForm(false)}
                      className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      Batal
                    </button>
                  </div>

                  <form onSubmit={handleSavePresetForm} className="space-y-3 text-xs">
                    <div>
                      <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                        Nama Kurikulum
                      </label>
                      <input
                        ref={presetNameInputRef}
                        type="text"
                        required
                        placeholder="e.g. S1 Sistem Informasi - Fast Track 2026"
                        value={presetFormName}
                        onChange={(e) => setPresetFormName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                          Target Kelulusan (SKS)
                        </label>
                        <input
                          type="number"
                          min={60}
                          max={200}
                          required
                          value={presetFormTargetSks}
                          onChange={(e) => setPresetFormTargetSks(Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none"
                        />
                      </div>

                      {!editingPresetId && (
                        <div>
                          <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                            Template Awal
                          </label>
                          <select
                            value={presetFormTemplateSource}
                            onChange={(e) => setPresetFormTemplateSource(e.target.value as any)}
                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none"
                          >
                            <option value="active">Salin dari Kurikulum Aktif ({activePreset.courses.length} Matkul)</option>
                            <option value="empty">Mulai dari Template Kosong (0 Matkul)</option>
                          </select>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                        Deskripsi / Keterangan
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Kurikulum khusus peminatan Data Architecture..."
                        value={presetFormDesc}
                        onChange={(e) => setPresetFormDesc(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowPresetForm(false)}
                        className="px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-sm"
                      >
                        Simpan Kurikulum
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: COURSES IN ACTIVE PRESET */}
          {activeTab === 'courses' && (
            <div className="space-y-4">
              {/* Header & Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Mata Kuliah: {activePreset.name}</span>
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Tambah, perbarui, atau hapus mata kuliah dari kurikulum yang sedang aktif
                  </p>
                </div>

                <button
                  onClick={handleOpenAddCourse}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-all self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Mata Kuliah</span>
                </button>
              </div>

              {/* Filter and Search Bar */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari kode atau nama mata kuliah..."
                    value={courseSearch}
                    onChange={(e) => setCourseSearch(e.target.value)}
                    className="w-full text-xs pl-8 pr-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-xs text-slate-500 shrink-0">Semester:</span>
                  <select
                    value={selectedSemesterFilter}
                    onChange={(e) => setSelectedSemesterFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                    className="text-xs px-2.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                  >
                    <option value="all">Semua ({activePreset.courses.length})</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                      <option key={sem} value={sem}>Semester {sem}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Course Form Submodal / Inline Editor */}
              {showCourseForm && (
                <div 
                  ref={courseFormRef}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all space-y-4 shadow-lg ${
                    editingCourseId
                      ? 'border-blue-500/50 bg-blue-50/40 dark:bg-blue-950/20 ring-2 ring-blue-500/30'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 ring-2 ring-emerald-500/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${editingCourseId ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500'}`} />
                      <span>{editingCourseId ? `Edit Mata Kuliah: ${courseFormCode || 'MK'}` : 'Tambah Mata Kuliah Baru'}</span>
                    </h5>
                    <button
                      onClick={() => setShowCourseForm(false)}
                      className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      Batal
                    </button>
                  </div>

                  <form onSubmit={handleSaveCourseForm} className="space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                          Kode Mata Kuliah *
                        </label>
                        <input
                          ref={courseCodeInputRef}
                          type="text"
                          required
                          placeholder="e.g. SI401"
                          value={courseFormCode}
                          onChange={(e) => setCourseFormCode(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 uppercase font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                          Nama Mata Kuliah *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Pemrograman Web Lanjut (Fullstack)"
                          value={courseFormTitle}
                          onChange={(e) => setCourseFormTitle(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                          Semester
                        </label>
                        <select
                          value={courseFormSemester}
                          onChange={(e) => setCourseFormSemester(Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                            <option key={s} value={s}>Semester {s}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                          Bobot SKS
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={6}
                          required
                          value={courseFormSks}
                          onChange={(e) => setCourseFormSks(Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                          Kategori
                        </label>
                        <select
                          value={courseFormCategory}
                          onChange={(e) => setCourseFormCategory(e.target.value as CourseCategory)}
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none"
                        >
                          {CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                        Prasyarat Mata Kuliah (Prerequisites)
                      </label>
                      <div className="max-h-28 overflow-y-auto p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {activePreset.courses
                          .filter(c => c.id !== editingCourseId)
                          .map(c => {
                            const isChecked = courseFormPrereqs.includes(c.code);
                            return (
                              <label
                                key={c.id}
                                className={`flex items-center gap-1.5 p-1 rounded cursor-pointer text-[11px] truncate ${
                                  isChecked ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-600 dark:text-slate-400'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handlePrereqToggle(c.code)}
                                  className="rounded text-emerald-500 focus:ring-emerald-400"
                                />
                                <span className="font-mono">{c.code}</span>
                                <span className="truncate">({c.title})</span>
                              </label>
                            );
                          })}
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                        Deskripsi Silabus / Materi
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Membahas dasar pemrograman web, REST API..."
                        value={courseFormDesc}
                        onChange={(e) => setCourseFormDesc(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowCourseForm(false)}
                        className="px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-sm"
                      >
                        Simpan Mata Kuliah
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Course Items Table / Grid */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-200 dark:divide-slate-800">
                {filteredCourses.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                    Tidak ada mata kuliah yang cocok dengan pencarian atau filter semester.
                  </div>
                ) : (
                  filteredCourses.map((c) => (
                    <div
                      key={c.id}
                      className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                            {c.code}
                          </span>
                          <span className="text-xs font-semibold text-slate-900 dark:text-white">
                            {c.title}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-medium">
                            Sem {c.semester} • {c.sks} SKS
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {c.category}
                          </span>
                        </div>

                        {c.prerequisites && c.prerequisites.length > 0 && (
                          <p className="text-[11px] text-slate-400 flex items-center gap-1">
                            <span className="font-semibold">Prasyarat:</span>
                            <span className="font-mono text-emerald-600 dark:text-emerald-400">
                              {c.prerequisites.join(', ')}
                            </span>
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-auto">
                        <button
                          onClick={() => handleOpenEditCourse(c)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                          title="Edit Mata Kuliah"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCourseClick(c)}
                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                          title="Hapus Mata Kuliah"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
