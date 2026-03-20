/**
 * Remote config sync.
 * Replaces Firebase SDK usage with polling against the configured realtime-compatible backend.
 */

const DEFAULT_DATABASE_URL = 'https://barber-shop-9b2ac-default-rtdb.europe-west1.firebasedatabase.app';
const DEFAULT_POLL_INTERVAL = 15000;

function getDatabaseUrl(path, searchParams) {
    if (window.AppBackend && typeof window.AppBackend.getDatabaseUrl === 'function') {
        return window.AppBackend.getDatabaseUrl(path, searchParams);
    }

    const base = DEFAULT_DATABASE_URL;
    const cleanPath = String(path || '').replace(/^\/+/, '');
    const url = cleanPath ? `${base}/${cleanPath}` : base;

    if (!searchParams || typeof searchParams !== 'object') {
        return url;
    }

    const query = new URLSearchParams();
    Object.entries(searchParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            query.set(key, String(value));
        }
    });

    const suffix = query.toString();
    return suffix ? `${url}?${suffix}` : url;
}

function cloneConfig(config) {
    return JSON.parse(JSON.stringify(config || {}));
}

function persistConfigLocally(config) {
    if (config && config._bookingSettings) {
        try { localStorage.setItem('bookingSettings', JSON.stringify(config._bookingSettings)); } catch (_) {}
    }

    if (!window.SITE_CONFIG || typeof window.SITE_CONFIG !== 'object') {
        window.SITE_CONFIG = {};
    }

    Object.assign(window.SITE_CONFIG, config || {});

    try {
        localStorage.setItem('site_config_backup', JSON.stringify(window.SITE_CONFIG));
    } catch (_) {}
}

function getExpectedTenantId() {
    if (window.AppBackend && typeof window.AppBackend.getTenantIdFromHostname === 'function') {
        return window.AppBackend.getTenantIdFromHostname();
    }

    return '';
}

function doesConfigMatchTenant(config, expectedTenantId) {
    if (!expectedTenantId) {
        return Boolean(config && typeof config === 'object');
    }

    const actualTenantId = String(config?.tenant?.id || '').trim().toLowerCase();
    return actualTenantId === expectedTenantId.toLowerCase();
}

window.CloudSync = {
    isConnected: false,
    syncEnabled: true,
    pollTimer: null,
    lastSnapshot: '',

    init() {
        this.isConnected = navigator.onLine;
        window.addEventListener('online', () => { this.isConnected = true; });
        window.addEventListener('offline', () => { this.isConnected = false; });
        this.listenForConfigChanges();
    },

    listenForConfigChanges() {
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
        }

        const poll = async () => {
            if (!this.syncEnabled) return;

            try {
                const remoteConfig = await this.fetchRemoteConfig();
                if (!remoteConfig) return;

                const serialized = JSON.stringify(remoteConfig);
                if (serialized === this.lastSnapshot) return;

                this.lastSnapshot = serialized;
                persistConfigLocally(remoteConfig);

                if (typeof initSite === 'function') {
                    initSite();
                }
            } catch (_) {}
        };

        poll();
        const interval = window.SITE_CONFIG?.backend?.syncPollingMs || DEFAULT_POLL_INTERVAL;
        this.pollTimer = window.setInterval(poll, interval);
    },

    async fetchRemoteConfig() {
        const expectedTenantId = getExpectedTenantId();
        const urls = [getDatabaseUrl('site_config.json', { _t: Date.now() })];

        if (expectedTenantId) {
            urls.push(getDatabaseUrl(`${expectedTenantId}/site_config.json`, { _t: Date.now() }).replace('/db/', '/tenant-db/'));
            urls.push(`/tenant-db/${expectedTenantId}/site_config.json?_t=${Date.now()}`);
        }

        for (const url of urls) {
            try {
                const response = await fetch(url, {
                    cache: 'no-store',
                    headers: {
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache',
                        'Expires': '0'
                    }
                });

                if (!response.ok) {
                    continue;
                }

                const payload = await response.json();
                if (!payload || typeof payload !== 'object') {
                    continue;
                }

                if (doesConfigMatchTenant(payload, expectedTenantId) || url.includes(`/tenant-db/${expectedTenantId}/`)) {
                    return payload;
                }
            } catch (_) {}
        }

        return null;
    },

    async saveToCloud(config) {
        const nextConfig = cloneConfig(config);
        const bookingSettings = localStorage.getItem('bookingSettings');
        if (bookingSettings) {
            try { nextConfig._bookingSettings = JSON.parse(bookingSettings); } catch (_) {}
        }

        try {
            const response = await fetch(getDatabaseUrl('site_config.json'), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nextConfig)
            });

            if (!response.ok) {
                return false;
            }

            this.lastSnapshot = JSON.stringify(nextConfig);
            persistConfigLocally(nextConfig);
            this.isConnected = true;
            return true;
        } catch (_) {
            this.isConnected = false;
            return false;
        }
    },

    async loadFromCloud() {
        try {
            const cloudConfig = await this.fetchRemoteConfig();
            if (cloudConfig) {
                this.lastSnapshot = JSON.stringify(cloudConfig);
                persistConfigLocally(cloudConfig);
                return true;
            }
        } catch (_) {}

        return false;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.CloudSync.init();
});
