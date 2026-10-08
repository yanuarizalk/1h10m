import type { CourseGrade } from '../types';

export interface GradeThreshold {
  grade: CourseGrade;
  minScore: number; // Decimal scale 0.00 – 4.00
  point: number;    // Official academic weight (e.g. 4.0, 3.7, 3.3)
  description?: string;
}

export const GRADE_THRESHOLDS_STORAGE_KEY = 'sia_orbit_grade_thresholds';

/**
 * Default Grade Thresholds on a 0.00 – 4.00 decimal scale
 * Aligned with academic GPA standards (Universitas Siber Asia / PTN / PTS)
 */
export const DEFAULT_GRADE_THRESHOLDS: GradeThreshold[] = [
  { grade: 'A', minScore: 3.75, point: 4.0, description: 'Istimewa / Sangat Baik' },
  { grade: 'A-', minScore: 3.50, point: 3.7, description: 'Hampir Istimewa' },
  { grade: 'B+', minScore: 3.25, point: 3.3, description: 'Baik Sekali' },
  { grade: 'B', minScore: 2.75, point: 3.0, description: 'Baik' },
  { grade: 'B-', minScore: 2.50, point: 2.7, description: 'Cukup Baik' },
  { grade: 'C+', minScore: 2.25, point: 2.3, description: 'Lebih Dari Cukup' },
  { grade: 'C', minScore: 2.00, point: 2.0, description: 'Cukup (Batas Kelulusan)' },
  { grade: 'D', minScore: 1.00, point: 1.0, description: 'Kurang (Wajib Remedi)' },
  { grade: 'E', minScore: 0.00, point: 0.0, description: 'Gagal' },
];

export interface GradePreset {
  id: string;
  name: string;
  description: string;
  thresholds: GradeThreshold[];
}

export const GRADE_PRESETS: GradePreset[] = [
  {
    id: 'unsia_standard',
    name: 'Standar UNSIA (A ≥ 3.75)',
    description: 'Skala desimal 0–4 (A ≥ 3.75, B+ ≥ 3.25, B ≥ 2.75, C ≥ 2.00, D ≥ 1.00)',
    thresholds: DEFAULT_GRADE_THRESHOLDS,
  },
  {
    id: 'strict_scale',
    name: 'Skala Ketat (A ≥ 3.85)',
    description: 'Skala desimal ketat (A ≥ 3.85, A- ≥ 3.70, B+ ≥ 3.30, B ≥ 3.00, B- ≥ 2.70, C ≥ 2.00)',
    thresholds: [
      { grade: 'A', minScore: 3.85, point: 4.0, description: 'Istimewa' },
      { grade: 'A-', minScore: 3.70, point: 3.7, description: 'Hampir Istimewa' },
      { grade: 'B+', minScore: 3.30, point: 3.3, description: 'Baik Sekali' },
      { grade: 'B', minScore: 3.00, point: 3.0, description: 'Baik' },
      { grade: 'B-', minScore: 2.70, point: 2.7, description: 'Cukup Baik' },
      { grade: 'C+', minScore: 2.30, point: 2.3, description: 'Lebih Dari Cukup' },
      { grade: 'C', minScore: 2.00, point: 2.0, description: 'Cukup' },
      { grade: 'D', minScore: 1.00, point: 1.0, description: 'Kurang' },
      { grade: 'E', minScore: 0.00, point: 0.0, description: 'Gagal' },
    ],
  },
  {
    id: 'simple_scale',
    name: 'Skala Sederhana (A, B, C, D, E)',
    description: 'Skala desimal 5 huruf (A ≥ 3.50, B ≥ 2.75, C ≥ 2.00, D ≥ 1.00, E < 1.00)',
    thresholds: [
      { grade: 'A', minScore: 3.50, point: 4.0, description: 'Sangat Baik' },
      { grade: 'B', minScore: 2.75, point: 3.0, description: 'Baik' },
      { grade: 'C', minScore: 2.00, point: 2.0, description: 'Cukup' },
      { grade: 'D', minScore: 1.00, point: 1.0, description: 'Kurang' },
      { grade: 'E', minScore: 0.00, point: 0.0, description: 'Gagal' },
    ],
  },
];

/**
 * Calculate grade alphabet and GPA point dynamically from numeric decimal score (0.00–4.00)
 */
export function calculateGradeFromScore(
  score: number,
  thresholds: GradeThreshold[] = DEFAULT_GRADE_THRESHOLDS
): { grade: CourseGrade; point: number } {
  // Gracefully handle values: if old 0-100 scale leaked in (> 4), normalize to 0-4
  const normalized = typeof score === 'number' && !isNaN(score)
    ? (score > 4 ? Math.min(4.0, Math.round((score / 25) * 100) / 100) : Math.max(0, Math.min(4.0, score)))
    : 0;

  // Sort descending by minScore to evaluate highest match first
  const sorted = [...thresholds].sort((a, b) => b.minScore - a.minScore);
  for (const t of sorted) {
    if (normalized >= t.minScore) {
      return { grade: t.grade, point: t.point };
    }
  }
  const lowest = sorted[sorted.length - 1];
  return lowest ? { grade: lowest.grade, point: lowest.point } : { grade: 'E', point: 0.0 };
}

/**
 * Get a representative default decimal score (0.00–4.00) for a grade letter
 */
export function getDefaultScoreForGrade(
  grade: CourseGrade,
  thresholds: GradeThreshold[] = DEFAULT_GRADE_THRESHOLDS
): number {
  const match = thresholds.find((t) => t.grade === grade);
  if (match) {
    return match.point;
  }
  switch (grade) {
    case 'A': return 4.0;
    case 'A-': return 3.7;
    case 'B+': return 3.3;
    case 'B': return 3.0;
    case 'B-': return 2.7;
    case 'C+': return 2.3;
    case 'C': return 2.0;
    case 'D': return 1.0;
    case 'E': default: return 0.0;
  }
}

/**
 * Visual styling classes for letter grades
 */
export function getGradeBadgeStyle(grade: CourseGrade): {
  bg: string;
  text: string;
  border: string;
  glow: string;
} {
  switch (grade) {
    case 'A':
      return {
        bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
        text: 'text-emerald-700 dark:text-emerald-300 font-extrabold',
        border: 'border-emerald-500/40',
        glow: 'shadow-[0_0_12px_rgba(16,185,129,0.25)]',
      };
    case 'A-':
      return {
        bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
        text: 'text-emerald-600 dark:text-emerald-400 font-bold',
        border: 'border-emerald-500/30',
        glow: 'shadow-[0_0_8px_rgba(16,185,129,0.15)]',
      };
    case 'B+':
      return {
        bg: 'bg-cyan-500/10 dark:bg-cyan-500/20',
        text: 'text-cyan-700 dark:text-cyan-300 font-bold',
        border: 'border-cyan-500/40',
        glow: 'shadow-[0_0_10px_rgba(6,182,212,0.2)]',
      };
    case 'B':
      return {
        bg: 'bg-blue-500/10 dark:bg-blue-500/20',
        text: 'text-blue-700 dark:text-blue-300 font-bold',
        border: 'border-blue-500/30',
        glow: 'shadow-[0_0_8px_rgba(59,130,246,0.15)]',
      };
    case 'B-':
      return {
        bg: 'bg-blue-500/5 dark:bg-blue-500/15',
        text: 'text-blue-600 dark:text-blue-400 font-semibold',
        border: 'border-blue-500/20',
        glow: '',
      };
    case 'C+':
    case 'C':
      return {
        bg: 'bg-amber-500/10 dark:bg-amber-500/20',
        text: 'text-amber-700 dark:text-amber-300 font-bold',
        border: 'border-amber-500/40',
        glow: 'shadow-[0_0_8px_rgba(245,158,11,0.2)]',
      };
    case 'D':
      return {
        bg: 'bg-orange-500/10 dark:bg-orange-500/20',
        text: 'text-orange-700 dark:text-orange-300 font-bold',
        border: 'border-orange-500/40',
        glow: '',
      };
    case 'E':
    default:
      return {
        bg: 'bg-rose-500/10 dark:bg-rose-500/20',
        text: 'text-rose-700 dark:text-rose-300 font-bold',
        border: 'border-rose-500/40',
        glow: '',
      };
  }
}

/**
 * Load grade thresholds from localStorage with automatic migration for 0–4 decimal scale
 */
export function loadGradeThresholds(): GradeThreshold[] {
  if (typeof window === 'undefined') return DEFAULT_GRADE_THRESHOLDS;
  try {
    const saved = localStorage.getItem(GRADE_THRESHOLDS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Migration check: If any minScore > 4, reset to new 0–4 scale
        const isOldScale = parsed.some((t: any) => typeof t.minScore === 'number' && t.minScore > 4);
        if (!isOldScale) {
          return parsed;
        }
      }
    }
  } catch (e) {
    console.warn('[SIA-Orbit] Failed reading grade thresholds:', e);
  }
  return DEFAULT_GRADE_THRESHOLDS;
}

/**
 * Save grade thresholds to localStorage
 */
export function saveGradeThresholds(thresholds: GradeThreshold[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(GRADE_THRESHOLDS_STORAGE_KEY, JSON.stringify(thresholds));
  } catch (e) {
    console.error('[SIA-Orbit] Failed saving grade thresholds:', e);
  }
}
