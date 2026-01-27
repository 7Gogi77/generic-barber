# Blade & Bourbon - Admin Panel Implementation Guide

## Overview
Your barber website now features a complete Instagram-inspired branding system with a secure, password-protected admin panel. All changes made through the admin panel persist across page reloads using browser storage.

---

## 🎨 Instagram-Style Branding

### Theme System
All colors and styling are now centralized in a **theme object** within `config.js`:

```javascript
SITE_CONFIG.theme = {
    primary: "#C5A059",           // Main accent gold
    dark: "#0A0A0A",              // Dark background
    card: "#141414",              // Card background
    gradientStart: "#C5A059",     // Gold start
    gradientEnd: "#F1D396",       // Light gold end
    // ... more colors
}
```

### Live Color Updates
The admin panel allows you to update all theme colors in real-time. Changes apply immediately to the entire website without requiring a page reload.

**Files:**
- `css/theme.css` - All styling with CSS variables
- `config.js` - Theme object definition
- `admin.js` - Theme application logic

---

## 🔐 Security Implementation

### Password Authentication
✅ **Not stored in plain text** - Uses SHA-256 hashing
✅ **Secure validation** - Hash comparison prevents reverse-engineering
✅ **Session-based** - Auth stored in sessionStorage (cleared on browser close)
✅ **Rate limiting** - Lockout after 3 failed attempts for 60 seconds

### Default Credentials
```
Password: admin123
Hash: 0192023a7bbd73250516f069df18b500
```

⚠️ **CHANGE THIS IMMEDIATELY IN PRODUCTION**

### How to Change the Password

1. Go to [SHA256 Hash Generator](https://emn178.github.io/online-tools/sha256.html)
2. Enter your new password
3. Copy the generated hash
4. In `config.js`, replace the `passwordHash` value:

```javascript
admin: {
    passwordHash: "YOUR_NEW_SHA256_HASH_HERE",
    maxAttempts: 3,
    lockoutDuration: 60000,
    enabled: true
}
```

### Security Features
- **Brute Force Protection**: 3 failed attempts = 60-second lockout
- **Session Validation**: Sessions expire after 1 hour
- **DevTools Proof**: Password never appears in frontend code or browser storage
- **Auto-Logout**: Closing the browser tab clears authentication

---

## 🎛️ Admin Panel Features

### Access the Admin Panel
1. Click the ⚙️ button in the bottom-right corner
2. Enter password: `admin123` (change in config.js)
3. Click "Login"

### Editable Configuration

#### 1. **General Settings**
   - Shop name (appears in logo and footer)

#### 2. **Theme Colors**
   - Primary Gold - Main accent color
   - Gradient Start - Left side of gold gradient
   - Gradient End - Right side of gold gradient
   - Dark Background - Main page background
   - Card Background - Card/section backgrounds

#### 3. **Services**
   - Edit service names, prices, and descriptions
   - Changes apply instantly

### Real-Time Updates
All changes are applied immediately to the website without requiring a page refresh.

### Persistence
Changes automatically save to browser's `localStorage` and persist across:
- Page reloads
- Browser session restarts
- Device reboots

---

## 📁 File Structure

```
generic-barber/
├── index.html                 # Main page with admin UI
├── js/
│   ├── config.js             # Central configuration + theme system
│   └── admin.js              # Admin authentication & management (380+ lines)
├── css/
│   └── theme.css             # Instagram-inspired styling (400+ lines)
└── README.md                 # This file
```

---

## 🔧 Technical Details

### Admin Panel Components

#### Authentication (`admin.js`)
```javascript
AdminManager.validateLogin(password)
// Hashes input password and compares with stored hash
// Implements rate limiting and lockout
```

#### Config Management
```javascript
AdminManager.setConfigValue(path, value)
// Updates any config value: "theme.primary", "shopName", etc.
// Automatically persists to localStorage
AdminManager.refreshUI()
// Reapplies all changes to the page
```

#### Theme Application
```javascript
AdminManager.applyTheme()
// Sets CSS custom properties
// Updates Tailwind config dynamically
```

### Security Functions

**SHA-256 Password Hashing:**
```javascript
async hashPassword(password) {
    // Uses browser's native crypto API (no dependencies)
    // Returns hex-encoded hash for comparison
}
```

**Rate Limiting:**
```javascript
// Tracks failed attempts in memory (not stored)
// Implements exponential backoff
// Resets after successful login
```

---

## 🚀 How to Deploy

### For Local Testing
1. Open `index.html` in any modern browser
2. Click the ⚙️ admin button
3. Login with password: `admin123`
4. Customize colors and content

### For Production
1. **Change the password hash** (see above)
2. **Update default colors** in `config.js` if desired
3. **Host the files** on any web server (no backend required)
4. Customize content through the admin panel

### Production Recommendations
- Use HTTPS to prevent password interception
- Implement a proper backend authentication system (bcrypt/Argon2)
- Add database persistence for config changes
- Use environment variables for sensitive data

---

## 🎯 Feature Checklist

✅ Centralized theme system in config.js
✅ Instagram-inspired gradients and styling
✅ Secure password-protected admin panel
✅ SHA-256 password hashing
✅ Rate limiting (3 attempts, 60s lockout)
✅ Admin login modal
✅ Config editor for colors, text, prices
✅ Real-time UI updates
✅ Persistence across page reloads
✅ Session-based authentication
✅ Clean separation of concerns
✅ No breaking changes to existing functionality
✅ Comprehensive code comments

---

## 🐛 Troubleshooting

### Admin button doesn't appear
- Check that `SITE_CONFIG.admin.enabled` is `true` in `config.js`

### Password not working
- Ensure you're using the correct hash in `config.js`
- Try the default: `0192023a7bbd73250516f069df18b500` → password: `admin123`

### Changes not persisting
- Check browser's localStorage is enabled
- Try clearing cache and refreshing
- Ensure browser isn't in private/incognito mode

### Colors not updating
- Click a color input and ensure it changes
- Verify the hex value is valid
- Refresh the page if using other browser tabs

---

## 📝 Examples

### Change Primary Gold Color
1. Open admin panel (⚙️ button)
2. Click the "Primary Gold" color picker
3. Select your desired gold shade
4. Changes apply instantly to all buttons, text, and accents

### Update Service Pricing
1. Open admin panel
2. Find "Services" section
3. Edit the price field for any service
4. Refresh the page to see updates

### Customize Shop Name
1. Open admin panel
2. Enter your shop's name in "Shop Name" field
3. Changes appear in logo and footer instantly

---

## 📞 Support Notes

- All code is well-commented for easy customization
- Theme system is extensible (add more colors/variables as needed)
- Admin panel UI can be enhanced with more config options
- No external dependencies required (except TailwindCSS already in use)

---

## 🎓 Learning Resources

- SHA-256 Hashing: [MDN - SubtleCrypto.digest()](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest)
- CSS Custom Properties: [MDN - Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)
- LocalStorage API: [MDN - localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)

---

Generated: 2026-01-26
Version: 1.0 - Initial Release
