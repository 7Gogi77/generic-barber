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

window.ADMIN_ENV = { ...DEFAULT_ADMIN_ENV };

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
            ...(payload && typeof payload === 'object' ? payload : {})
        };

        if (payload && payload.error) {
            window.ADMIN_ENV_ERROR = payload.error;
        }

        return window.ADMIN_ENV;
    })
    .catch((error) => {
        window.ADMIN_ENV_ERROR = error?.message || 'Failed to load admin env';
        return window.ADMIN_ENV;
    });
