/**
 * FIREBASE CONFIGURATION (ES6 MODULE)
 * ===================================
 * Cloud sync for admin panel changes
 * Syncs configuration across all devices in real-time
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getDatabase, ref, set, onValue, get } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

// Your Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyD8uewtysdNPJvVdU5PcK8Y1UlMNU39URc",
    authDomain: "barber-shop-9b2ac.firebaseapp.com",
    databaseURL: "https://barber-shop-9b2ac-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "barber-shop-9b2ac",
    storageBucket: "barber-shop-9b2ac.firebasestorage.app",
    messagingSenderId: "932608200564",
    appId: "1:932608200564:web:f546f33f0ac351633ae621",
    measurementId: "G-7M67GZNK4X"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Cloud Sync Manager
window.CloudSync = {
    isConnected: false,
    syncEnabled: true,
    
    // Initialize cloud sync
    init() {
        // Check connection status
        const connectedRef = ref(database, '.info/connected');
        onValue(connectedRef, (snapshot) => {
            this.isConnected = snapshot.val() === true;
        }, (error) => {
        });
        
        // Listen for remote config changes
        this.listenForConfigChanges();
    },
    
    // Listen for changes from other devices
    listenForConfigChanges() {
        const configRef = ref(database, 'site_config');
        onValue(configRef, (snapshot) => {
            if (snapshot.exists() && this.syncEnabled) {
                const remoteConfig = snapshot.val();
                
                // Extract bookingSettings embedded in site_config
                if (remoteConfig && remoteConfig._bookingSettings) {
                    try { localStorage.setItem('bookingSettings', JSON.stringify(remoteConfig._bookingSettings)); } catch(_) {}
                }

                // Merge remote config with local
                if (!window.SITE_CONFIG || typeof window.SITE_CONFIG !== 'object') {
                    window.SITE_CONFIG = {};
                }
                Object.assign(window.SITE_CONFIG, remoteConfig || {});
                
                // Update localStorage backup (best-effort, skip if quota exceeded)
                try {
                    localStorage.setItem('site_config_backup', JSON.stringify(window.SITE_CONFIG));
                } catch(e) {
                    // Quota exceeded — remove stale backups to free space then retry once
                    try {
                        localStorage.removeItem('site_config_backup');
                        localStorage.setItem('site_config_backup', JSON.stringify(window.SITE_CONFIG));
                    } catch(_) { /* still full — skip backup, Firebase is source of truth */ }
                }
                
                // Refresh UI if on main page
                if (typeof initSite === 'function') {
                    initSite();
                }
            }
        }, (error) => {
        });
    },
    
    // Save config to cloud
    async saveToCloud(config) {
        // Embed bookingSettings inside site_config so it uses the same permitted path
        const bs = localStorage.getItem('bookingSettings');
        if (bs) {
            try { config._bookingSettings = JSON.parse(bs); } catch(_) {}
        }
        // Try Firebase SDK first
        try {
            const configRef = ref(database, 'site_config');
            await set(configRef, config);
            return true;
        } catch (error) {}
        // Fallback: REST PUT (works even when SDK isConnected hasn't fired yet)
        try {
            const res = await fetch('https://barber-shop-9b2ac-default-rtdb.europe-west1.firebasedatabase.app/site_config.json', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });
            return res.ok;
        } catch (_) {}
        return false;
    },
    
    // Load config from cloud on startup
    async loadFromCloud() {
        try {
            const configRef = ref(database, 'site_config');
            const snapshot = await get(configRef);
            if (snapshot.exists()) {
                const cloudConfig = snapshot.val();
                // Extract bookingSettings embedded in site_config
                if (cloudConfig && cloudConfig._bookingSettings) {
                    try { localStorage.setItem('bookingSettings', JSON.stringify(cloudConfig._bookingSettings)); } catch(_) {}
                }
                if (!window.SITE_CONFIG || typeof window.SITE_CONFIG !== 'object') {
                    window.SITE_CONFIG = {};
                }
                Object.assign(window.SITE_CONFIG, cloudConfig || {});
                try { localStorage.setItem('site_config_backup', JSON.stringify(window.SITE_CONFIG)); } catch(_) {}
            }
        } catch (error) {}
        return true;
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    window.CloudSync.init();
});
