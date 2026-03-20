/**
 * Admin Environment Configuration
 * Loads per-project runtime credentials from /api/admin-env and falls back to local defaults.
 */

const DEFAULT_ADMIN_ENV = {
    passwordHash: "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9",
    username: "admin",
    maxAttempts: 3,
    lockoutDuration: 60000,
    enabled: true
};

const TENANT_DB_FALLBACK_BASE = 'http://178.104.77.218';

function deriveTenantDatabaseUrlFromHostname() {
    try {
        const hostname = String(window.location.hostname || '').toLowerCase();
        if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1') {
            return '';
        }

        const subdomain = hostname.split('.')[0] || '';
        if (!subdomain.endsWith('-site')) {
            return '';
        }

        const tenantId = subdomain.slice(0, -'-site'.length).trim();
        if (!tenantId) {
            return '';
        }

        return `${TENANT_DB_FALLBACK_BASE}/tenant-db/${tenantId}`;
    } catch (_) {
        return '';
    }
}

const FALLBACK_DATABASE_URL = deriveTenantDatabaseUrlFromHostname();

window.ADMIN_ENV = {
    ...DEFAULT_ADMIN_ENV,
    ...(FALLBACK_DATABASE_URL ? { databaseUrl: FALLBACK_DATABASE_URL } : {})
};

window.ADMIN_ENV_PROMISE = fetch('/api/admin-env', {
    cache: 'no-store',
    headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    }
})
    .then(async (response) => {
        if (!response.ok) {
            throw new Error(`Failed to load admin env (${response.status})`);
        }

        const payload = await response.json();
        window.ADMIN_ENV = {
            ...DEFAULT_ADMIN_ENV,
            ...(payload && typeof payload === 'object' ? payload : {}),
            ...(!payload?.databaseUrl && FALLBACK_DATABASE_URL ? { databaseUrl: FALLBACK_DATABASE_URL } : {})
        };

        if (payload && payload.error) {
            window.ADMIN_ENV_ERROR = payload.error;
        }

        return window.ADMIN_ENV;
    })
    .catch((error) => {
        window.ADMIN_ENV_ERROR = error?.message || 'Failed to load admin env';
        if (FALLBACK_DATABASE_URL) {
            window.ADMIN_ENV = {
                ...window.ADMIN_ENV,
                databaseUrl: FALLBACK_DATABASE_URL
            };
        }
        return window.ADMIN_ENV;
    });
