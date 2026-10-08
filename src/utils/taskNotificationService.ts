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
 * Get the list of assignment IDs that have already been notified
 */
export function getNotifiedTaskIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(NOTIFIED_TASKS_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (err) {
    console.warn('[SIA-Orbit] Failed to read notified task IDs:', err);
  }
  return [];
}

/**
 * Record a task ID as notified
 */
export function markTaskAsNotified(taskId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getNotifiedTaskIds();
    if (!current.includes(taskId)) {
      const updated = [...current, taskId];
      localStorage.setItem(NOTIFIED_TASKS_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch (err) {
    console.warn('[SIA-Orbit] Failed to update notified task IDs:', err);
  }
}

/**
 * Clear the list of notified task IDs (useful for testing or resetting cycle)
 */
export function clearNotifiedTaskHistory(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(NOTIFIED_TASKS_STORAGE_KEY);
}

/**
 * Send an OS-level notification using ServiceWorker showNotification or fallback Notification
 */
export async function sendNativeNotification(
  title: string,
  options: NotificationOptions & { onClick?: () => void }
): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission !== 'granted') {
    return false;
  }

  const notificationOptions: NotificationOptions = {
    icon: '/pwa-192x192.svg',
    badge: '/pwa-192x192.svg',
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

    // 2. Standard Window Notification
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
 * Send an immediate test notification to verify OS integration
 */
export async function sendTestNotification(reminderMinutes: number): Promise<boolean> {
  const title = '🛰️ Pengujian Notifikasi SIA-Orbit';
  const body = `Pengingat tugas berhasil terhubung dengan OS! Notifikasi akan muncul ${reminderMinutes} menit sebelum batas waktu.`;

  return sendNativeNotification(title, {
    body,
    tag: 'sia-orbit-test-notification',
  });
}

/**
 * Core Background Service function: Check all pending assignments against configured reminder threshold
 */
export async function checkDueTasksAndNotify(
  assignments: Assignment[],
  config: TaskNotificationConfig,
  onTaskClicked?: (task: Assignment) => void
): Promise<string[]> {
  if (!config.enabled) return [];
  if (getNotificationPermission() !== 'granted') return [];

  const now = Date.now();
  const notifiedIds = getNotifiedTaskIds();
  const newlyNotified: string[] = [];

  for (const assignment of assignments) {
    // Only check active (uncompleted) assignments
    if (assignment.status === 'completed') continue;

    const dueTime = new Date(assignment.dueDate).getTime();
    if (isNaN(dueTime)) continue;

    const diffMs = dueTime - now;
    const remainingMinutes = Math.floor(diffMs / (1000 * 60));

    // Check if the assignment is due within the configured reminder window (and hasn't expired too long ago, e.g. within -10m to config.reminderMinutes)
    const isWithinReminderWindow = remainingMinutes > 0 && remainingMinutes <= config.reminderMinutes;

    if (isWithinReminderWindow) {
      const notificationKey = `${assignment.id}-${config.reminderMinutes}m`;
      if (!notifiedIds.includes(notificationKey)) {
        const dueTimeFormatted = new Date(assignment.dueDate).toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
        });
        const dueDateFormatted = new Date(assignment.dueDate).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
        });

        const title = `⚠️ Pengingat Tenggat Tugas: ${assignment.courseCode}`;
        const body = `Tugas "${assignment.title}" jatuh tempo dalam ${remainingMinutes} menit (${dueDateFormatted}, ${dueTimeFormatted} WIB)!`;

        const sent = await sendNativeNotification(title, {
          body,
          tag: `task-reminder-${assignment.id}`,
          onClick: () => {
            onTaskClicked?.(assignment);
          },
        });

        if (sent) {
          markTaskAsNotified(notificationKey);
          newlyNotified.push(assignment.id);
        }
      }
    }
  }

  return newlyNotified;
}
