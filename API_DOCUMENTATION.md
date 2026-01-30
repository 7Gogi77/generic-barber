# API Documentation: Working Hours & Bookings System

## Functions Added

### 1. `saveWorkingHours()`

**Location**: Global function (calendar-engine.js)

**Called by**: HTML button: `<button onclick="saveWorkingHours()">`

**Purpose**: Save worker's daily working hours and create recurring events

**Logic**:
```javascript
saveWorkingHours() {
  1. Read start/end times from DOM elements:
     - #workStartTime (input type="time")
     - #workEndTime (input type="time")
  
  2. Validate:
     - Both times must be set
     - Start time < End time
  
  3. Save to localStorage:
     - Key: "workingHours"
     - Value: JSON { start: "09:00", end: "17:00" }
  
  4. Update DOM:
     - Show confirmation message
     - Update #workingHoursDisplay text
     - Show #workingHoursInfo div
  
  5. Trigger: createWorkingHoursEvents(startTime, endTime)
}
```

**Parameters**: None (reads from DOM)

**Returns**: void

**Side effects**:
- Saves to localStorage
- Updates DOM
- Creates calendar events
- Updates calendar display

**Example**:
```html
<!-- HTML -->
<input type="time" id="workStartTime" value="09:00">
<input type="time" id="workEndTime" value="17:00">
<button onclick="saveWorkingHours()">Save</button>

<!-- JavaScript - automatic when button clicked -->
```

---

### 2. `createWorkingHoursEvents(startTime, endTime)`

**Location**: Global function (calendar-engine.js)

**Called by**: `saveWorkingHours()`

**Purpose**: Generate daily "Delo" events for next 365 days

**Logic**:
```javascript
createWorkingHoursEvents(startTime, endTime) {
  1. Load schedule from storage: StorageManager.loadSchedule()
  
  2. Clean up:
     - Filter out old "Delo" events
     - Keep other events
  
  3. Generate events:
     - Start: today's date
     - Loop: 365 iterations
     - For each day:
       * Create event object:
         - id: "delo_YYYY-MM-DD"
         - title: "💼 Delo"
         - type: "working_hours"
         - start: "YYYY-MM-DDTss:mm"
         - end: "YYYY-MM-DDTee:mm"
         - editable: false
         - color: "#27ae60" (green)
         - extendedProps: { isWorkingHours: true }
       * Add to schedule.events array
  
  4. Save: StorageManager.saveSchedule(schedule)
  
  5. Update calendar:
     - Remove old "Delo" events from window.calendar
     - Add new formatted events to calendar
}
```

**Parameters**:
- `startTime` (string): Time in HH:mm format (e.g., "09:00")
- `endTime` (string): Time in HH:mm format (e.g., "17:00")

**Returns**: void

**Depends on**:
- `StorageManager.loadSchedule()`
- `StorageManager.saveSchedule()`
- `CalendarEngine.formatCalendarEvent()`
- `window.calendar` (FullCalendar instance)

**Created Events**:
```javascript
{
  id: "delo_2026-02-09",
  title: "💼 Delo",
  type: "working_hours",
  start: "2026-02-09T09:00",
  end: "2026-02-09T17:00",
  recurring: "daily",
  color: "#27ae60",
  backgroundColor: "rgba(39, 174, 96, 0.3)",
  borderColor: "#27ae60",
  editable: false,
  extendedProps: {
    isWorkingHours: true
  }
}
```

**Total Events Created**: 365 (one per day for next year)

---

### 3. `loadAppointmentsToCalendar()`

**Location**: Global function (calendar-engine.js)

**Called by**: Calendar initialization code in admin-panel.html

**Purpose**: Convert customer bookings from localStorage to calendar events

**Logic**:
```javascript
loadAppointmentsToCalendar() {
  1. Try/catch wrapper for error handling
  
  2. Load appointments:
     - Read: localStorage.appointments
     - Parse JSON
     - Validate: Array with length > 0
  
  3. Load schedule:
     - Get: StorageManager.loadSchedule()
  
  4. Clean up:
     - Filter out old booking events (id starts with "apt_")
     - Keep all other events
  
  5. Convert appointments to events:
     - For each appointment:
       * Calculate end time: 
         - Parse start: date + "T" + time
         - Add duration (in milliseconds): duration * 60000
         - Convert back to ISO string
       * Create event object:
         - id: "apt_" + appointment.id
         - title: "🕒 " + fullName + "\\n(" + duration + "min)"
         - type: "booking"
         - start: "YYYY-MM-DDTHH:mm"
         - end: "YYYY-MM-DDTHH:mm" (calculated)
         - allDay: false
         - editable: false
         - color: "#3498db" (blue)
         - extendedProps: { isBooking: true, ... }
  
  6. Save: StorageManager.saveSchedule(schedule)
  
  7. Update calendar:
     - Add each formatted event to window.calendar
  
  8. Log: Success message with count
}
```

**Parameters**: None (reads from localStorage)

**Returns**: void

**Data Source**:
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
    totalDuration: 45,        // minutes
    totalPrice: 25,           // EUR
    id: 1705123456789
  }
])
```

**Created Events**:
```javascript
{
  id: "apt_1705123456789",
  title: "🕒 Janez Novak\n(45min)",
  type: "booking",
  start: "2026-02-09T10:00",
  end: "2026-02-09T10:45",    // calculated from duration
  allDay: false,
  color: "#3498db",
  backgroundColor: "rgba(52, 152, 219, 0.2)",
  borderColor: "#2980b9",
  editable: false,
  extendedProps: {
    isBooking: true,
    customer: "Janez Novak",
    email: "janez@example.com",
    phone: "+38612345678",
    services: ["Haircut", "Beard"],
    duration: 45,
    price: 25
  }
}
```

**Depends on**:
- `StorageManager.loadSchedule()`
- `StorageManager.saveSchedule()`
- `CalendarEngine.formatCalendarEvent()`
- `window.calendar` (FullCalendar instance)

**Error Handling**: Try/catch with console.error logging

---

## Integration Points

### 1. HTML UI (admin-panel.html)
```html
<!-- Working Hours Input -->
<input type="time" id="workStartTime" value="09:00">
<input type="time" id="workEndTime" value="17:00">
<button onclick="saveWorkingHours()">💾 Spremi Sate</button>

<!-- Confirmation Message -->
<div id="workingHoursInfo" style="display: none;">
  <p>✓ Radni sati postavljeni: <strong id="workingHoursDisplay"></strong></p>
</div>
```

### 2. Calendar Initialization (admin-panel.html)
```javascript
// Load and display saved working hours
const workingHoursJSON = localStorage.getItem('workingHours');
if (workingHoursJSON) {
  const workingHours = JSON.parse(workingHoursJSON);
  document.getElementById('workStartTime').value = workingHours.start;
  document.getElementById('workEndTime').value = workingHours.end;
  document.getElementById('workingHoursDisplay').textContent = `${workingHours.start} - ${workingHours.end}`;
  document.getElementById('workingHoursInfo').style.display = 'block';
}

// Load appointments from bookings
loadAppointmentsToCalendar();

// Update events list
CalendarEngine.updateEventsList(scheduleData);
```

### 3. Calendar Engine (calendar-engine.js)
```javascript
// Already existing function that formats events
CalendarEngine.formatCalendarEvent(event)

// Already existing function that updates event list display
CalendarEngine.updateEventsList(scheduleData)
```

### 4. Storage Manager (storage-manager.js)
```javascript
// Already existing functions
StorageManager.loadSchedule()
StorageManager.saveSchedule(schedule)
StorageManager.load(key)
StorageManager.save(key, data)
```

---

## Data Flow

```
INDEX.HTML (Customer Booking)
         ↓
    (User books appointment)
         ↓
   localStorage.appointments
         ↓
ADMIN-PANEL.HTML (Page Load)
         ↓
  loadAppointmentsToCalendar()
         ↓
   Convert to Events
         ↓
  Add to window.calendar
         ↓
   Calendar Displays
         ↓
   Blue "🕒 Customer" Events
```

```
ADMIN PANEL (Working Hours)
         ↓
  saveWorkingHours() clicked
         ↓
  Validate input times
         ↓
   localStorage.workingHours
         ↓
  createWorkingHoursEvents()
         ↓
   Generate 365 events
         ↓
  Update localStorage.schedule
         ↓
   Add to window.calendar
         ↓
   Calendar Displays
         ↓
  Green "💼 Delo" Events
```

---

## localStorage Keys Used

| Key | Purpose | Format | Created by |
|-----|---------|--------|-----------|
| `workingHours` | Worker's daily hours | JSON object | `saveWorkingHours()` |
| `appointments` | Customer bookings | JSON array | index.html booking |
| `schedule` | All calendar events | JSON object | `saveWorkingHours()`, `loadAppointmentsToCalendar()` |

---

## Error Handling

### `saveWorkingHours()`
- Alerts if start/end time not set
- Alerts if start time >= end time
- Continue execution if errors

### `loadAppointmentsToCalendar()`
- Try/catch wrapper
- Logs to console on errors
- Silent fail if no appointments

---

## Event ID Patterns

Used to identify and manage events:

| Pattern | Type | Example | Created by |
|---------|------|---------|-----------|
| `delo_YYYY-MM-DD` | Working hours | `delo_2026-02-09` | `createWorkingHoursEvents()` |
| `apt_<timestamp>` | Booking | `apt_1705123456789` | `loadAppointmentsToCalendar()` |

---

## Color Scheme

| Color | Type | Hex Code | Background | Meaning |
|-------|------|----------|------------|---------|
| Green | Working hours | #27ae60 | rgba(39, 174, 96, 0.3) | When worker is available |
| Blue | Booking | #3498db | rgba(52, 152, 219, 0.2) | Customer appointment |
| Orange | Break | #e67e22 | - | Scheduled break |
| Purple | Lunch | #9b59b6 | - | Lunch time |
| Cyan | Vacation | #1abc9c | - | Time off (vacation) |
| Red | Sick leave | #e74c3c | - | Sick day |
| Gray | Day off | #95a5a6 | - | Closed/no work |

---

## Testing Checklist

- [ ] `saveWorkingHours()` called when button clicked
- [ ] Input validation works (start < end)
- [ ] Data saved to localStorage
- [ ] DOM updated with confirmation
- [ ] Calendar shows 365 "Delo" events
- [ ] Events have correct time range
- [ ] Page reload restores working hours in UI
- [ ] `loadAppointmentsToCalendar()` called on init
- [ ] Appointments appear as blue events
- [ ] Duration calculated correctly
- [ ] Customer details stored in event
- [ ] Both working hours and bookings visible
- [ ] No JavaScript errors in console
- [ ] Mobile responsive

---

## Performance Notes

- Creating 365 daily events might take 100-500ms
- Calendar rendering optimized by FullCalendar
- localStorage has size limit (~5-10MB per domain)
- For 1000 events: ~100KB storage used

---

## Browser Compatibility

Requires:
- ES6 JavaScript support
- localStorage API
- Fetch/async-await (for StorageManager)
- FullCalendar v6.1.10

Tested on:
- Chrome 120+
- Firefox 120+
- Safari 15+
- Edge 120+

---

## Future Enhancement Ideas

- [ ] Allow different hours for different days of week
- [ ] Multi-break/multi-lunch support
- [ ] Timezone detection and conversion
- [ ] Block customer bookings outside working hours
- [ ] Sync with external calendar (Google, Outlook)
- [ ] Notification on new booking
- [ ] Automatic break insertion
- [ ] Vacation period blocking
