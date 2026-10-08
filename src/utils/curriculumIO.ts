import type { Course, CurriculumPreset } from '../types';

export interface ExportedCurriculumJson {
  app: 'SIA-Orbit';
  version: '1.0';
  exportedAt: string;
  preset: CurriculumPreset;
}

/**
 * Standard serializer for exporting curriculum presets.
 */
export function serializeCurriculumPreset(preset: CurriculumPreset): string {
  const exportPayload: ExportedCurriculumJson = {
    app: 'SIA-Orbit',
    version: '1.0',
    exportedAt: new Date().toISOString(),
    preset: {
      id: preset.id,
      name: preset.name,
      description: preset.description || '',
      targetSks: preset.targetSks || 144,
      courses: preset.courses,
      createdAt: preset.createdAt,
      updatedAt: preset.updatedAt,
    },
  };
  return JSON.stringify(exportPayload, null, 2);
}

function normalizeCourses(rawList: unknown[]): Course[] {
  return rawList.map((item, idx) => {
    const c = (item && typeof item === 'object') ? (item as Record<string, unknown>) : {};
    return {
      id: typeof c.id === 'string' && c.id ? c.id : `c-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      code: typeof c.code === 'string' && c.code ? c.code.trim().toUpperCase() : `MK${idx + 1}`,
      title: typeof c.title === 'string' && c.title ? c.title.trim() : (typeof c.nama === 'string' ? c.nama.trim() : `Mata Kuliah ${idx + 1}`),
      titleEn: typeof c.titleEn === 'string' && c.titleEn ? c.titleEn.trim() : undefined,
      sks: typeof c.sks === 'number' ? c.sks : (Number(c.sks) || 3),
      semester: typeof c.semester === 'number' ? c.semester : (Number(c.semester) || 1),
      category: (typeof c.category === 'string' ? c.category : 'General') as Course['category'],
      prerequisites: Array.isArray(c.prerequisites) ? c.prerequisites.map(String) : [],
      description: typeof c.description === 'string' ? c.description : '',
      lecturerTip: typeof c.lecturerTip === 'string' && c.lecturerTip ? c.lecturerTip : undefined,
      status: (c.status === 'completed' || c.status === 'planned' || c.status === 'not_taken') ? c.status : 'not_taken',
      grade: typeof c.grade === 'string' ? (c.grade as Course['grade']) : undefined,
      score: typeof c.score === 'number' && !isNaN(c.score)
        ? (c.score > 4 ? Math.round((c.score / 25) * 100) / 100 : c.score)
        : undefined,
    };
  });
}

/**
 * Standard parser for importing curriculum JSON files.
 * Handles:
 * 1. Exported payload ({ app: 'SIA-Orbit', preset: { ... } })
 * 2. Direct preset object ({ id, name, courses: [ ... ] })
 * 3. Array of courses ([ { code, title, ... } ])
 */
export function parseCurriculumJson(jsonString: string, fallbackName?: string): CurriculumPreset | null {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed) return null;

    // Case 1: Standard SIA-Orbit exported payload with preset field
    if (parsed.preset && typeof parsed.preset === 'object' && Array.isArray(parsed.preset.courses)) {
      const p = parsed.preset;
      return {
        id: p.id || `preset-${Date.now()}`,
        name: p.name || fallbackName || 'Kurikulum Impor',
        description: p.description || '',
        targetSks: Number(p.targetSks) || 144,
        courses: normalizeCourses(p.courses),
        createdAt: p.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    // Case 2: Direct CurriculumPreset object
    if (parsed.courses && Array.isArray(parsed.courses)) {
      return {
        id: parsed.id || `preset-${Date.now()}`,
        name: parsed.name || fallbackName || 'Kurikulum Impor',
        description: parsed.description || '',
        targetSks: Number(parsed.targetSks) || 144,
        courses: normalizeCourses(parsed.courses),
        createdAt: parsed.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    // Case 3: Raw array of courses
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object' && parsed[0] !== null) {
      const first = parsed[0] as Record<string, unknown>;
      if (first.code || first.title || first.nama) {
        return {
          id: `preset-${Date.now()}`,
          name: fallbackName || 'Kurikulum Impor',
          description: `Daftar mata kuliah diimpor dari ${fallbackName || 'file eksternal'}`,
          targetSks: 144,
          courses: normalizeCourses(parsed),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
    }

    return null;
  } catch (err) {
    console.error('Error parsing curriculum JSON:', err);
    return null;
  }
}

/**
 * Helper to trigger automatic download of exported curriculum JSON file.
 */
export function downloadCurriculumJson(preset: CurriculumPreset): void {
  const jsonStr = serializeCurriculumPreset(preset);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = (preset.name || 'curriculum').toLowerCase().replace(/[^a-z0-9]/g, '_');
  a.download = `curriculum-${safeName}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
