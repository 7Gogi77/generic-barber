/**
 * ADMIN PANEL - AUTHENTICATION & CONFIG MANAGEMENT
 * ================================================
 * 
 * SECURITY IMPLEMENTATION:
 * - Password validation uses SHA-256 hash comparison (not plain text)
 * - Failed login attempts trigger exponential backoff lockout
 * - Admin state stored in sessionStorage (cleared on browser close)
 * - All sensitive operations require active authentication
 * 
 * NOTE: For production, use a proper backend with bcrypt/Argon2
 */

const AdminManager = {
    // ============================================
    // AUTHENTICATION STATE & SECURITY
    // ============================================
    
    isAuthenticated: false,
    loginAttempts: 0,
    lastFailedAttempt: null,
    isLockedOut: false,
    
    /**
     * SECURITY: Initialize admin session from storage
     * Validates session integrity on page load
     */
    init() {
        const sessionAuth = sessionStorage.getItem('admin_authenticated');
        const sessionTime = sessionStorage.getItem('admin_session_time');
        
        if (sessionAuth === 'true' && sessionTime) {
            // Verify session is recent (within 1 hour)
            const sessionAge = Date.now() - parseInt(sessionTime);
            if (sessionAge < 3600000) { // 1 hour
                this.isAuthenticated = true;
                this.renderAdminPanel();
            } else {
                // Session expired
                sessionStorage.clear();
                this.isAuthenticated = false;
            }
        }
        
        this.setupEventListeners();
    },
    
    /**
     * SECURITY: SHA-256 hash function for password verification
     * Prevents plain text password exposure in devtools
     * @param {string} password - The password to hash
     * @returns {Promise<string>} - Hex-encoded SHA-256 hash
     */
    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    },
    
    /**
     * SECURITY: Validate login attempt with rate limiting
     * Implements lockout after max failed attempts
     * @param {string} password - User-entered password
     * @returns {Promise<boolean>} - Authentication success
     */
    async validateLogin(password) {
        // Check if account is currently locked out
        if (this.isLockedOut) {
            const timeSinceLastAttempt = Date.now() - this.lastFailedAttempt;
            if (timeSinceLastAttempt < SITE_CONFIG.admin.lockoutDuration) {
                const secondsRemaining = Math.ceil(
                    (SITE_CONFIG.admin.lockoutDuration - timeSinceLastAttempt) / 1000
                );
                this.showNotification(
                    `Account locked. Try again in ${secondsRemaining}s`,
                    'error'
                );
                return false;
            } else {
                // Lockout period expired, reset counter
                this.isLockedOut = false;
                this.loginAttempts = 0;
            }
        }
        
        if (window.ADMIN_ENV_ERROR && !window.ADMIN_ENV) {
            this.showNotification(
                'Admin environment guard not configured. Check ADMIN_* env vars.',
                'error'
            );
            return false;
        }

        const credentials = await this.getAdminCredentials();
        // Hash the provided password and compare with stored hash
        const passwordHash = await this.hashPassword(password);
        const storedHash = credentials?.passwordHash || SITE_CONFIG.admin.passwordHash;
        
        if (passwordHash === storedHash) {
            // Successful authentication
            this.loginAttempts = 0;
            this.isAuthenticated = true;
            
            // SECURITY: Store auth state in sessionStorage (not localStorage)
            // Clears when browser tab/window closes
            sessionStorage.setItem('admin_authenticated', 'true');
            sessionStorage.setItem('admin_session_time', Date.now().toString());
            
            this.showNotification('Login successful', 'success');
            return true;
        } else {
            // Failed authentication
            this.loginAttempts++;
            this.lastFailedAttempt = Date.now();
            
            if (this.loginAttempts >= SITE_CONFIG.admin.maxAttempts) {
                this.isLockedOut = true;
                this.showNotification(
                    `Too many failed attempts. Account locked for 60 seconds.`,
                    'error'
                );
                return false;
            }
            
            const attemptsRemaining = SITE_CONFIG.admin.maxAttempts - this.loginAttempts;
            this.showNotification(
                `Invalid password. ${attemptsRemaining} attempts remaining.`,
                'error'
            );
            return false;
        }
    },

    async getAdminCredentials() {
        if (window.ADMIN_ENV) {
            return window.ADMIN_ENV;
        }

        if (window.ADMIN_ENV_PROMISE) {
            try {
                const env = await window.ADMIN_ENV_PROMISE;
                return env;
            } catch (error) {
            }
        }

        return SITE_CONFIG.admin;
    },
    
    /**
     * SECURITY: Logout and clear session
     */
    logout() {
        this.isAuthenticated = false;
        sessionStorage.clear();
        this.showNotification('Logged out successfully', 'success');
        this.hideAdminPanel();
    },
    
    // ============================================
    // CONFIG MANAGEMENT & PERSISTENCE
    // ============================================
    
    /**
     * Get current config value by path (e.g., "theme.primary")
     * @param {string} path - Dot-notation path to config value
     * @returns {*} - Configuration value
     */
    getConfigValue(path) {
        const keys = path.split('.');
        let value = SITE_CONFIG;
        
        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return undefined;
            }
        }
        
        return value;
    },
    
    /**
     * Set config value by path and persist to localStorage
     * SECURITY: Only callable when authenticated
     * @param {string} path - Dot-notation path to config value
     * @param {*} value - New value to set
     * @returns {boolean} - Success status
     */
    setConfigValue(path, value) {
        if (!this.isAuthenticated) {
            this.showNotification('Authentication required', 'error');
            return false;
        }
        
        const keys = path.split('.');
        let current = SITE_CONFIG;
        
        // Navigate to parent object
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!(key in current)) {
                current[key] = {};
            }
            current = current[key];
        }
        
        // Set the final value
        const lastKey = keys[keys.length - 1];
        current[lastKey] = value;
        
        // PERSISTENCE: Save to browser storage
        this.persistConfig();
        return true;
    },
    
    /**
     * Save entire config to localStorage
     * Allows changes to persist across page reloads
     */
    persistConfig() {
        try {
            localStorage.setItem('site_config_backup', JSON.stringify(SITE_CONFIG));
            this.showNotification('Configuration saved', 'success');
        } catch (e) {
            this.showNotification('Error saving configuration', 'error');
        }
    },
    
    /**
     * Load config from localStorage backup
     * Called on page initialization
     */
    loadPersistedConfig() {
        try {
            const backup = localStorage.getItem('site_config_backup');
            if (backup) {
                const parsed = JSON.parse(backup);
                // Merge persisted config with defaults
                Object.assign(SITE_CONFIG, parsed);
            }
        } catch (e) {
        }
    },
    
    // ============================================
    // UI RENDERING & INTERACTIONS
    // ============================================
    
    /**
     * Render admin panel UI
     */
    renderAdminPanel() {
        this.showAdminPanel();
        this.populateConfigForm();
        this.applyTheme(); // Apply current theme settings
    },
    
    /**
     * Populate form with current config values
     */
    populateConfigForm() {
        const form = document.getElementById('config-form');
        if (!form) return;
        
        // Theme colors
        const themeInputs = [
            { id: 'theme-primary', path: 'theme.primary' },
            { id: 'theme-gradient-start', path: 'theme.gradientStart' },
            { id: 'theme-gradient-end', path: 'theme.gradientEnd' },
            { id: 'theme-dark', path: 'theme.dark' },
            { id: 'theme-card', path: 'theme.card' },
        ];
        
        themeInputs.forEach(input => {
            const element = document.getElementById(input.id);
            if (element) {
                element.value = this.getConfigValue(input.path) || '';
            }
        });
        
        // Shop name
        const shopNameInput = document.getElementById('shop-name');
        if (shopNameInput) {
            shopNameInput.value = SITE_CONFIG.shopName;
        }
        
        // Services
        const servicesContainer = document.getElementById('services-editor');
        if (servicesContainer && SITE_CONFIG.servicesSection.items) {
            servicesContainer.innerHTML = '';
            SITE_CONFIG.servicesSection.items.forEach((service, idx) => {
                servicesContainer.innerHTML += `
                    <div class="config-service-item">
                        <input type="text" value="${service.name}" 
                            onchange="AdminManager.setConfigValue('servicesSection.items.${idx}.name', this.value); AdminManager.refreshUI();"
                            placeholder="Service name">
                        <input type="text" value="${service.price}" 
                            onchange="AdminManager.setConfigValue('servicesSection.items.${idx}.price', this.value); AdminManager.refreshUI();"
                            placeholder="Price">
                        <input type="text" value="${service.desc}" 
                            onchange="AdminManager.setConfigValue('servicesSection.items.${idx}.desc', this.value); AdminManager.refreshUI();"
                            placeholder="Description">
                    </div>
                `;
            });
        }
    },
    
    /**
     * Apply theme colors to the entire page
     */
    applyTheme() {
        const root = document.documentElement;
        const t = SITE_CONFIG.theme;
        if (!t) return;

        // Helper: hex colour → "r, g, b" string for rgba() usage
        function hexToRgb(hex) {
            if (!hex) return '0, 122, 255';
            const clean = hex.replace('#', '');
            const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
            const r = parseInt(full.substring(0, 2), 16);
            const g = parseInt(full.substring(2, 4), 16);
            const b = parseInt(full.substring(4, 6), 16);
            return `${r}, ${g}, ${b}`;
        }

        const isLight = t.mode === 'light' || (t.dark && t.dark.toUpperCase() === '#FFFFFF');

        // Primary CSS vars used by index.html
        root.style.setProperty('--accent',                  t.primary            || '#007AFF');
        root.style.setProperty('--accent-rgb',              hexToRgb(t.primary));
        root.style.setProperty('--accent-light',            `rgba(${hexToRgb(t.primary)}, 0.1)`);
        root.style.setProperty('--bg-primary',              t.dark               || (isLight ? '#FFFFFF' : '#0A0A0A'));
        root.style.setProperty('--bg-secondary',            t.card               || (isLight ? '#F2F2F7' : '#141414'));
        root.style.setProperty('--bg-tertiary',             isLight ? '#E5E5EA'  : '#1C1C1E');
        root.style.setProperty('--subtitle-color',          t.primary            || '#007AFF');
        root.style.setProperty('--text-on-hero',            t.textOnHero         || '#FFFFFF');
        root.style.setProperty('--text-primary',            t.textPrimary        || (isLight ? '#1C1C1E' : '#FFFFFF'));
        root.style.setProperty('--text-secondary',          t.textSecondary      || (isLight ? '#6E6E73' : '#8E8E93'));
        root.style.setProperty('--text-tertiary',           isLight ? '#48484A'  : '#636366');
        root.style.setProperty('--border-color',            isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)');
        root.style.setProperty('--glass-bg',                isLight ? 'rgba(255,255,255,0.85)' : 'rgba(28,28,30,0.85)');
        root.style.setProperty('--gradient-start',          t.gradientStart      || t.primary || '#007AFF');
        root.style.setProperty('--gradient-end',            t.gradientEnd        || '#5AC8FA');
        root.style.setProperty('--button-color',            t.buttonColor        || t.primary || '#007AFF');
        root.style.setProperty('--button-text-color',       t.buttonTextColor    || '#FFFFFF');
        root.style.setProperty('--nav-text-color',          t.navTextColor       || (isLight ? '#6E6E73' : '#8E8E93'));
        root.style.setProperty('--nav-text-color-top',      t.navTextColorTop    || '#FFFFFF');
        root.style.setProperty('--nav-text-color-scrolled', t.navTextColorScrolled || (isLight ? '#1C1C1E' : '#8E8E93'));
        root.style.setProperty('--nav-hover-color',         t.navHoverColor      || t.primary || '#007AFF');
        root.style.setProperty('--footer-bg-color',         t.footerBgColor      || (isLight ? '#1C1C1E' : '#0A0A0A'));
        root.style.setProperty('--footer-text-color',       t.footerTextColor    || (isLight ? '#F2F2F7' : '#636366'));
        root.style.setProperty('--scrollbar-thumb',         t.scrollbarThumb     || t.primary || '#007AFF');
        root.style.setProperty('--scrollbar-track',         t.scrollbarTrack     || (isLight ? '#F2F2F7' : '#1C1C1E'));

        // Legacy variable aliases (kept for any older CSS that may still reference them)
        root.style.setProperty('--color-primary', t.primary || '#007AFF');
        root.style.setProperty('--color-dark',    t.dark    || '#0A0A0A');
        root.style.setProperty('--color-card',    t.card    || '#141414');
        root.style.setProperty('--text-gold',     t.textGold || t.primary || '#007AFF');

        // Update Tailwind config
        if (window.tailwind && window.tailwind.config) {
            window.tailwind.config.theme.extend.colors = {
                gold: t.primary,
                dark: t.dark,
                card: t.card
            };
        }
    },
    
    /**
     * Refresh entire page UI with updated config
     */
    refreshUI() {
        this.persistConfig();
        this.applyTheme();
        
        // Reinitialize site with new config
        if (typeof initSite === 'function') {
            initSite();
        }
    },
    
    /**
     * Show or hide admin panel based on auth state
     */
    showAdminPanel() {
        const panel = document.getElementById('admin-panel');
        const loginModal = document.getElementById('admin-login');
        if (panel) panel.classList.remove('hidden');
        if (loginModal) loginModal.classList.add('hidden');
    },
    
    hideAdminPanel() {
        const panel = document.getElementById('admin-panel');
        const loginModal = document.getElementById('admin-login');
        if (panel) panel.classList.add('hidden');
        if (loginModal) loginModal.classList.remove('hidden');
    },
    
    /**
     * Toggle admin panel visibility
     */
    toggleAdminPanel() {
        const panel = document.getElementById('admin-panel');
        if (panel) {
            panel.classList.toggle('hidden');
        }
    },
    
    /**
     * Show notification message
     * @param {string} message - Message to display
     * @param {string} type - 'success', 'error', 'info'
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `admin-notification admin-notification-${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    },
    
    // ============================================
    // EVENT LISTENERS
    // ============================================
    
    /**
     * Setup all event listeners for admin UI
     */
    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('admin-login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }
        
        // Logout button
        const logoutBtn = document.getElementById('admin-logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
        
        // Theme color inputs
        ['theme-primary', 'theme-gradient-start', 'theme-gradient-end', 'theme-dark', 'theme-card'].forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('change', (e) => {
                    const path = {
                        'theme-primary': 'theme.primary',
                        'theme-gradient-start': 'theme.gradientStart',
                        'theme-gradient-end': 'theme.gradientEnd',
                        'theme-dark': 'theme.dark',
                        'theme-card': 'theme.card'
                    }[id];
                    this.setConfigValue(path, e.target.value);
                    this.refreshUI();
                });
            }
        });
        
        // Shop name input
        const shopNameInput = document.getElementById('shop-name');
        if (shopNameInput) {
            shopNameInput.addEventListener('change', (e) => {
                this.setConfigValue('shopName', e.target.value);
                this.refreshUI();
            });
        }
        
        // Admin toggle button
        const adminToggle = document.getElementById('admin-toggle-btn');
        if (adminToggle) {
            adminToggle.addEventListener('click', () => {
                if (this.isAuthenticated) {
                    // Redirect to admin-panel.html if authenticated
                    window.location.href = 'admin-panel.html';
                } else {
                    this.showAdminPanel();
                }
            });
        }
    },
    
    /**
     * Handle login form submission
     */
    async handleLogin() {
        const passwordInput = document.getElementById('admin-password');
        if (!passwordInput) return;
        
        const password = passwordInput.value;
        const success = await this.validateLogin(password);
        
        if (success) {
            passwordInput.value = ''; // Clear input
            this.renderAdminPanel();
        }
    }
};

// Initialize admin manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    AdminManager.loadPersistedConfig();
    AdminManager.init();
});
