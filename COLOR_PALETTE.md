# Color Palette - Barber Room 96 Inspired

## Theme Colors (Updated)

Your website now uses the classic barbershop color palette inspired by your logo:

### Primary Colors
- **Barber Red**: `#DC143C` - Main accent color (buttons, highlights, text)
- **Light Red**: `#FF6B6B` - Gradient end, hover states
- **Navy Blue**: `#003DA5` - Secondary accent color
- **White**: `#FFFFFF` - Primary text
- **Dark**: `#0A0A0A` - Main background
- **Card**: `#141414` - Card/section backgrounds

### Color Scheme
```
Primary Accent:   #DC143C (Crimson Red)    ███
Secondary Accent: #003DA5 (Navy Blue)      ███
Gradient End:     #FF6B6B (Light Red)      ███
Background:       #0A0A0A (Near Black)     ███
Cards:            #141414 (Dark Gray)      ███
```

## Where Colors Are Applied

### Throughout the Site
- Logo/Brand text - Red gradient
- Navigation buttons - Red with white text
- Hero CTA buttons - Red accent
- Section accents - Red highlights
- Hover states - Light red (#FF6B6B)
- Admin panel - Red primary color
- Admin button - Red with hover effect

## Customization

You can customize any color through the admin panel:

1. Click the ⚙️ button (bottom-right)
2. Login with password: `admin123`
3. Update theme colors in real-time
4. Changes apply instantly

### Admin Color Controls
- **Primary Red** → Main accent color
- **Gradient Start** → Red gradient beginning
- **Gradient End** → Light red for gradients
- **Dark Background** → Page background
- **Card Background** → Section/card backgrounds

## Technical Details

All colors are stored as CSS variables in `css/theme.css`:
```css
--color-primary: #DC143C;
--color-dark: #0A0A0A;
--gradient-start: #DC143C;
--gradient-end: #FF6B6B;
--color-accent-blue: #003DA5;
```

These variables are applied throughout the stylesheet and can be changed dynamically via the admin panel.

---

Generated: 2026-01-26
