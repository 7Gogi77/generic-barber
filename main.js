// Entry point used by HTML pages. Imports existing scripts so Vite bundles them.
// This file intentionally imports modules for their side-effects (they attach to window or run init code).

import './js/config.js';
import './js/firebase-config.js';
import './js/schedule-model.js';
import './js/storage-manager.js';
import './js/calendar-engine.js';
import './js/admin.js';

// Export nothing; modules run on import
console.log('Main bundle loaded');
