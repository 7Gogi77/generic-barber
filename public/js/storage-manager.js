/**
 * Storage Manager - Abstraction layer with Firebase sync
 * Always syncs to Firebase for reliable cross-device access
 */

const StorageManager = {
  /**
   * Firebase Database URL
   */
  firebaseUrl: 'https://barber-shop-9b2ac-default-rtdb.europe-west1.firebasedatabase.app',

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
      console.log('[ok] Saved to localStorage:', key);
    } catch (lsError) {
      console.warn('[warn] localStorage save failed:', lsError);
    }

    // Always sync to Firebase (works everywhere)
    try {
      const response = await fetch(`${this.firebaseUrl}/${key}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        console.log('[ok] Saved to Firebase:', key);
        return { ok: true, method: 'firebase' };
      }
      throw new Error('Firebase save failed');
    } catch (fbError) {
      console.warn('[warn] Firebase save failed:', fbError);
      // localStorage already saved, so return ok
      return { ok: true, method: 'localStorage' };
    }
  },

  /**
   * Load schedule data
   * @param {string} key - Storage key
   */
  async load(key) {
    // Try Firebase first (single source of truth)
    try {
      const response = await fetch(`${this.firebaseUrl}/${key}.json`);

      if (response.ok) {
        const data = await response.json();

        if (data && data.events) {
          console.log('[ok] Loaded from Firebase:', key, '- Events:', data.events.length);
          // Update localStorage cache
          localStorage.setItem(key, JSON.stringify(data));
          return data;
        }
      }
    } catch (fbError) {
      console.warn('[warn] Firebase load failed, trying localStorage:', fbError);
    }

    // Fallback to localStorage
    try {
      const item = localStorage.getItem(key);
      if (item) {
        const data = JSON.parse(item);
        console.log('[ok] Loaded from localStorage:', key);
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
    // Delete from Firebase
    try {
      await fetch(`${this.firebaseUrl}/${key}.json`, {
        method: 'DELETE'
      });
      console.log('[ok] Deleted from Firebase:', key);
    } catch (e) {
      console.warn('[warn] Firebase delete failed:', e);
    }

    // Delete from localStorage
    try {
      localStorage.removeItem(key);
      console.log('[ok] Deleted from localStorage:', key);
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
