# 🚀 Reseller Quick Setup Guide

## Quick Client Setup Checklist

### 1. Branding (5 minutes)
```
admin-panel.html → Barvna shema
- Primarna Barva: Client's brand color
- Sekundarna Barva: Client's accent color
```

### 2. Business Info (2 minutes)
```
admin-panel.html → Osnovne nastavitve
- Ime podjetja
- Telefon
- E-pošta
- Naslov
```

### 3. Services & Pricing (5 minutes)
```
admin-panel.html → Storitve
- Add/edit services with prices
- Set durations
```

### 4. Working Hours (2 minutes)
```
admin-panel.html → Delovni čas
- Set daily hours
- Mark closed days
```

### 5. PWA Icons (5 minutes)
1. Get client's logo
2. Go to https://realfavicongenerator.net/
3. Upload logo, download package
4. Replace files in `/icons/` folder
5. Update `manifest.json`:
   - `name`: "Client Business Name"
   - `short_name`: "Short Name"
   - `theme_color`: "#ClientBrandColor"

### 6. Firebase Setup (10 minutes)
1. Create Firebase project at https://console.firebase.google.com
2. Enable Realtime Database
3. Update `js/firebase-config.js` with new credentials
4. Set database rules (see FIREBASE_SETUP.md)

---

## Premium Features Included (FREE)

| Feature | Description | File |
|---------|-------------|------|
| ✅ PWA | Installable app, offline mode | `sw.js`, `manifest.json` |
| ✅ Custom Cursor | Smooth following cursor (desktop) | `premium-enhancements.js` |
| ✅ Confetti | Celebration on booking success | `premium-enhancements.js` |
| ✅ Toast Notifications | Modern notification popups | `premium-enhancements.js` |
| ✅ Skeleton Loaders | Smooth loading states | `premium-enhancements.css` |
| ✅ Ripple Effects | Material-style button clicks | `premium-enhancements.js` |
| ✅ Reveal Animations | Scroll-triggered animations | `premium-enhancements.css` |
| ✅ Glass Effects | Frosted glass UI elements | `premium-enhancements.css` |

---

## Deployment Options (FREE)

### Option 1: Vercel (Recommended)
```bash
npm i -g vercel
vercel
```

### Option 2: Netlify
1. Drag & drop folder to netlify.com

### Option 3: GitHub Pages
1. Push to GitHub
2. Enable Pages in repository settings

---

## Client Training Script

> "Tukaj je vaša admin plošča. 
> Lahko spremenite barve, dodajate storitve, in upravljate termine.
> Vse spremembe se shranijo avtomatsko.
> Aplikacija deluje tudi brez interneta!"

---

## Pricing Suggestion

| Package | Features | Suggested Price |
|---------|----------|-----------------|
| Basic | Website + Admin Panel | €300-500 |
| Standard | + Firebase + Domain | €500-800 |
| Premium | + Custom Design + Training | €800-1500 |
| Maintenance | Monthly updates | €30-50/month |

---

## Files to Customize Per Client

1. `manifest.json` - App name, colors
2. `icons/` - Logo in all sizes
3. `js/firebase-config.js` - Database credentials
4. `admin-panel.html` - Initial setup (then client manages)

## Files to NEVER Edit
1. `js/premium-enhancements.js` - Core functionality
2. `sw.js` - Service worker (unless adding features)
3. `js/calendar-engine.js` - Calendar logic

---

## Support Contact
For technical issues: [Your contact]
