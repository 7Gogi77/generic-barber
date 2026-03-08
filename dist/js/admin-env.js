/**
 * Admin Environment Configuration
 * This file provides admin credentials for the admin panel login
 * Password: admin123 (default - CHANGE THIS IN PRODUCTION!)
 * Hash generated using SHA-256
 */

window.ADMIN_ENV = {
    passwordHash: "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9",
    username: "admin",
    maxAttempts: 3,
    lockoutDuration: 60000,
    enabled: true
};

// Also set as a resolved promise for compatibility
window.ADMIN_ENV_PROMISE = Promise.resolve(window.ADMIN_ENV);
