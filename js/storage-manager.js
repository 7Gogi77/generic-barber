/**
 * Storage Manager - Abstraction layer with remote DB sync
 * Uses the configured realtime-compatible backend for cross-device access
 */

const StorageManager = {
  /**
   * Backward-compatible property name used by older scripts.
   */
  firebaseUrl: null,

  getDatabaseBaseUrl() {
    const resolved = window.AppBackend && typeof window.AppBackend.getDatabaseBaseUrl === 'function'
      ? window.AppBackend.getDatabaseBaseUrl()
      : 'https://barber-shop-9b2ac-default-rtdb.europe-west1.firebasedatabase.app';

    this.firebaseUrl = resolved;
    return resolved;
  },

  getDatabaseUrl(path, searchParams) {
    if (window.AppBackend && typeof window.AppBackend.getDatabaseUrl === 'function') {
      return window.AppBackend.getDatabaseUrl(path, searchParams);
    }

    const base = this.getDatabaseBaseUrl();
    const cleanPath = String(path || '').replace(/^\/+/, '');
    return cleanPath ? `${base}/${cleanPath}` : base;
  },

  /**
   * Save schedule data
   * @param {string} key - Storage key
   * @param {ScheduleState} data - Data to save
   */
  async save(key, data) {
    // Add metadata
    data.metadata = data.metadata || {};
    data.metadata.lastModified = Date.now();
    data.metadata.lastSync = Date.now();

    // Always save to localStorage first (fast, reliable)
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (lsError) {
    }

    // Always sync to the configured remote DB when available.
    try {
      const response = await fetch(this.getDatabaseUrl(`${key}.json`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        return { ok: true, method: 'remote' };
      } else {
        throw new Error('Remote save failed');
      }
    } catch (fbError) {
      // localStorage already saved, so return ok
      return { ok: true, method: 'localStorage' };
    }
  },

  /**
   * Load schedule data
   * @param {string} key - Storage key
   * @param {boolean} forceRefresh - Force reload from Firebase, bypassing cache
   */
  async load(key, forceRefresh = false) {
    // Try remote DB first (single source of truth) with cache-busting.
    try {
      const cacheBuster = forceRefresh ? `?t=${Date.now()}` : '';
      const response = await fetch(`${this.getDatabaseUrl(`${key}.json`)}${cacheBuster}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data && data.events) {
          // Update localStorage cache
          localStorage.setItem(key, JSON.stringify(data));
          // Clear localStorage cache only AFTER successful remote load with data.
          if (forceRefresh) {
          }
          return data;
        } else if (data === null || !data.events) {
          // If forcing refresh but remote data is empty, try localStorage as backup.
          if (forceRefresh) {
            const item = localStorage.getItem(key);
            if (item) {
              const localData = JSON.parse(item);
              if (localData && localData.events && localData.events.length > 0) {
                return localData;
              }
            }
          }
        }
      }
    } catch (fbError) {
    }

    // Fallback to localStorage
    if (!forceRefresh) {
      try {
        const item = localStorage.getItem(key);
        if (item) {
          const data = JSON.parse(item);
          return data;
        }
      } catch (lsError) {
      }
    } else {
      // Even with force refresh, if Firebase failed, try localStorage
      try {
        const item = localStorage.getItem(key);
        if (item) {
          const data = JSON.parse(item);
          return data;
        }
      } catch (lsError) {
      }
    }

    // Return default schedule
    return this._getDefaultSchedule();
  },

  /**
   * Delete schedule data
   */
  async delete(key) {
    // Delete from Firebase
    try {
      await fetch(this.getDatabaseUrl(`${key}.json`), {
        method: 'DELETE'
      });
    } catch (e) {
    }

    // Delete from localStorage
    try {
      localStorage.removeItem(key);
    } catch (e) {
    }
  },

  /**
   * Setup real-time sync between tabs using BroadcastChannel
   */
  setupSync(onScheduleUpdated) {
    if (typeof BroadcastChannel === 'undefined') {
      return;
    }

    const channel = new BroadcastChannel('schedule-updates');

    channel.onmessage = (event) => {
      if (event.data.type === 'SCHEDULE_UPDATED') {
        if (onScheduleUpdated) {
          onScheduleUpdated(event.data.data);
        }
      }
    };

    return channel;
  },

  /**
   * Broadcast schedule update to other tabs
   */
  broadcastUpdate(scheduleData) {
    if (typeof BroadcastChannel === 'undefined') return;

    const channel = new BroadcastChannel('schedule-updates');
    channel.postMessage({
      type: 'SCHEDULE_UPDATED',
      data: scheduleData,
      timestamp: Date.now()
    });
  },

  /**
   * Export schedule as JSON file
   */
  exportAsJSON(scheduleData, filename = 'schedule.json') {
    const jsonString = JSON.stringify(scheduleData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  },

  /**
   * Import schedule from JSON file
   */
  async importFromJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          resolve(data);
        } catch (err) {
          reject(new Error('Invalid JSON file'));
        }
      };

      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  },

  /**
   * Get default empty schedule
   */
  _getDefaultSchedule() {
    return {
      version: '1.0',
      timezone: 'UTC',
      settings: {
        weekStart: 1,
        defaultWorkStart: 9,
        defaultWorkEnd: 17
      },
      events: [],
      metadata: {
        lastSync: Date.now(),
        lastModified: Date.now()
      }
    };
  }
};

// Auto-setup sync listeners when page loads
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    StorageManager.setupSync((scheduleData) => {
      // Trigger calendar refresh
      if (window.onScheduleUpdated) {
        window.onScheduleUpdated(scheduleData);
      }
    });
  });
}

// Export StorageManager to window
window.StorageManager = StorageManager;
