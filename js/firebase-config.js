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
            console.log('🔗 Firebase Connected:', this.isConnected);
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
                console.log('☁️ Synced config from cloud:', remoteConfig);
                
                // Merge remote config with local
                Object.assign(window.SITE_CONFIG, remoteConfig);
                
                // Update localStorage backup
                localStorage.setItem('site_config_backup', JSON.stringify(window.SITE_CONFIG));
                
                // Refresh UI if on main page
                if (typeof initSite === 'function') {
                    initSite();
                }
            }
        });
    },
    
    // Save config to cloud
    async saveToCloud(config) {
        if (!this.isConnected) {
            console.warn('⚠️ Firebase not connected, saving locally only');
            return false;
        }
        
        try {
            const configRef = ref(database, 'site_config');
            await set(configRef, config);
            console.log('✅ Config synced to cloud');
            return true;
        } catch (error) {
            console.error('❌ Failed to sync to cloud:', error);
            return false;
        }
    },
    
    // Load config from cloud on startup
    async loadFromCloud() {
        try {
            const configRef = ref(database, 'site_config');
            const snapshot = await get(configRef);
            if (snapshot.exists()) {
                const cloudConfig = snapshot.val();
                Object.assign(window.SITE_CONFIG, cloudConfig);
                localStorage.setItem('site_config_backup', JSON.stringify(window.SITE_CONFIG));
                console.log('✅ Config loaded from cloud');
                return true;
            }
        } catch (error) {
            console.error('⚠️ Cloud load failed, using local:', error);
        }
        return false;
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    window.CloudSync.init();
});
