# Admin Page - Slovenian Version (admin.html)

## Overview
A dedicated Slovenian-language admin dashboard with a professional gold and dark theme. All text is translated to Slovenian, and it uses a premium color palette.

## Color Palette

The admin page uses these professional colors:

```
Background:      #0E0E0E (Nearly Black)
Primary Gold:    #D4AF37 (Rich Gold)
Secondary Gold:  #F2C94C (Light Gold)
Light Text:      #F5F5F5 (Off White)
Dark Text:       #2B2B2B (Charcoal)
Accent Gray:     #B0B0B0 (Medium Gray)
```

## Features

### Sidebar Navigation
- **Splošno** (General) - Basic shop settings
- **Tema Barve** (Theme Colors) - Customize all theme colors
- **Vsebina** (Content) - Edit hero, story sections
- **Storitve** (Services) - Manage services and prices
- **Brivci** (Barbers) - Edit barber profiles
- **Galerija** (Gallery) - Manage gallery images
- **Rezervacije** (Booking) - Booking section settings

### Features
✅ Responsive sidebar navigation
✅ Complete Slovenian translations
✅ Professional gold and dark theme
✅ Real-time color pickers
✅ Service and barber editor
✅ Gallery URL management
✅ Auto-save with notifications
✅ Session-based authentication

## How to Access

1. Open `index.html`
2. Click the ⚙️ admin button (bottom-right)
3. Login with password: `admin123`
4. You'll be redirected to `admin.html`
5. Or access directly: `admin.html` (if already authenticated)

## Using the Admin Panel

### Edit Shop Name
1. Go to **Splošno** (General)
2. Update "Ime Trgovine" (Shop Name)
3. Changes apply instantly

### Customize Colors
1. Go to **Tema Barve** (Theme Colors)
2. Click any color picker
3. Select new color
4. Click "Shrani Tema" (Save Theme)

### Manage Services
1. Go to **Storitve** (Services)
2. Edit service names, prices, descriptions
3. Click "Shrani Storitve" (Save Services)

### Edit Barber Profiles
1. Go to **Brivci** (Barbers)
2. Update names, roles, and image URLs
3. Click "Shrani Brivce" (Save Barbers)

### Update Gallery
1. Go to **Galerija** (Gallery)
2. Paste image URLs (one per line)
3. Click "Shrani Galerijo" (Save Gallery)

### Booking Settings
1. Go to **Rezervacije** (Booking)
2. Update form title and button text
3. Click "Shrani Rezervacije" (Save Booking)

## Slovenian Translations

| English | Slovenian |
|---------|-----------|
| General | Splošno |
| Theme Colors | Tema Barve |
| Content | Vsebina |
| Services | Storitve |
| Barbers | Brivci |
| Gallery | Galerija |
| Booking | Rezervacije |
| Save | Shrani |
| Logout | Odjava |
| Dashboard | Administracijska Plošča |

## Design Features

### Layout
- Fixed sidebar (280px on desktop, collapses on mobile)
- Main content area with organized sections
- Responsive grid layout for config groups

### Colors
- Gold primary accent (#D4AF37)
- Light gold secondary (#F2C94C)
- Dark background (#0E0E0E)
- Clean, professional appearance

### Interactions
- Smooth transitions and animations
- Hover effects on buttons and inputs
- Real-time form validation
- Auto-save with success notifications

## Mobile Responsive

On mobile devices:
- Sidebar becomes horizontal navigation
- Content takes full width
- Touch-friendly interface
- Optimized button sizing

## Security Notes

✅ Requires authentication via `index.html`
✅ Session stored in sessionStorage (cleared on browser close)
✅ Password validated via SHA-256 hash
✅ All changes persisted to localStorage

## Technical Details

### Files
- `admin.html` - Standalone admin dashboard
- `js/admin.js` - Shared admin functionality
- `js/config.js` - Configuration management

### Storage
- Config changes saved to browser `localStorage`
- Session state in `sessionStorage`
- Persistence automatic on save

## Customization

You can customize the admin page colors by editing the CSS variables in `admin.html`:

```css
:root {
    --bg-dark: #0E0E0E;
    --color-primary: #D4AF37;
    --color-secondary: #F2C94C;
    --text-light: #F5F5F5;
    --text-dark: #2B2B2B;
    --color-accent: #B0B0B0;
}
```

---

**Note:** This admin page is completely independent of the main website theme. You can have different color schemes on the main site and admin dashboard.

Generated: 2026-01-26
Version: 1.0
