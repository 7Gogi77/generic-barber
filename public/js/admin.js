/* Copied from js/admin.js: public copy so builds include it as a static asset */

// Minimal copy with same global names used by pages (keeps AdminManager available if expected by UI)
const AdminManager = (function(){
    return {
        isAuthenticated: false,
        init() { try { /* no-op if loaded as public fallback */ } catch (e) {} },
        showNotification(msg, type = 'info'){ console.log(`[admin] ${type}: ${msg}`); }
    };
})();

document.addEventListener('DOMContentLoaded', ()=>{ if (typeof AdminManager.init === 'function') AdminManager.init(); });
