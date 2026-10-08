/**
 * SIA-Orbit Service Worker Background Task Reminder Engine
 * Delivers OS-level notifications even when tabs are closed.
 * Strictly guarantees: Exactly ONE notification per task (strictly no spamming).
 * Uses Service Worker Keep-Alive & Event-Extension to ensure delivery when tab is closed.
 */

const DB_NAME = 'sia_orbit_background_db';
const DB_VERSION = 1;
const STORE_NAME = 'task_store';

// In-memory set for instantaneous, synchronous deduplication
const notifiedTaskIds = new Set();
// Map of taskId -> { timerId, dueTime, resolvePromise }
const activeTimers = new Map();

// Install event: Do NOT skip waiting automatically. Wait for user consent.
self.addEventListener('install', () => {
  console.log('[SIA-Orbit SW] New service worker installed. Waiting for user activation.');
});

self.addEventListener('activate', (event) => {
  console.log('[SIA-Orbit SW] Service worker activated.');
});

/**
 * Open or create IndexedDB in Service Worker
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

/**
 * Save data to IndexedDB
 */
async function saveToDB(key, value) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(value, key);
      req.onsuccess = () => resolve(true);
      req.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.warn('[SW-Reminder] Error saving to DB:', err);
    return false;
  }
}

/**
 * Read data from IndexedDB
 */
async function readFromDB(key) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.warn('[SW-Reminder] Error reading from DB:', err);
    return null;
  }
}

/**
 * Clean and normalize any task ID (stripping legacy -<num>m suffixes)
 */
function cleanTaskId(id) {
  if (typeof id !== 'string') return '';
  return id.replace(/-\d+m$/, '');
}

/**
 * Initialize in-memory notified set from IndexedDB
 */
async function initNotifiedIdsFromDB() {
  try {
    const saved = await readFromDB('notifiedIds');
    if (Array.isArray(saved)) {
      saved.forEach((id) => {
        const cleaned = cleanTaskId(id);
        if (cleaned) notifiedTaskIds.add(cleaned);
      });
    }
  } catch (err) {
    console.warn('[SW-Reminder] Failed loading notified IDs:', err);
  }
}

// Preload on SW startup
initNotifiedIdsFromDB();

/**
 * Display OS notification for a due task (strictly once per task)
 */
async function showTaskNotification(task, minutesBefore, config) {
  if (!task || !task.id) return;
  const taskId = cleanTaskId(task.id);
  if (!taskId) return;

  // STRICT SINGLE-NOTIFICATION CHECK:
  // If this task has ever been notified, NEVER notify again under any circumstances.
  if (notifiedTaskIds.has(taskId)) {
    return;
  }

  // Atomically mark task as notified synchronously BEFORE any async calls
  notifiedTaskIds.add(taskId);

  // Clear any existing timer for this task
  if (activeTimers.has(taskId)) {
    const t = activeTimers.get(taskId);
    clearTimeout(t.timerId || t);
    if (typeof t.resolvePromise === 'function') {
      t.resolvePromise();
    }
    activeTimers.delete(taskId);
  }

  // Persist to IndexedDB
  try {
    const dbList = (await readFromDB('notifiedIds')) || [];
    const normalizedDbList = dbList.map(cleanTaskId);
    if (!normalizedDbList.includes(taskId)) {
      normalizedDbList.push(taskId);
      await saveToDB('notifiedIds', normalizedDbList);
    }
  } catch (e) {
    console.warn('[SW-Reminder] Failed persisting notified task ID to DB:', e);
  }

  // Broadcast to all open client windows so their localStorage updates immediately
  try {
    const windowClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windowClients) {
      client.postMessage({
        type: 'TASK_NOTIFIED_BY_SW',
        taskId,
      });
    }
  } catch (e) { }

  if (!self.registration || !('showNotification' in self.registration)) {
    return;
  }

  if (Notification.permission !== 'granted') {
    return;
  }

  const dueTime = new Date(task.dueDate);
  const dueTimeFormatted = !isNaN(dueTime.getTime())
    ? dueTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
    : 'Segera';

  const title = `⚠️ Tenggat Tugas Dekat: ${task.courseCode || 'PJJ'}`;
  let body;
  if (minutesBefore <= 0) {
    body = `Tugas "${task.title}" batas waktunya sekarang (${dueTimeFormatted})!`;
  } else {
    body = `Tugas "${task.title}" jatuh tempo dalam ${minutesBefore} menit (${dueTimeFormatted})!`;
  }

  const options = {
    body,
    icon: '/pwa-192x192.svg',
    badge: '/pwa-192x192.svg',
    tag: `task-due-${taskId}`, // Unique, static tag per task ensures OS never duplicates
    renotify: false, // Prevents OS from re-chiming or re-vibrating
    silent: config && config.soundEnabled === false,
    requireInteraction: true,
    data: {
      taskId,
      url: '/?tab=assignments',
      dueDate: task.dueDate,
    },
    actions: [
      { action: 'open_task', title: 'Buka Tugas' },
      { action: 'dismiss', title: 'Tutup' },
    ],
  };

  try {
    await self.registration.showNotification(title, options);
    console.log(`[SW-Reminder] OS notification dispatched once for: ${task.title} (ID: ${taskId})`);
  } catch (err) {
    console.warn('[SW-Reminder] Failed to show OS notification:', err);
  }
}

/**
 * Schedule timers or alarms for upcoming tasks.
 * Returns an array of imminent promises so event.waitUntil can keep the Service Worker
 * alive when the tab closes!
 */
async function scheduleTaskReminders(assignments, config) {
  if (!config || !config.enabled) return [];
  if (!Array.isArray(assignments)) return [];

  await initNotifiedIdsFromDB();

  const now = Date.now();
  const reminderMinutes = config.reminderMinutes || 60;
  const imminentPromises = [];

  // Clear timers for tasks that are no longer in assignments or are completed
  const activeTaskIds = new Set(
    assignments.filter((t) => t && t.status !== 'completed').map((t) => cleanTaskId(t.id))
  );
  for (const [taskId, timerObj] of activeTimers.entries()) {
    if (!activeTaskIds.has(taskId) || notifiedTaskIds.has(taskId)) {
      clearTimeout(timerObj.timerId || timerObj);
      if (typeof timerObj.resolvePromise === 'function') {
        timerObj.resolvePromise();
      }
      activeTimers.delete(taskId);
    }
  }

  for (const task of assignments) {
    if (!task || !task.id) continue;
    const taskId = cleanTaskId(task.id);

    // Only check active, uncompleted tasks
    if (task.status === 'completed') continue;

    // STRICT CHECK: Skip if already notified (strictly once per task)
    if (notifiedTaskIds.has(taskId)) {
      continue;
    }

    const dueTime = new Date(task.dueDate).getTime();
    if (isNaN(dueTime)) continue;

    const reminderTime = dueTime - reminderMinutes * 60 * 1000;
    const delayMs = reminderTime - now;

    // 1. If Notification Triggers API (TimestampTrigger) is supported (OS-level scheduling)
    if ('showTrigger' in Notification.prototype && 'TimestampTrigger' in self) {
      if (reminderTime > now) {
        try {
          const dueFormatted =
            new Date(task.dueDate).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) +
            ' WIB';

          // Mark as notified immediately
          notifiedTaskIds.add(taskId);
          const dbList = (await readFromDB('notifiedIds')) || [];
          const normalized = dbList.map(cleanTaskId);
          if (!normalized.includes(taskId)) {
            normalized.push(taskId);
            await saveToDB('notifiedIds', normalized);
          }

          self.registration.showNotification(`⚠️ Tenggat Tugas Dekat: ${task.courseCode || 'PJJ'}`, {
            body: `Tugas "${task.title}" jatuh tempo dalam ${reminderMinutes} menit (${dueFormatted})!`,
            icon: '/pwa-192x192.svg',
            badge: '/pwa-192x192.svg',
            tag: `task-due-${taskId}`,
            renotify: false,
            silent: config && config.soundEnabled === false,
            // @ts-ignore
            showTrigger: new self.TimestampTrigger(reminderTime),
            data: { taskId, url: '/?tab=assignments' },
          });
          console.log(`[SW-Reminder] Scheduled once via TimestampTrigger for ${new Date(reminderTime).toISOString()}`);
          continue;
        } catch (e) {
          console.debug('[SW-Reminder] TimestampTrigger fallback to timer:', e);
        }
      }
    }

    // 2. Near-term imminent timer (within next 5 minutes):
    // Wrap in a Promise and return it so event.waitUntil can keep the Service Worker alive after tab close!
    if (delayMs > 0 && delayMs <= 5 * 60 * 1000) {
      if (activeTimers.has(taskId)) {
        const existing = activeTimers.get(taskId);
        if (existing.dueTime === dueTime) {
          continue;
        }
        clearTimeout(existing.timerId || existing);
        if (typeof existing.resolvePromise === 'function') existing.resolvePromise();
      }

      let resolveFn;
      const imminentPromise = new Promise((resolve) => {
        resolveFn = resolve;
        const timerId = setTimeout(async () => {
          activeTimers.delete(taskId);
          await showTaskNotification(task, reminderMinutes, config);
          resolve();
        }, delayMs);

        activeTimers.set(taskId, { timerId, dueTime, resolvePromise: resolve });
      });

      imminentPromises.push(imminentPromise);
      console.log(`[SW-Reminder] Imminent background task scheduled for "${task.title}" in ${Math.round(delayMs / 1000)}s (Keep-Alive active).`);
    } else if (delayMs > 5 * 60 * 1000 && delayMs < 24 * 60 * 60 * 1000) {
      // 3. Medium-term timer (between 5 minutes and 24 hours)
      if (activeTimers.has(taskId)) {
        const existing = activeTimers.get(taskId);
        if (existing.dueTime === dueTime) {
          continue;
        }
        clearTimeout(existing.timerId || existing);
      }

      const timerId = setTimeout(() => {
        activeTimers.delete(taskId);
        showTaskNotification(task, reminderMinutes, config);
      }, delayMs);

      activeTimers.set(taskId, { timerId, dueTime });
      console.log(`[SW-Reminder] Scheduled single timer for ${task.title} in ${Math.round(delayMs / 1000 / 60)}m`);
    } else if (delayMs <= 0 && now - dueTime < 30 * 60 * 1000) {
      // Within due window right now (e.g. less than 30 min overdue) -> fire once immediately!
      const remainingMinutes = Math.max(0, Math.floor((dueTime - now) / (1000 * 60)));
      const immediatePromise = showTaskNotification(task, remainingMinutes, config);
      imminentPromises.push(immediatePromise);
    }
  }

  return imminentPromises;
}

/**
 * Check all stored tasks against current time (runs periodically in background)
 */
async function checkAllTasksInSW() {
  try {
    const config = await readFromDB('config');
    const assignments = await readFromDB('assignments');
    if (config && assignments && Array.isArray(assignments)) {
      await scheduleTaskReminders(assignments, config);
    }
  } catch (err) {
    console.warn('[SW-Reminder] Periodic check failed:', err);
  }
}

// Background interval loop inside Service Worker: runs every 30 seconds
setInterval(() => {
  checkAllTasksInSW();
}, 30000);

// Listen for Periodic Background Sync event (OS-driven PWA sync)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-due-tasks') {
    event.waitUntil(checkAllTasksInSW());
  }
});

// Listen for Web Push events from server / push service
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { body: event.data ? event.data.text() : 'Tenggat tugas kuliah sudah dekat!' };
  }

  const title = payload.title || '⚠️ Pengingat Tenggat Tugas: UNSIA PJJ';
  const options = {
    body: payload.body || 'Ada tugas yang mendekati batas waktu pengumpulan.',
    icon: '/pwa-192x192.svg',
    badge: '/pwa-192x192.svg',
    tag: payload.tag || `task-due-${payload.taskId || 'general'}`,
    renotify: false,
    requireInteraction: true,
    data: {
      taskId: payload.taskId,
      url: payload.url || '/?tab=assignments',
    },
    actions: [
      { action: 'open_task', title: 'Buka Tugas' },
      { action: 'dismiss', title: 'Tutup' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Listen for messages from client tabs
self.addEventListener('message', (event) => {
  if (!event.data) return;

  // Handle user-consented update activation
  if (event.data.type === 'SKIP_WAITING') {
    console.log('[SIA-Orbit SW] User consented to update. Skipping waiting.');
    self.skipWaiting();
    return;
  }

  // Sync tasks and configuration from tab
  if (event.data.type === 'SYNC_TASK_REMINDERS') {
    const { assignments, config, notifiedIds } = event.data;
    event.waitUntil(
      (async () => {
        await initNotifiedIdsFromDB();
        if (Array.isArray(notifiedIds)) {
          notifiedIds.forEach((id) => {
            const clean = cleanTaskId(id);
            if (clean) notifiedTaskIds.add(clean);
          });
        }
        await saveToDB('config', config);
        await saveToDB('assignments', assignments);
        await saveToDB('notifiedIds', Array.from(notifiedTaskIds));
        
        const imminentPromises = await scheduleTaskReminders(assignments, config);

        // Acknowledge back to client tab with synchronized notified IDs
        if (event.source && 'postMessage' in event.source) {
          event.source.postMessage({
            type: 'SYNCED_NOTIFIED_IDS',
            notifiedIds: Array.from(notifiedTaskIds),
          });
        }

        // KEEP-ALIVE GUARANTEE: If there are imminent tasks (within 5 minutes),
        // keep the Service Worker alive in the background even when all tabs are closed!
        if (imminentPromises && imminentPromises.length > 0) {
          console.log(`[SW-Reminder] Keeping worker alive for ${imminentPromises.length} imminent task(s) after tab close.`);
          await Promise.race([
            Promise.all(imminentPromises),
            new Promise((res) => setTimeout(res, 4.5 * 60 * 1000)), // Safety limit before Chromium 5m hard cap
          ]);
        }
      })()
    );
  }

  // Mark task as notified from client tab
  if (event.data.type === 'MARK_TASK_NOTIFIED') {
    const taskId = cleanTaskId(event.data.taskId);
    if (taskId) {
      notifiedTaskIds.add(taskId);
      if (activeTimers.has(taskId)) {
        const t = activeTimers.get(taskId);
        clearTimeout(t.timerId || t);
        if (typeof t.resolvePromise === 'function') t.resolvePromise();
        activeTimers.delete(taskId);
      }
      event.waitUntil(
        (async () => {
          const current = (await readFromDB('notifiedIds')) || [];
          const normalized = current.map(cleanTaskId);
          if (!normalized.includes(taskId)) {
            normalized.push(taskId);
            await saveToDB('notifiedIds', normalized);
          }
        })()
      );
    }
  }

  // Dedicated background countdown test (guarantees worker stays alive when tab is closed)
  if (event.data.type === 'TEST_BACKGROUND_COUNTDOWN') {
    const seconds = event.data.seconds || 10;
    console.log(`[SW-Reminder] Background countdown test initiated (${seconds}s). Worker will stay alive with tab closed.`);
    event.waitUntil(
      new Promise((resolve) => {
        setTimeout(async () => {
          try {
            await self.registration.showNotification('🛰️ SIA-Orbit: Notifikasi Latar Belakang Berhasil!', {
              body: `Hebat! Notifikasi OS berhasil muncul saat tab sudah ditutup (${seconds} detik yang lalu).`,
              icon: '/pwa-192x192.svg',
              badge: '/pwa-192x192.svg',
              tag: 'sia-orbit-bg-test-success',
              renotify: false,
              requireInteraction: true,
              data: { url: '/?tab=assignments' },
              actions: [
                { action: 'open_task', title: 'Buka SIA-Orbit' },
                { action: 'dismiss', title: 'Tutup' },
              ],
            });
            console.log('[SW-Reminder] Background test notification displayed successfully.');
          } catch (err) {
            console.error('[SW-Reminder] Failed showing background test notification:', err);
          }
          resolve();
        }, seconds * 1000);
      })
    );
  }

  // Immediate test notification request
  if (event.data.type === 'TEST_SW_NOTIFICATION') {
    const reminderMinutes = event.data.reminderMinutes || 60;
    event.waitUntil(
      self.registration.showNotification('🛰️ Pengujian Notifikasi Service Worker', {
        body: `Service Worker terhubung ke OS! Notifikasi pengingat aktif (${reminderMinutes}m sebelum tenggat).`,
        icon: '/pwa-192x192.svg',
        badge: '/pwa-192x192.svg',
        tag: 'sia-orbit-sw-test',
        renotify: false,
        data: { url: '/?tab=assignments' },
      })
    );
  }

  // Clear notified history (e.g. user clicked Reset in Settings)
  if (event.data.type === 'CLEAR_NOTIFIED_HISTORY') {
    notifiedTaskIds.clear();
    activeTimers.forEach((t) => {
      clearTimeout(t.timerId || t);
      if (typeof t.resolvePromise === 'function') t.resolvePromise();
    });
    activeTimers.clear();
    event.waitUntil(saveToDB('notifiedIds', []));
    console.log('[SW-Reminder] Cleared notified task history.');
  }
});

// Handle notification click: Focus or open application window
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow('/?tab=assignments');
      }
    })
  );
});
