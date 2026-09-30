// Safe LocalStorage and In-Memory Fallback Cache Manager
// Prevents QuotaExceededError crashes when storing large student, GTK, Pangkat, or KGB datasets

const memoryStore = new Map<string, string>();

// Non-critical keys that can be purged if localStorage is full
const PURGEABLE_KEYS = [
  'dapodik_cached_attendance',
  'dapodik_cached_students',
  'dapodik_cached_gtk',
  'smkn1_riwayat_kgb_data',
  'smkn1_riwayat_pangkat_data'
];

/**
 * Attempts to free up localStorage space by removing or trimming non-critical cached data
 */
function freeStorageSpace(excludeKey?: string) {
  try {
    for (const key of PURGEABLE_KEYS) {
      if (key !== excludeKey && typeof window !== 'undefined' && window.localStorage) {
        const val = window.localStorage.getItem(key);
        if (val) {
          // Backup to memoryStore first so in-session data is preserved
          memoryStore.set(key, val);
          window.localStorage.removeItem(key);
          break;
        }
      }
    }
  } catch (e) {
    // Ignore cleanup errors
  }
}

/**
 * Safely saves data to localStorage with automatic QuotaExceededError recovery and in-memory fallback
 */
export function safeSetItem<T = any>(key: string, value: T): boolean {
  if (typeof window === 'undefined') return false;

  let serialized: string;
  try {
    serialized = typeof value === 'string' ? value : JSON.stringify(value);
  } catch (e) {
    console.warn(`[Storage] Failed to serialize value for key "${key}":`, e);
    return false;
  }

  // Always keep in memory store as fallback
  memoryStore.set(key, serialized);

  try {
    window.localStorage.setItem(key, serialized);
    return true;
  } catch (err: any) {
    // Check if error is QuotaExceededError
    const isQuotaError =
      err?.name === 'QuotaExceededError' ||
      err?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      err?.code === 22 ||
      err?.code === 1014 ||
      (typeof err?.message === 'string' && err.message.toLowerCase().includes('quota'));

    if (isQuotaError) {
      // Try to free up space from older caches and retry once
      freeStorageSpace(key);
      try {
        window.localStorage.setItem(key, serialized);
        return true;
      } catch (retryErr) {
        // Still failed, we safely hold in memoryStore without throwing
        console.warn(`[Storage] Storage quota reached. Storing "${key}" in active memory session.`);
        return false;
      }
    } else {
      console.warn(`[Storage] Unable to save key "${key}" to localStorage:`, err);
      return false;
    }
  }
}

/**
 * Safely retrieves and parses data from localStorage or in-memory fallback
 */
export function safeGetItem<T = any>(key: string, fallbackValue: T): T {
  if (typeof window === 'undefined') return fallbackValue;

  try {
    const item = window.localStorage.getItem(key);
    if (item !== null && item !== undefined) {
      // Keep memory store synced
      memoryStore.set(key, item);
      try {
        return JSON.parse(item) as T;
      } catch {
        return item as unknown as T;
      }
    }
  } catch (e) {
    // Fall back to memoryStore if localStorage.getItem is blocked
  }

  // Check memoryStore
  if (memoryStore.has(key)) {
    const memItem = memoryStore.get(key)!;
    try {
      return JSON.parse(memItem) as T;
    } catch {
      return memItem as unknown as T;
    }
  }

  return fallbackValue;
}

/**
 * Safely removes an item from both localStorage and memory store
 */
export function safeRemoveItem(key: string): void {
  memoryStore.delete(key);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  } catch (e) {
    // Ignore error
  }
}
