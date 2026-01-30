# Working Hours & Bookings Integration Guide

## Overview
The admin calendar now integrates:
1. **Obavezni Radni Sati (Working Hours)** - Define daily work hours (e.g., 09:00-17:00)
2. **Booking Integration** - Automatically loads customer appointments from index.html bookings

---

## Features Added

### 1. Working Hours Setup UI
**Location**: Admin Panel > Poslovni Panel (Business Tab)

- **⏰ Početak rada** (Start Time) - Default: 09:00
- **⏰ Kraj rada** (End Time) - Default: 17:00  
- **💾 Spremi Sate** (Save Hours) - Button to save

**How it works**:
1. Worker sets their working hours in the time input fields
2. Clicks "Spremi Sate" button
3. System creates daily "💼 Delo" events for all days (365 days forward)
4. Green confirmation message shows: "✓ Radni sati postavljeni: 09:00-17:00"

**Data Storage**:
- Saved to localStorage as `workingHours` JSON object
- Format: `{ start: "09:00", end: "17:00" }`
- Persists across page reloads

---

### 2. Automatic Booking Integration
**Source**: Customer bookings from index.html

**What happens**:
1. When admin panel loads, it reads all appointments from `localStorage.appointments`
2. Converts each booking to a calendar event:
   - **Title**: 🕒 Customer Name (Duration)
   - **Type**: Booking (read-only, non-editable)
   - **Color**: Blue (#3498db) with light background
   - **Time**: Exact time + duration from booking
   - **Details**: Customer phone, email, services, price stored in event

**Data Preserved**:
```javascript
{
  id: "apt_" + booking.id,
  title: "🕒 Janez Novak (45min)",
  type: "booking",
  start: "2026-02-09T10:00",
  end: "2026-02-09T10:45",
  customer: "Janez Novak",
  email: "janez@example.com",
  phone: "+38612345678",
  services: ["Haircut", "Beard"],
  duration: 45,
  price: 25
}
```

---

## Calendar Display

### Event Types & Colors

| Icon | Type | Color | Editable |
|------|------|-------|----------|
| 💼 | Working Hours (Delo) | Green | ❌ No |
| 🕒 | Booking | Blue | ❌ No |
| ☕ | Break | Orange | ✅ Yes |
| 🍽️ | Lunch | Purple | ✅ Yes |
| 🏖️ | Vacation | Cyan | ✅ Yes |
| 🏥 | Sick Leave | Red | ✅ Yes |
| ❌ | Day Off | Gray | ✅ Yes |

---

## How to Use

### Step 1: Set Working Hours
1. Open admin-panel.html
2. Go to "Poslovni Panel" tab
3. Set start time (e.g., 09:00)
4. Set end time (e.g., 17:00)
5. Click "💾 Spremi Sate"
6. Confirm: "✓ Radni sati postavljeni: 09:00-17:00"

### Step 2: View Bookings
1. Customer books appointment on index.html
2. Open admin panel
3. Bookings automatically appear on calendar as blue events
4. Each booking shows customer name, duration, time

### Step 3: Manage Schedule
- **Create other events**: Click on date/time to create break, lunch, vacation, etc.
- **Drag to reschedule**: Drag any event to new time (except bookings & working hours)
- **Delete**: Click event and delete (except bookings & working hours)
- **View all events**: Scroll down to see complete event list below calendar

---

## Technical Implementation

### JavaScript Functions

#### `saveWorkingHours()`
- Called when "Spremi Sate" button clicked
- Validates start/end times
- Saves to localStorage
- Creates 365 daily "Delo" events
- Shows confirmation message

#### `createWorkingHoursEvents(startTime, endTime)`
- Creates recurring "Delo" events
- Loops through next 365 days
- Sets `editable: false` to prevent deletion
- Updates calendar in real-time

#### `loadAppointmentsToCalendar()`
- Loads appointments from localStorage
- Converts to calendar event format
- Calculates end time from duration
- Sets `editable: false` (bookings are read-only)
- Updates calendar on page load

### Storage Structure

**Working Hours**:
```javascript
localStorage.workingHours = JSON.stringify({
  start: "09:00",
  end: "17:00"
})
```

**Bookings** (from index.html):
```javascript
localStorage.appointments = JSON.stringify([
  {
    date: "2026-02-09",
    time: "10:00",
    firstName: "Janez",
    surname: "Novak",
    fullName: "Janez Novak",
    email: "janez@example.com",
    phone: "+38612345678",
    services: ["Haircut", "Beard"],
    totalDuration: 45,
    totalPrice: 25,
    id: 1705123456789
  }
])
```

**Schedule/Events**:
```javascript
localStorage.schedule = JSON.stringify({
  events: [
    {
      id: "delo_2026-02-09",
      title: "💼 Delo",
      type: "working_hours",
      start: "2026-02-09T09:00",
      end: "2026-02-09T17:00",
      allDay: false,
      editable: false,
      extendedProps: { isWorkingHours: true }
    },
    {
      id: "apt_1705123456789",
      title: "🕒 Janez Novak (45min)",
      type: "booking",
      start: "2026-02-09T10:00",
      end: "2026-02-09T10:45",
      editable: false,
      extendedProps: { isBooking: true, customer: "Janez Novak", ... }
    }
  ]
})
```

---

## Important Notes

1. **Bookings are read-only**: Cannot be edited or deleted from calendar (must cancel in index.html)
2. **Working hours auto-repeat**: Changes to working hours affect all 365 days forward
3. **Time zones**: All times use browser local time
4. **Duration calculation**: Booking end time = start time + totalDuration (in minutes)
5. **Load on startup**: Both working hours and bookings load automatically on page load

---

## Files Modified

1. **admin-panel.html**
   - Added working hours UI section (lines 963-992)
   - Added load logic in calendar initialization (lines 3262-3277)

2. **js/calendar-engine.js**
   - Added `saveWorkingHours()` function
   - Added `createWorkingHoursEvents()` function
   - Added `loadAppointmentsToCalendar()` function

---

## Troubleshooting

### Bookings not showing?
- Check browser console for errors
- Verify appointments exist in localStorage
- Try refreshing page
- Check that index.html saved bookings correctly

### Working hours not saving?
- Make sure both start and end times are set
- Start time must be before end time
- Check browser console for errors
- localStorage might be disabled

### Events overlap?
- This is normal - shows both working hours and bookings
- Use different colors to distinguish
- Working hours (green) shows availability
- Bookings (blue) show customer appointments

---

## Future Enhancements

Potential additions:
- Edit bookings directly from calendar
- Multi-day working hours settings
- Different hours for different days of week
- Timezone support
- Recurring booking patterns
- Break/lunch auto-fill based on working hours
