/**
 * Storage Manager - Abstraction layer for Vercel KV or localStorage
 * Provides consistent API regardless of backend
 */

const StorageManager = {
  /**
   * Detect if Vercel KV is available
   */
  isKVAvailable: typeof fetch !== 'undefined',

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

    // Skip KV API call in local development (http-server can't run Node.js)
    // Just use localStorage directly for local testing
    if (!this._isProduction()) {
      try {
        localStorage.setItem(key, JSON.stringify(data));
        console.log('✓ Saved to localStorage:', key);
        return { ok: true, method: 'localStorage' };
      } catch (lsError) {
        console.error('✗ localStorage save failed:', lsError);
        return { ok: false, error: lsError };
      }
    }

    // Try Vercel KV first (production only)
    if (this.isKVAvailable) {
      try {
        const response = await fetch('/api/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: key,
            data: data
          })
        });

        if (!response.ok) throw new Error('KV save failed');

        console.log('✓ Saved to Vercel KV:', key);
        return { ok: true, method: 'kv' };
      } catch (kvError) {
        console.warn('⚠ KV save failed, falling back to localStorage:', kvError);
      }
    }

    // Fallback to localStorage
    try {
      localStorage.setItem(key, JSON.stringify(data));
      console.log('✓ Saved to localStorage:', key);
      return { ok: true, method: 'localStorage' };
    } catch (lsError) {
      console.error('✗ localStorage save failed:', lsError);
      return { ok: false, error: lsError };
    }
  },

  /**
   * Load schedule data
   * @param {string} key - Storage key
   */
  async load(key) {
    // Skip KV API call in local development
    if (!this._isProduction()) {
      try {
        const item = localStorage.getItem(key);
        const data = item ? JSON.parse(item) : this._getDefaultSchedule();
        console.log('✓ Loaded from localStorage:', key);
        return data;
      } catch (lsError) {
        console.warn('⚠ localStorage load failed, using default:', lsError);
        return this._getDefaultSchedule();
      }
    }

    // Try Vercel KV first (production only)
    if (this.isKVAvailable) {
      try {
        const response = await fetch(`/api/schedule?key=${key}`);

        if (response.ok) {
          const data = await response.json();
          console.log('✓ Loaded from Vercel KV:', key);
          return data;
        }
      } catch (kvError) {
        console.warn('⚠ KV load failed, trying localStorage:', kvError);
      }
    }

    // Fallback to localStorage
    try {
      const data = localStorage.getItem(key);
      if (data) {
        console.log('✓ Loaded from localStorage:', key);
        return JSON.parse(data);
      }
    } catch (lsError) {
      console.warn('⚠ localStorage load failed:', lsError);
    }

    // Return empty schedule if nothing found
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
        lastSync: 0,
        lastModified: 0
      }
    };
  },

  /**
   * Delete schedule data
   */
  async delete(key) {
    // Try KV
    if (this.isKVAvailable) {
      try {
        await fetch('/api/schedule', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key })
        });
        console.log('✓ Deleted from Vercel KV:', key);
      } catch (e) {
        console.warn('⚠ KV delete failed, trying localStorage:', e);
      }
    }

    // Try localStorage
    try {
      localStorage.removeItem(key);
      console.log('✓ Deleted from localStorage:', key);
    } catch (e) {
      console.warn('⚠ localStorage delete failed:', e);
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
        console.log('📢 Received schedule update from another tab');
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
   * Check if running in production (Vercel)
   */
  _isProduction() {
    return typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
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
