import React, { useState, useMemo } from 'react';
import type { Course, CourseGrade, CourseStatus, CourseCategory } from '../types';
import { GRADE_POINT_MAP } from '../data/curriculumData';
import {
  DEFAULT_GRADE_THRESHOLDS,
  calculateGradeFromScore,
  getDefaultScoreForGrade,
  getGradeBadgeStyle,
} from '../utils/gradeThresholdService';
import type { GradeThreshold } from '../utils/gradeThresholdService';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  CircleDot,
  Circle,
  AlertTriangle,
  GraduationCap,
  Search,
  RotateCcw,
  Layers,
  ArrowRight,
  TrendingUp,
  Award
} from 'lucide-react';

interface CurriculumExplorerProps {
  courses: Course[];
  onUpdateCourseStatus: (courseId: string, status: CourseStatus, grade?: CourseGrade, score?: number) => void;
  onResetCurriculum: () => void;
  curriculumName?: string;
  targetSks?: number;
  gradeThresholds?: GradeThreshold[];
}

const CATEGORY_COLORS: Record<CourseCategory, { bg: string; text: string; border: string }> = {
  Foundation: { bg: 'bg-blue-500/10 dark:bg-blue-500/20', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/30' },
  Algorithms: { bg: 'bg-violet-500/10 dark:bg-violet-500/20', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-500/30' },
  Database: { bg: 'bg-amber-500/10 dark:bg-amber-500/20', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/30' },
  Backend: { bg: 'bg-indigo-500/10 dark:bg-indigo-500/20', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-500/30' },
  'Web Engineering': { bg: 'bg-cyan-500/10 dark:bg-cyan-500/20', text: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-500/30' },
  'Enterprise Systems': { bg: 'bg-emerald-500/10 dark:bg-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/30' },
  'Cyber Security': { bg: 'bg-rose-500/10 dark:bg-rose-500/20', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-500/30' },
  Capstone: { bg: 'bg-fuchsia-500/10 dark:bg-fuchsia-500/20', text: 'text-fuchsia-600 dark:text-fuchsia-400', border: 'border-fuchsia-500/30' },
  General: { bg: 'bg-slate-500/10 dark:bg-slate-500/20', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-500/30' },
};

export const CurriculumExplorer: React.FC<CurriculumExplorerProps> = ({
  courses,
  onUpdateCourseStatus,
  onResetCurriculum,
  curriculumName,
  targetSks = 144,
  gradeThresholds = DEFAULT_GRADE_THRESHOLDS,
}) => {
  const [selectedSemester, setSelectedSemester] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [prereqAlert, setPrereqAlert] = useState<{ course: Course; missing: string[] } | null>(null);

  // Map courses by code for fast lookup
  const courseCodeMap = useMemo(() => {
    const map = new Map<string, Course>();
    courses.forEach(c => map.set(c.code, c));
    return map;
  }, [courses]);

  // Active course details
  const activeCourse = useMemo(() => {
    return courses.find(c => c.id === activeCourseId) || null;
  }, [courses, activeCourseId]);

  // Find all recursive upstream prerequisites
  const upstreamPrereqCodes = useMemo(() => {
    if (!activeCourse) return new Set<string>();
    const upstream = new Set<string>();
    const queue = [...activeCourse.prerequisites];

    while (queue.length > 0) {
      const code = queue.shift()!;
      if (!upstream.has(code)) {
        upstream.add(code);
        const parent = courseCodeMap.get(code);
        if (parent && parent.prerequisites) {
          queue.push(...parent.prerequisites);
        }
      }
    }
    return upstream;
  }, [activeCourse, courseCodeMap]);

  // Find all downstream dependent courses (courses that require the active course)
  const downstreamDependentCodes = useMemo(() => {
    if (!activeCourse) return new Set<string>();
    const downstream = new Set<string>();

    courses.forEach(c => {
      if (c.prerequisites.includes(activeCourse.code)) {
        downstream.add(c.code);
      }
    });

    return downstream;
  }, [activeCourse, courses]);

  // Statistics calculation
  const stats = useMemo(() => {
    let passedSks = 0;
    let plannedSks = 0;
    let totalGradePoints = 0;
    let gradedSks = 0;
    const finalTargetSks = targetSks || 144;

    courses.forEach(c => {
      if (c.status === 'completed') {
        passedSks += c.sks;
        let gradePoint = 4.0;
        if (c.score !== undefined) {
          gradePoint = calculateGradeFromScore(c.score, gradeThresholds).point;
        } else if (c.grade) {
          gradePoint = GRADE_POINT_MAP[c.grade] ?? 4.0;
        }
        totalGradePoints += gradePoint * c.sks;
        gradedSks += c.sks;
      } else if (c.status === 'planned') {
        plannedSks += c.sks;
      }
    });

    const gpa = gradedSks > 0 ? totalGradePoints / gradedSks : 0.0;
    const percentage = Math.min(100, Math.round((passedSks / finalTargetSks) * 100));

    return {
      passedSks,
      plannedSks,
      targetSks: finalTargetSks,
      gpa,
      percentage,
    };
  }, [courses, targetSks, gradeThresholds]);

  // Trigger celebration confetti when 144 SKS is reached
  React.useEffect(() => {
    if (stats.passedSks >= stats.targetSks) {
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {
        // Safe fallback
      }
    }
  }, [stats.passedSks, stats.targetSks]);

  // Filtered courses
  const filteredCourses = useMemo(() => {
    return courses.filter(c => {
      const matchesSemester = selectedSemester === 'all' || c.semester === selectedSemester;
      const matchesCategory = selectedCategory === 'all' || c.category === selectedCategory;
      const matchesSearch =
        c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.titleEn && c.titleEn.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesSemester && matchesCategory && matchesSearch;
    });
  }, [courses, selectedSemester, selectedCategory, searchQuery]);

  // Group by semester
  const coursesBySemester = useMemo(() => {
    const grouped: Record<number, Course[]> = {};
    for (let i = 1; i <= 8; i++) {
      grouped[i] = [];
    }
    filteredCourses.forEach(c => {
      if (grouped[c.semester]) {
        grouped[c.semester].push(c);
      }
    });
    return grouped;
  }, [filteredCourses]);

  // Handle status change with prerequisite validation and dynamic threshold calculation
  const handleStatusChange = (course: Course, newStatus: CourseStatus) => {
    if (newStatus === 'completed' || newStatus === 'planned') {
      // Check if prerequisites are passed
      const missing = course.prerequisites.filter(reqCode => {
        const reqCourse = courseCodeMap.get(reqCode);
        return !reqCourse || reqCourse.status !== 'completed';
      });

      if (missing.length > 0) {
        setPrereqAlert({ course, missing });
        // Still allow setting or confirming
      }
    }

    if (newStatus === 'completed') {
      const currentScore = course.score !== undefined
        ? (course.score > 4 ? Math.round((course.score / 25) * 100) / 100 : course.score)
        : getDefaultScoreForGrade(course.grade || 'A', gradeThresholds);
      const { grade } = calculateGradeFromScore(currentScore, gradeThresholds);
      onUpdateCourseStatus(course.id, 'completed', grade, currentScore);
    } else {
      onUpdateCourseStatus(course.id, newStatus, undefined, undefined);
    }
  };

  return (
    <div className="space-y-6">

      {/* Prerequisite Alert Banner */}
      {prereqAlert && (
        <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 flex items-start justify-between gap-3 animate-fade-in shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                Peringatan Prasyarat Mata Kuliah: {prereqAlert.course.code} — {prereqAlert.course.title}
              </h4>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                Mata kuliah ini mensyaratkan kelulusan mata kuliah prasyarat berikut:
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {prereqAlert.missing.map(code => {
                  const prereq = courseCodeMap.get(code);
                  return (
                    <span
                      key={code}
                      className="px-2 py-0.5 rounded text-xs font-mono font-medium bg-amber-500/20 border border-amber-500/30 text-amber-900 dark:text-amber-200"
                    >
                      {code} {prereq ? `(${prereq.title})` : ''} — Belum Lulus
                    </span>
                  );
                })}
              </div>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-2 italic">
                Tips Akademik PJJ: Menyelesaikan mata kuliah pondasi terlebih dahulu mencegah kesulitan pemahaman materi tingkat lanjut.
              </p>
            </div>
          </div>
          <button
            onClick={() => setPrereqAlert(null)}
            className="text-xs font-medium text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-white px-2 py-1 rounded bg-amber-500/20"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Active Curriculum Banner */}
      {curriculumName && (
        <div className="glass-card px-4 py-2.5 rounded-2xl flex items-center justify-between gap-3 text-xs border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium text-slate-600 dark:text-slate-400">
              Kurikulum Aktif:
            </span>
            <span className="font-bold text-slate-900 dark:text-white">
              {curriculumName}
            </span>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
            Target {stats.targetSks} SKS
          </span>
        </div>
      )}

      {/* Top Academic Stats & IPK Calculator Simulation Widget */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

        {/* SKS Passed Card */}
        <div className="glass-card p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              SKS Kelulusan (Passed)
            </span>
            <GraduationCap className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
              {stats.passedSks}
            </span>
            <span className="text-sm text-slate-500 dark:text-slate-400 font-mono">
              / {stats.targetSks} SKS
            </span>
          </div>
          {/* Progress Bar */}
          <div className="mt-3 w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${stats.percentage}%` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>{stats.percentage}% Target Tercapai</span>
            <span>Sisa {Math.max(0, stats.targetSks - stats.passedSks)} SKS</span>
          </div>
        </div>

        {/* Planned SKS Card */}
        <div className="glass-card p-5 rounded-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              SKS Direncanakan (KRS)
            </span>
            <CircleDot className="w-5 h-5 text-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
              {stats.plannedSks}
            </span>
            <span className="text-sm text-slate-500 dark:text-slate-400">SKS Aktif</span>
          </div>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Total potensi SKS: <strong className="text-slate-700 dark:text-slate-200">{stats.passedSks + stats.plannedSks} SKS</strong>
          </p>
        </div>

        {/* GPA / IPK Calculator Simulation Card */}
        <div className="glass-card p-5 rounded-2xl relative overflow-hidden bg-gradient-to-br from-emerald-500/5 to-blue-500/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Simulasi IPK Kumulatif
            </span>
            <TrendingUp className="w-5 h-5 text-cyan-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
              {stats.gpa.toFixed(2)}
            </span>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              {stats.gpa >= 3.5 ? 'Dengan Pujian (Cum Laude)' : stats.gpa >= 3.0 ? 'Sangat Memuaskan' : 'Memuaskan'}
            </span>
          </div>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Dihitung otomatis dari nilai tiap mata kuliah lulus.
          </p>
        </div>

        {/* Quick Prerequisite Inspector / Reset Card */}
        <div className="glass-card p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Prerequisite Inspector
            </span>
            <Layers className="w-5 h-5 text-indigo-500" />
          </div>

          <div className="text-xs text-slate-600 dark:text-slate-300">
            {activeCourse ? (
              <div>
                <p className="font-semibold text-blue-600 dark:text-cyan-400 line-clamp-1">
                  {activeCourse.code}: {activeCourse.title}
                </p>
                <div className="mt-1 flex gap-2 text-[11px]">
                  <span>⬆ {upstreamPrereqCodes.size} Prasyarat</span>
                  <span>⬇ {downstreamDependentCodes.size} Membuka</span>
                </div>
              </div>
            ) : (
              <p className="text-slate-400 italic">
                Klik kartu mata kuliah untuk melihat relasi rantai prasyarat graf.
              </p>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            {activeCourse && (
              <button
                onClick={() => setActiveCourseId(null)}
                className="text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 underline"
              >
                Clear Focus
              </button>
            )}
            <button
              onClick={onResetCurriculum}
              className="ml-auto flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
              title="Reset ke default UNSIA sample data"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Plan
            </button>
          </div>
        </div>

      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3">

        {/* Semester Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedSemester('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${selectedSemester === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
          >
            Semua Semester (1-8)
          </button>
          {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
            <button
              key={sem}
              onClick={() => setSelectedSemester(sem)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${selectedSemester === sem
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              Sem {sem}
            </button>
          ))}
        </div>

        {/* Search & Category Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Semua Kategori</option>
            <option value="Foundation">Foundation</option>
            <option value="Algorithms">Algorithms</option>
            <option value="Database">Database</option>
            <option value="Backend">Backend</option>
            <option value="Web Engineering">Web Engineering</option>
            <option value="Enterprise Systems">Enterprise Systems</option>
            <option value="Cyber Security">Cyber Security</option>
            <option value="Capstone">Capstone</option>
            <option value="General">General</option>
          </select>

          {/* Search Input */}
          <div className="relative flex-1 md:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari kode atau mata kuliah..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

      </div>

      {/* Curriculum Grid Organized by Semesters */}
      <div className="space-y-8">
        {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => {
          if (selectedSemester !== 'all' && selectedSemester !== sem) return null;
          const semesterCourses = coursesBySemester[sem] || [];
          if (semesterCourses.length === 0) return null;

          const semesterTotalSks = semesterCourses.reduce((acc, c) => acc + c.sks, 0);
          const semesterPassedSks = semesterCourses.filter(c => c.status === 'completed').reduce((acc, c) => acc + c.sks, 0);

          return (
            <div key={sem} className="space-y-3">
              {/* Semester Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                    {sem}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Semester {sem}
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    ({semesterCourses.length} Mata Kuliah)
                  </span>
                </div>
                <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  Passed: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{semesterPassedSks}</span> / {semesterTotalSks} SKS
                </div>
              </div>

              {/* Course Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {semesterCourses.map(course => {
                  const isSelected = activeCourseId === course.id;
                  const isUpstreamPrereq = upstreamPrereqCodes.has(course.code);
                  const isDownstreamDependent = downstreamDependentCodes.has(course.code);
                  const catStyle = CATEGORY_COLORS[course.category] || CATEGORY_COLORS.General;

                  let borderClass = 'border-slate-200 dark:border-slate-800';
                  let ringClass = '';

                  if (isSelected) {
                    borderClass = 'border-blue-500 ring-2 ring-blue-500/50 shadow-lg';
                  } else if (isUpstreamPrereq) {
                    borderClass = 'border-amber-400 dark:border-amber-500 ring-2 ring-amber-400/40 bg-amber-500/5 dark:bg-amber-950/20';
                  } else if (isDownstreamDependent) {
                    borderClass = 'border-emerald-500 dark:border-emerald-400 ring-2 ring-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-950/20';
                  }

                  return (
                    <div
                      key={course.id}
                      onClick={() => setActiveCourseId(isSelected ? null : course.id)}
                      className={`glass-card p-4 rounded-xl cursor-pointer relative transition-all duration-200 ${borderClass} ${ringClass}`}
                    >
                      {/* Top Badges */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-xs font-bold text-slate-900 dark:text-white px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            {course.code}
                          </span>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}>
                            {course.category}
                          </span>
                          {/* If completed, show computed grade badge */}
                          {course.status === 'completed' && (() => {
                            const rawScore = course.score !== undefined
                              ? (course.score > 4 ? Math.round((course.score / 25) * 100) / 100 : course.score)
                              : getDefaultScoreForGrade(course.grade || 'A', gradeThresholds);
                            const { grade: computedGrade } = calculateGradeFromScore(rawScore, gradeThresholds);
                            const badgeStyle = getGradeBadgeStyle(computedGrade);
                            return (
                              <span
                                title={`Nilai Desimal: ${rawScore.toFixed(2)} | Huruf: ${computedGrade}`}
                                className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}
                              >
                                {computedGrade} ({rawScore.toFixed(2)})
                              </span>
                            );
                          })()}
                        </div>
                        <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                          {course.sks} SKS
                        </span>
                      </div>

                      {/* Course Title */}
                      <div className="mt-2.5">
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug group-hover:text-blue-500">
                          {course.title}
                        </h4>
                        {course.titleEn && (
                          <p className="text-[11px] text-slate-400 italic mt-0.5 line-clamp-1">
                            {course.titleEn}
                          </p>
                        )}
                      </div>

                      {/* Description & Lecturer Tip */}
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                        {course.description}
                      </p>

                      {/* Prerequisites Pills */}
                      <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                          <span>Prasyarat:</span>
                          {course.prerequisites.length > 0 ? (
                            <div className="flex gap-1 flex-wrap">
                              {course.prerequisites.map(req => {
                                const reqCourse = courseCodeMap.get(req);
                                const isReqPassed = reqCourse?.status === 'completed';
                                return (
                                  <span
                                    key={req}
                                    className={`px-1.5 py-0.2 rounded font-mono text-[10px] ${isReqPassed
                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                                      }`}
                                  >
                                    {req} {isReqPassed ? '✓' : '!'}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500 italic">None</span>
                          )}
                        </div>
                      </div>

                      {/* Status Selector & Grade Dropdown */}
                      <div
                        className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Status Radio Buttons */}
                        <div className="flex items-center gap-1">
                          <button
                            title="Tandai Sudah Lulus"
                            onClick={() => handleStatusChange(course, 'completed')}
                            className={`p-1 rounded text-xs flex items-center gap-1 font-medium transition-colors ${course.status === 'completed'
                                ? 'bg-emerald-500 text-white shadow-sm'
                                : 'text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400'
                              }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span className="text-[10px] hidden sm:inline">Lulus</span>
                          </button>

                          <button
                            title="Tandai Direncanakan (KRS)"
                            onClick={() => handleStatusChange(course, 'planned')}
                            className={`p-1 rounded text-xs flex items-center gap-1 font-medium transition-colors ${course.status === 'planned'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-blue-500 dark:hover:text-blue-400'
                              }`}
                          >
                            <CircleDot className="w-3.5 h-3.5" />
                            <span className="text-[10px] hidden sm:inline">KRS</span>
                          </button>

                          <button
                            title="Belum Diambil"
                            onClick={() => handleStatusChange(course, 'not_taken')}
                            className={`p-1 rounded text-xs flex items-center gap-1 font-medium transition-colors ${course.status === 'not_taken'
                                ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                              }`}
                          >
                            <Circle className="w-3.5 h-3.5" />
                            <span className="text-[10px] hidden sm:inline">Belum</span>
                          </button>
                        </div>

                        {/* Dynamic Numeric Score Input & Grade Alphabet Badge (if completed) */}
                        {course.status === 'completed' && (() => {
                          const rawScore = course.score !== undefined
                            ? (course.score > 4 ? Math.round((course.score / 25) * 100) / 100 : course.score)
                            : getDefaultScoreForGrade(course.grade || 'A', gradeThresholds);
                          const { grade: computedGrade, point: computedPoint } = calculateGradeFromScore(rawScore, gradeThresholds);
                          const badgeStyle = getGradeBadgeStyle(computedGrade);

                          return (
                            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900/60 py-1 px-1.5 rounded-lg border border-slate-200/80 dark:border-slate-800">
                              <span className="text-[10px] font-semibold text-slate-400">
                                Grade:
                              </span>
                              <input
                                type="number"
                                min="0"
                                max="4"
                                step="0.01"
                                placeholder="0.0 - 4.0"
                                value={rawScore}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  const val = raw === '' ? 0 : Math.max(0, Math.min(4.0, parseFloat(raw) || 0));
                                  const res = calculateGradeFromScore(val, gradeThresholds);
                                  onUpdateCourseStatus(course.id, 'completed', res.grade, val);
                                }}
                                className="w-16 text-center text-xs font-mono font-bold py-0.5 px-1 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />

                              {/* Dynamically Computed Grade Alphabet Badge */}
                              <span
                                title={`Nilai Huruf: ${computedGrade} (Bobot ${computedPoint.toFixed(1)})`}
                                className={`text-[11px] font-mono px-2 py-0.5 rounded-md border font-extrabold flex items-center gap-0.5 transition-all duration-200 ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border} ${badgeStyle.glow}`}
                              >
                                <span>{computedGrade}</span>
                                <span className="text-[9px] opacity-75 font-normal">({computedPoint.toFixed(1)})</span>
                              </span>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Dynamic Prerequisite Highlight Banner (if related) */}
                      {isUpstreamPrereq && (
                        <div className="mt-2 text-[10px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <ArrowRight className="w-3 h-3" />
                          Prasyarat Pondasi untuk: <span className="font-bold">{activeCourse?.code}</span>
                        </div>
                      )}

                      {isDownstreamDependent && (
                        <div className="mt-2 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <Award className="w-3 h-3" />
                          Mata Kuliah Tingkat Lanjut yang Terbuka
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
