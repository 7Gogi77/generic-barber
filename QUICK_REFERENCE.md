# ⚡ Quick Reference - Admin & Colors

## 🔐 Admin Access

**URL:** `admin.html` (after login via index.html)
**Password:** `admin123`
**Language:** Slovenian 🇸🇮

### Login Flow
1. Open `index.html`
2. Click ⚙️ button (bottom right)
3. Enter: `admin123`
4. Auto-redirects to `admin.html`

---

## 🎨 Color Palettes

### Main Website (Barber Theme)
```
Primary Red:        #DC143C  ❌
Navy Blue:          #003DA5  🔵
Dark Background:    #0A0A0A  ⬛
Light Red Gradient:  #FF6B6B  🔴
White Text:         #FFFFFF  ⚪
```

### Admin Dashboard (Gold Theme)
```
Primary Gold:       #D4AF37  🟨
Secondary Gold:     #F2C94C  💛
Dark Background:    #0E0E0E  ⬛
Light Text:         #F5F5F5  ⚪
Accent Gray:        #B0B0B0  ⚫
Dark Text:          #2B2B2B  ⬛
```

---

## 📑 Admin Sections

| Section | Slovenian | Purpose |
|---------|-----------|---------|
| 1 | **Splošno** | Shop name |
| 2 | **Tema Barve** | Colors |
| 3 | **Vsebina** | Hero/Story text |
| 4 | **Storitve** | Services & prices |
| 5 | **Brivci** | Barber profiles |
| 6 | **Galerija** | Gallery images |
| 7 | **Rezervacije** | Booking form |

---

## 🔑 Key Translations

| English | Slovenian |
|---------|-----------|
| General | Splošno |
| Theme Colors | Tema Barve |
| Content | Vsebina |
| Services | Storitve |
| Prices | Cene |
| Barbers | Brivci |
| Gallery | Galerija |
| Images | Slike |
| Booking | Rezervacije |
| Save | Shrani |
| Logout | Odjava |
| Submit | Pošlji |
| Dashboard | Administracijska Plošča |
| Shop Name | Ime Trgovine |
| Description | Opis |
| URL | Naslov |

---

## 💾 File Locations

```
📁 generic-barber/
  📄 index.html           → Main website + admin login
  📄 admin.html           → Slovenian admin dashboard ✨
  📁 js/
    📄 config.js          → Configuration & theme system
    📄 admin.js           → Authentication logic
  📁 css/
    📄 theme.css          → Main styling
  📄 ADMIN_GUIDE.md       → Full admin guide
  📄 ADMIN_PAGE_GUIDE.md  → Admin page docs
  📄 COLOR_PALETTE.md     → Color reference
  📄 PROJECT_SUMMARY.md   → Complete summary
```

---

## 🚀 Common Tasks

### Change Shop Name
1. Admin → Splošno
2. Edit "Ime Trgovine"
3. Auto-saves

### Update Service Price
1. Admin → Storitve
2. Edit price field
3. Click "Shrani Storitve"

### Change Theme Color
1. Admin → Tema Barve
2. Click color picker
3. Select new color
4. Click "Shrani Tema"

### Add Gallery Image
1. Admin → Galerija
2. Paste image URL
3. Click "Shrani Galerijo"

### Edit Barber Info
1. Admin → Brivci
2. Update name/role/image
3. Click "Shrani Brivce"

---

## 🔐 Security Quick Facts

✅ SHA-256 password hashing
✅ No plain text passwords
✅ Rate limiting: 3 attempts
✅ 60-second lockout after failures
✅ SessionStorage (auto-clears on close)
✅ 1-hour session expiration
✅ Secure logout function
✅ CSRF protection via same-origin

---

## 📊 Data Persistence

All changes saved to:
- **localStorage** - Main backup
- **sessionStorage** - Session state
- **Auto-save on form update**
- **Survives page refresh**
- **Survives browser restart** (localStorage)

---

## 🎯 Customization Checklist

- [ ] Change admin password hash
- [ ] Update shop name
- [ ] Set custom colors
- [ ] Add services
- [ ] Create barber profiles
- [ ] Upload gallery images
- [ ] Update booking form
- [ ] Test all features
- [ ] Deploy to server

---

## 📱 Responsive Breakpoints

- **Desktop:** 1200px+ (sidebar navigation)
- **Tablet:** 768px-1199px (optimized layout)
- **Mobile:** <768px (horizontal tabs)

---

## 🌐 Supported Browsers

✅ Chrome 90+
✅ Firefox 88+
✅ Safari 14+
✅ Edge 90+
✅ Mobile browsers (iOS Safari, Chrome Mobile)

---

## ⚠️ Important Notes

1. **Password:** Change default password immediately!
2. **HTTPS:** Use on production
3. **Backup:** Export localStorage regularly
4. **localStorage Limit:** ~5-10MB per domain
5. **Browser Reset:** Clears all data

---

**Created:** January 26, 2026
**Language:** English & Slovenian
**Status:** ✅ Ready to Use
