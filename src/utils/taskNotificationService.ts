import type { Assignment, TaskNotificationConfig } from '../types';

export const TASK_NOTIFICATION_STORAGE_KEY = 'sia_orbit_task_notifications';
export const NOTIFIED_TASKS_STORAGE_KEY = 'sia_orbit_notified_task_ids';

export const DEFAULT_TASK_NOTIFICATION_CONFIG: TaskNotificationConfig = {
  enabled: true,
  reminderMinutes: 60, // Default 60 minutes before due
  soundEnabled: true,
  lastNotifiedTaskIds: [],
};

/**
 * Clean and normalize a task ID (stripping any legacy '-<num>m' suffixes)
 */
export function cleanTaskId(id: string): string {
  if (typeof id !== 'string') return '';
  return id.replace(/-\d+m$/, '');
}

/**
 * Check browser support and current permission state
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Request notification permission from the browser / operating system
 */
export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch (err) {
    console.error('[SIA-Orbit] Error requesting notification permission:', err);
    return Notification.permission;
  }
}

/**
 * Retrieve notification configuration from localStorage
 */
export function getTaskNotificationConfig(): TaskNotificationConfig {
  if (typeof window === 'undefined') return DEFAULT_TASK_NOTIFICATION_CONFIG;
  try {
    const saved = localStorage.getItem(TASK_NOTIFICATION_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_TASK_NOTIFICATION_CONFIG,
        ...parsed,
      };
    }
  } catch (err) {
    console.warn('[SIA-Orbit] Failed to read task notification config:', err);
  }
  return DEFAULT_TASK_NOTIFICATION_CONFIG;
}

/**
 * Save notification configuration to localStorage
 */
export function saveTaskNotificationConfig(config: TaskNotificationConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TASK_NOTIFICATION_STORAGE_KEY, JSON.stringify(config));
  } catch (err) {
    console.error('[SIA-Orbit] Failed to save task notification config:', err);
  }
}

/**
 * Get the list of assignment IDs that have already been notified (normalized to clean task IDs)
 */
export function getNotifiedTaskIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(NOTIFIED_TASKS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        // Strip any legacy suffixes (e.g. 'task-1-60m' -> 'task-1') and deduplicate
        const normalized = parsed
          .map((id) => (typeof id === 'string' ? cleanTaskId(id) : ''))
          .filter(Boolean);
        return Array.from(new Set(normalized));
      }
    }
  } catch (err) {
    console.warn('[SIA-Orbit] Failed to read notified task IDs:', err);
  }
  return [];
}

/**
 * Record a task ID as notified (strictly once per task).
 * Synchronously writes to localStorage and notifies the active Service Worker.
 */
export function markTaskAsNotified(taskId: string): void {
  if (typeof window === 'undefined') return;
  const cleanId = cleanTaskId(taskId);
  if (!cleanId) return;

  try {
    const current = getNotifiedTaskIds();
    if (!current.includes(cleanId)) {
      const updated = [...current, cleanId];
      localStorage.setItem(NOTIFIED_TASKS_STORAGE_KEY, JSON.stringify(updated));
    }

    // Immediately alert active Service Worker so its in-memory set & timers update
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'MARK_TASK_NOTIFIED',
        taskId: cleanId,
      });
    }
  } catch (err) {
    console.warn('[SIA-Orbit] Failed to update notified task IDs:', err);
  }
}

/**
 * Clear the list of notified task IDs (e.g. when user clicks "Reset Riwayat Pengingat")
 */
export function clearNotifiedTaskHistory(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(NOTIFIED_TASKS_STORAGE_KEY);
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_NOTIFIED_HISTORY' });
  }
}

// Global listener: Listen for messages from Service Worker (e.g. when SW notifies a task in background)
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'TASK_NOTIFIED_BY_SW' && event.data.taskId) {
      const cleanId = cleanTaskId(event.data.taskId);
      const current = getNotifiedTaskIds();
      if (!current.includes(cleanId)) {
        localStorage.setItem(NOTIFIED_TASKS_STORAGE_KEY, JSON.stringify([...current, cleanId]));
      }
    }
    if (event.data?.type === 'SYNCED_NOTIFIED_IDS' && Array.isArray(event.data.notifiedIds)) {
      try {
        const current = getNotifiedTaskIds();
        const merged = Array.from(new Set([...current, ...event.data.notifiedIds.map(cleanTaskId)]));
        localStorage.setItem(NOTIFIED_TASKS_STORAGE_KEY, JSON.stringify(merged));
      } catch (e) { }
    }
  });
}

export interface ExtendedNotificationOptions extends NotificationOptions {
  renotify?: boolean;
  onClick?: () => void;
}

/**
 * Send an OS-level notification using ServiceWorker showNotification or fallback Notification
 */
export async function sendNativeNotification(
  title: string,
  options: ExtendedNotificationOptions
): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission !== 'granted') {
    return false;
  }

  const notificationOptions: ExtendedNotificationOptions = {
    icon: '/pwa-192x192.svg',
    badge: '/pwa-192x192.svg',
    renotify: false, // Ensures OS never re-chimes or duplicates
    ...options,
  };

  try {
    // 1. Try Service Worker showNotification if active (ensures native OS integration)
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (reg && 'showNotification' in reg) {
          await reg.showNotification(title, notificationOptions);
          return true;
        }
      } catch (swErr) {
        // Fallback to window.Notification
      }
    }

    // 2. Standard Window Notification fallback
    const notif = new Notification(title, notificationOptions);
    if (options.onClick) {
      notif.onclick = () => {
        window.focus();
        options.onClick?.();
        notif.close();
      };
    }
    return true;
  } catch (err) {
    console.warn('[SIA-Orbit] Failed sending OS notification:', err);
    return false;
  }
}

/**
 * Synchronize task deadlines and notification configuration directly to the Service Worker.
 * This enables the Service Worker to schedule alarms and show OS notifications even when all tabs are closed!
 */
export async function syncTasksWithServiceWorker(
  assignments: Assignment[],
  config: TaskNotificationConfig
): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    if (reg && reg.active) {
      reg.active.postMessage({
        type: 'SYNC_TASK_REMINDERS',
        assignments,
        config,
        notifiedIds: getNotifiedTaskIds(),
      });
      console.log('[SIA-Orbit] Synced tasks with background Service Worker.');
    }

    // Register Periodic Background Sync if supported (e.g. Chrome/Edge PWA on Windows)
    if ('periodicSync' in reg) {
      try {
        const status = await (navigator as any).permissions.query({ name: 'periodic-background-sync' });
        if (status.state === 'granted') {
          await (reg as any).periodicSync.register('check-due-tasks', {
            minInterval: 15 * 60 * 1000, // 15 minutes minimum interval
          });
          console.log('[SIA-Orbit] Periodic background sync registered successfully.');
        }
      } catch (pSyncErr) {
        console.debug('[SIA-Orbit] PeriodicSync notice:', pSyncErr);
      }
    }
  } catch (err) {
    console.warn('[SIA-Orbit] Failed syncing with Service Worker:', err);
  }
}

/**
 * Synchronous task sync for window unload / pagehide.
 * Immediately pushes tasks to Service Worker controller before browser tears down page!
 */
export function syncTasksWithServiceWorkerSync(
  assignments: Assignment[],
  config: TaskNotificationConfig
): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const sw = navigator.serviceWorker.controller;
    if (sw) {
      sw.postMessage({
        type: 'SYNC_TASK_REMINDERS',
        assignments,
        config,
        notifiedIds: getNotifiedTaskIds(),
        tabClosing: true,
      });
      console.log('[SIA-Orbit] Synchronously posted closing sync to Service Worker.');
    }
  } catch (err) {
    console.warn('[SIA-Orbit] Failed synchronous close sync:', err);
  }
}

/**
 * Schedule a background countdown test notification (e.g. 10s).
 * User can immediately close tab to test if OS notification pops up while tab is closed!
 */
export async function scheduleBackgroundTestNotification(seconds: number = 10): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }
  try {
    const reg = await navigator.serviceWorker.ready;
    const sw = reg.active || navigator.serviceWorker.controller;
    if (sw) {
      sw.postMessage({
        type: 'TEST_BACKGROUND_COUNTDOWN',
        seconds,
      });
      return true;
    }
  } catch (err) {
    console.warn('[SIA-Orbit] Failed scheduling background test:', err);
  }
  return false;
}

/**
 * Send an immediate test notification to verify OS integration (via SW or Native Notification)
 */
export async function sendTestNotification(reminderMinutes: number): Promise<boolean> {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.active) {
        reg.active.postMessage({
          type: 'TEST_SW_NOTIFICATION',
          reminderMinutes,
        });
        return true;
      }
    } catch (e) {
      // Fallback
    }
  }

  const title = '🛰️ Pengujian Notifikasi SIA-Orbit';
  const body = `Pengingat tugas terhubung dengan OS! Notifikasi akan muncul ${reminderMinutes} menit sebelum batas waktu.`;

  return sendNativeNotification(title, {
    body,
    tag: 'sia-orbit-test-notification',
    renotify: false,
  });
}

/**
 * Core Background Service function: Check all pending assignments against configured reminder threshold.
 * Strictly guarantees: Exactly ONE notification per task (no spamming).
 */
export async function checkDueTasksAndNotify(
  assignments: Assignment[],
  config: TaskNotificationConfig,
  onTaskClicked?: (task: Assignment) => void
): Promise<string[]> {
  // Always ensure Service Worker is synchronized with current assignments and notified IDs
  syncTasksWithServiceWorker(assignments, config);

  if (!config.enabled) return [];
  if (getNotificationPermission() !== 'granted') return [];

  // If Service Worker controller is active, the Service Worker is our single authoritative
  // background & foreground notification engine. This completely prevents double-firing or race conditions!
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
    return [];
  }

  // Fallback engine when Service Worker controller is not yet active:
  const now = Date.now();
  const notifiedIds = getNotifiedTaskIds();
  const newlyNotified: string[] = [];

  for (const assignment of assignments) {
    // Only check active (uncompleted) assignments
    if (assignment.status === 'completed') continue;

    const taskId = cleanTaskId(assignment.id);
    if (!taskId) continue;

    // STRICT CHECK: Skip if already notified (strictly once per task)
    if (notifiedIds.includes(taskId)) continue;

    const dueTime = new Date(assignment.dueDate).getTime();
    if (isNaN(dueTime)) continue;

    const diffMs = dueTime - now;
    const remainingMinutes = Math.floor(diffMs / (1000 * 60));

    // Check if the assignment is due within the configured reminder window
    // (from now up to config.reminderMinutes in future, or just became due within last 15m)
    const isWithinReminderWindow =
      (remainingMinutes > 0 && remainingMinutes <= config.reminderMinutes) ||
      (diffMs <= 0 && now - dueTime < 15 * 60 * 1000);

    if (isWithinReminderWindow) {
      // Mark immediately before async operations to prevent duplicate triggers
      markTaskAsNotified(taskId);

      const dueTimeFormatted = new Date(assignment.dueDate).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const dueDateFormatted = new Date(assignment.dueDate).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
      });

      const title = `⚠️ Pengingat Tenggat Tugas: ${assignment.courseCode || 'PJJ'}`;
      const body =
        remainingMinutes > 0
          ? `Tugas "${assignment.title}" jatuh tempo dalam ${remainingMinutes} menit (${dueDateFormatted}, ${dueTimeFormatted} WIB)!`
          : `Tugas "${assignment.title}" batas waktunya sekarang (${dueDateFormatted}, ${dueTimeFormatted} WIB)!`;

      const sent = await sendNativeNotification(title, {
        body,
        tag: `task-due-${taskId}`, // Unique static tag per task ensures OS never duplicates
        renotify: false, // Prevents OS re-chiming or re-vibrating
        silent: !config.soundEnabled,
        onClick: () => {
          onTaskClicked?.(assignment);
        },
      });

      if (sent) {
        newlyNotified.push(taskId);
      }
    }
  }

  return newlyNotified;
}
