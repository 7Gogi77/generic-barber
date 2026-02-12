/**
 * Storage Manager - Abstraction layer with API sync
 * Uses /api/schedule (schedule.js) with localStorage fallback
 */

const StorageManager = {
  /**
   * Schedule API endpoint
   */
  apiUrl: '/api/schedule',

  /**
   * Resolve schedule key (override via window.SCHEDULE_KEY or localStorage)
   */
  _getKey(defaultKey) {
    try {
      if (typeof window !== 'undefined' && window.SCHEDULE_KEY) return String(window.SCHEDULE_KEY);
      const stored = localStorage.getItem('schedule_key');
      if (stored) return stored;
    } catch (_) {
      // ignore
    }
    return defaultKey || 'default';
  },

  /**
   * Save schedule data
   * @param {string} key - Storage key
   * @param {ScheduleState} data - Data to save
   */
  async save(key, data) {
    const scheduleKey = this._getKey(key);
    // Add metadata
    data.metadata = data.metadata || {};
    data.metadata.lastModified = Date.now();
    data.metadata.lastSync = Date.now();

    // Always save to localStorage first (fast, reliable)
    try {
      localStorage.setItem(scheduleKey, JSON.stringify(data));
      console.log('[ok] Saved to localStorage:', scheduleKey);
    } catch (lsError) {
      console.warn('[warn] localStorage save failed:', lsError);
    }

    // Sync to schedule API (schedule.js)
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: scheduleKey, data })
      });

      if (response.ok) {
        console.log('[ok] Saved to API:', scheduleKey);
        return { ok: true, method: 'api' };
      }
      throw new Error('API save failed');
    } catch (apiError) {
      console.warn('[warn] API save failed:', apiError);
      // localStorage already saved, so return ok
      return { ok: true, method: 'localStorage' };
    }
  },

  /**
   * Load schedule data
   * @param {string} key - Storage key
   */
  async load(key) {
    const scheduleKey = this._getKey(key);
    // Try API first (single source of truth)
    try {
      const response = await fetch(`${this.apiUrl}?key=${encodeURIComponent(scheduleKey)}`);

      if (response.ok) {
        const data = await response.json();

        if (data && data.events) {
          console.log('[ok] Loaded from API:', scheduleKey, '- Events:', data.events.length);
          // Update localStorage cache
          localStorage.setItem(scheduleKey, JSON.stringify(data));
          return data;
        }
      }
    } catch (apiError) {
      console.warn('[warn] API load failed, trying localStorage:', apiError);
    }

    // Fallback to localStorage
    try {
      const item = localStorage.getItem(scheduleKey);
      if (item) {
        const data = JSON.parse(item);
        console.log('[ok] Loaded from localStorage:', scheduleKey);
        return data;
      }
    } catch (lsError) {
      console.warn('[warn] localStorage load failed:', lsError);
    }

    // Return default schedule
    console.log('[info] No schedule found, returning default');
    return this._getDefaultSchedule();
  },

  /**
   * Delete schedule data
   */
  async delete(key) {
    const scheduleKey = this._getKey(key);
    // Delete from API
    try {
      await fetch(this.apiUrl, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: scheduleKey })
      });
      console.log('[ok] Deleted from API:', scheduleKey);
    } catch (e) {
      console.warn('[warn] API delete failed:', e);
    }

    // Delete from localStorage
    try {
      localStorage.removeItem(scheduleKey);
      console.log('[ok] Deleted from localStorage:', scheduleKey);
    } catch (e) {
      console.warn('[warn] localStorage delete failed:', e);
    }
  },

  /**
   * Setup real-time sync between tabs using BroadcastChannel
   */
  setupSync(onScheduleUpdated) {
    if (typeof BroadcastChannel === 'undefined') {
      console.warn('BroadcastChannel not available');
      return;
    }

    const channel = new BroadcastChannel('schedule-updates');

    channel.onmessage = (event) => {
      if (event.data.type === 'SCHEDULE_UPDATED') {
        console.log('[info] Received schedule update from another tab');
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
