const fs = require('fs');
const path = 'c:/generic-barber25/generic-barber/dist/assets/firebase-config-IgOxIlYG.js';
let src = fs.readFileSync(path, 'utf8');

// Remove saveBookingSettings and loadBookingSettings methods (both write/read the blocked /bookingSettings path)
const oldMethods = `,async saveBookingSettings(n){try{const e=i(s,"bookingSettings");return await g(e,n),!0}catch(e){return!1}},async loadBookingSettings(){try{const n=i(s,"bookingSettings"),e=await u(n);if(e.exists()){const r=e.val();if(r&&typeof r==="object")return localStorage.setItem("bookingSettings",JSON.stringify(r)),!0}}catch(n){}return!1}`;
if (src.includes(oldMethods)) {
  src = src.replace(oldMethods, '');
  fs.writeFileSync(path, src, 'utf8');
  console.log('Removed saveBookingSettings + loadBookingSettings from minified asset.');
} else {
  console.log('Pattern not found — already removed or different content.');
  // Show context around saveBookingSettings
  const idx = src.indexOf('saveBookingSettings');
  if (idx !== -1) console.log('Context:', src.slice(idx - 20, idx + 120));
}
process.exit(0);

// 1. Update saveToCloud: embed _bookingSettings into site_config instead of writing separately
const oldSave = `async saveToCloud(n){if(!this.isConnected)return!1;try{const e=i(s,"site_config");await g(e,n);try{const r=localStorage.getItem("bookingSettings");if(r){const a=i(s,"bookingSettings");await g(a,JSON.parse(r))}}catch(r){}return!0}catch(e){return!1}}`;
const newSave = `async saveToCloud(n){if(!this.isConnected)return!1;try{const e=i(s,"site_config");const bs=localStorage.getItem("bookingSettings");if(bs){try{n._bookingSettings=JSON.parse(bs)}catch(r){}}await g(e,n);return!0}catch(e){return!1}}`;

// 2. Update loadFromCloud to extract _bookingSettings from site_config
const oldLoad = `async loadFromCloud(){try{const n=i(s,"site_config"),e=await u(n);if(e.exists()){const r=e.val();(!window.SITE_CONFIG||typeof window.SITE_CONFIG!="object")&&(window.SITE_CONFIG={}),Object.assign(window.SITE_CONFIG,r||{}),localStorage.setItem("site_config_backup",JSON.stringify(window.SITE_CONFIG))}}catch(n){}try{const n=i(s,"bookingSettings"),e=await u(n);if(e.exists()){const r=e.val();r&&typeof r==="object"&&localStorage.setItem("bookingSettings",JSON.stringify(r))}}catch(n){}return!0}`;
const newLoad = `async loadFromCloud(){try{const n=i(s,"site_config"),e=await u(n);if(e.exists()){const r=e.val();r&&r._bookingSettings&&typeof r._bookingSettings==="object"&&localStorage.setItem("bookingSettings",JSON.stringify(r._bookingSettings));(!window.SITE_CONFIG||typeof window.SITE_CONFIG!="object")&&(window.SITE_CONFIG={}),Object.assign(window.SITE_CONFIG,r||{}),localStorage.setItem("site_config_backup",JSON.stringify(window.SITE_CONFIG))}}catch(n){}return!0}`;

// 3. Update listenForConfigChanges to extract _bookingSettings
const oldListen = `if(e.exists()&&this.syncEnabled){const r=e.val();console.log("☁️ Synced config from cloud:",r),(!window.SITE_CONFIG||typeof window.SITE_CONFIG!="object")&&(window.SITE_CONFIG={}),Object.assign(window.SITE_CONFIG,r||{}),localStorage.setItem("site_config_backup",JSON.stringify(window.SITE_CONFIG)),typeof initSite=="function"&&initSite()}`;
const newListen = `if(e.exists()&&this.syncEnabled){const r=e.val();r&&r._bookingSettings&&typeof r._bookingSettings==="object"&&localStorage.setItem("bookingSettings",JSON.stringify(r._bookingSettings));(!window.SITE_CONFIG||typeof window.SITE_CONFIG!="object")&&(window.SITE_CONFIG={}),Object.assign(window.SITE_CONFIG,r||{}),localStorage.setItem("site_config_backup",JSON.stringify(window.SITE_CONFIG)),typeof initSite=="function"&&initSite()}`;

console.log('Found saveToCloud:', src.includes(oldSave));
console.log('Found loadFromCloud:', src.includes(oldLoad));
console.log('Found listenForConfigChanges:', src.includes(oldListen));

if (src.includes(oldSave)) src = src.replace(oldSave, newSave);
if (src.includes(oldLoad)) src = src.replace(oldLoad, newLoad);
if (src.includes(oldListen)) src = src.replace(oldListen, newListen);

fs.writeFileSync(path, src, 'utf8');
console.log('Done. _bookingSettings present:', src.includes('_bookingSettings'));
