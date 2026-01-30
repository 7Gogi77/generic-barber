# 🎯 Quick Start: Working Hours & Bookings

## What Was Added ✅

Your calendar now has **two new features**:

### 1. Working Hours Setup (⏰ Obavezni Radni Sati)
**Where**: Admin Panel → Poslovni Panel tab → TOP of page

**How to use**:
1. Enter your start time (e.g., 09:00)
2. Enter your end time (e.g., 17:00)
3. Click "💾 Spremi Sate" button
4. See confirmation: "✓ Radni sati postavljeni: 09:00-17:00"
5. Calendar shows green "💼 Delo" blocks for every day at those hours

**What it does**:
- Creates 365 daily working hour events
- Helps show when you're available
- Events are non-editable (can't be deleted)
- Saved to browser storage - persists on reload

---

### 2. Automatic Booking Integration
**Source**: Customer appointments from index.html booking system

**What it does**:
- Reads all customer bookings
- Shows them on calendar as blue "🕒 Customer Name" events
- Displays exact time + duration
- Includes customer details (phone, email, services)
- Shows customer name, duration, and services booked

**Visual**:
- **GREEN** = Your working hours (💼 Delo)
- **BLUE** = Customer bookings (🕒 Name, Duration)
- **Other colors** = Your personal events (breaks, vacation, etc.)

---

## Quick Demo

### Step 1: Set Working Hours
1. Open admin-panel.html
2. Click "Poslovni Panel" tab
3. See at TOP: "⏰ Obavezni Radni Sati"
4. Start time: 09:00
5. End time: 17:00
6. Click "💾 Spremi Sate"
7. ✓ Done! Calendar now shows green "Delo" blocks

### Step 2: Add Customer Booking
1. Open index.html (main site)
2. Click "Naredi Termin" button
3. Choose date, time, services
4. Fill in name, email, phone
5. Confirm booking

### Step 3: View Both on Calendar
1. Go back to admin-panel.html
2. You'll see:
   - **GREEN blocks**: Your working hours 09:00-17:00
   - **BLUE blocks**: Customer appointments with names
3. Can see at a glance when you work and when customers booked

---

## Files Changed

✅ **admin-panel.html**
- Added working hours form at top of Business Panel
- Updated calendar initialization to load bookings

✅ **js/calendar-engine.js**
- Added 3 new functions:
  - `saveWorkingHours()`
  - `createWorkingHoursEvents()`
  - `loadAppointmentsToCalendar()`

---

## Storage (Automatic - You Don't Need to Do Anything)

The system automatically saves/loads:
- Your working hours → localStorage.workingHours
- Customer bookings → localStorage.appointments (from index.html)
- All calendar events → localStorage.schedule

Everything persists when you reload the page.

---

## Troubleshooting

**Q: I set working hours but don't see green blocks?**
- Make sure both start and end times are set
- Click "Spremi Sate" button
- Refresh page
- Check browser console for errors

**Q: I don't see customer bookings on calendar?**
- Customer must have booked on index.html first
- Reload admin-panel.html
- Check that appointment has valid date/time
- Bookings are shown in BLUE color

**Q: Can I delete a booking from calendar?**
- No - bookings are read-only from calendar
- To cancel, must be done in customer management area
- Same with working hours - can't delete individual "Delo" events

**Q: Why are working hours not editable?**
- By design - prevents accidental deletion
- To change: set new times and click "Spremi Sate"
- This creates new events for the future

---

## Perfect! You Now Have:

✅ **Worker sees their availability** (green working hours)
✅ **Worker sees customer bookings** (blue appointments)
✅ **Everything auto-loads** (no manual entry needed)
✅ **Persistent storage** (survives page reload)
✅ **Clean calendar view** (all info at a glance)

## Next Steps

Customers can now:
1. Book appointments on index.html
2. Worker sees them instantly on admin calendar
3. Worker knows exactly when they work and when customers come in

Enjoy! 🎉
