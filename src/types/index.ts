export type CourseCategory =
  | 'Foundation'
  | 'Database'
  | 'Backend'
  | 'Algorithms'
  | 'Web Engineering'
  | 'Enterprise Systems'
  | 'Cyber Security'
  | 'Capstone'
  | 'General';

export type CourseStatus = 'completed' | 'planned' | 'not_taken';

export type CourseGrade = 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'D' | 'E';

export interface Course {
  id: string;
  code: string;
  title: string;
  titleEn?: string;
  sks: number;
  semester: number;
  category: CourseCategory;
  prerequisites: string[]; // List of Course codes
  description: string;
  lecturerTip?: string;
  status: CourseStatus;
  grade?: CourseGrade;
}

export interface CurriculumPreset {
  id: string;
  name: string;
  description?: string;
  targetSks?: number;
  courses: Course[];
  createdAt?: string;
  updatedAt?: string;
}

export type AssignmentPriority = 'low' | 'medium' | 'high' | 'urgent';
export type AssignmentStatus = 'pending' | 'in_progress' | 'completed';

export interface Assignment {
  id: string;
  courseCode: string;
  courseTitle: string;
  title: string;
  dueDate: string; // ISO string e.g. 2026-10-15T23:59:00
  submissionUrl: string;
  priority: AssignmentPriority;
  status: AssignmentStatus;
  type: 'individual' | 'group';
  notes?: string;
  createdAt: string;
}

export interface TaskNotificationConfig {
  enabled: boolean;
  reminderMinutes: number; // in minutes before due date, e.g. 15, 30, 60, 120
  soundEnabled: boolean;
  lastNotifiedTaskIds?: string[];
}

export interface GroupMemberTask {
  id: string;
  name: string;
  task: string;
}

export interface GroupDeliverable {
  id: string;
  topic: string;
  courseCode: string;
  courseTitle: string;
  members: GroupMemberTask[];
  deadline: string;
  driveLink: string;
  extraNotes?: string;
  createdAt: string;
}

export interface CacheEntryInfo {
  name: string;
  count: number;
}

export interface CacheDiagnostics {
  isOnline: boolean;
  swRegistered: boolean;
  swActive: boolean;
  swWaiting: boolean;
  buildVersion: string;
  buildTimestamp: string;
  cacheList: CacheEntryInfo[];
  storageUsage: {
    usedMb: number;
    quotaMb: number;
    percentage: number;
  };
  lastCheckedTime: string;
}

export interface PrerequisiteWarning {
  targetCourse: Course;
  missingPrerequisites: Course[];
}
