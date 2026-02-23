/**
 * Admin Environment Configuration
 * This file provides admin credentials for the admin panel login
 * Password: admin123 (default - CHANGE THIS IN PRODUCTION!)
 * Hash generated using SHA-256
 */

window.ADMIN_ENV = {
    passwordHash: "0192023a7bbd73250516f069df18b500",
    username: "admin",
    maxAttempts: 3,
    lockoutDuration: 60000,
    enabled: true
};

// Also set as a resolved promise for compatibility
window.ADMIN_ENV_PROMISE = Promise.resolve(window.ADMIN_ENV);
