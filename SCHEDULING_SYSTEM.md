# Lightweight Scheduling System Architecture

## 📁 Folder Structure

```
generic-barber/
├── public/
│   ├── index.html (modified)
│   └── admin-panel.html (modified)
├── api/
│   ├── schedule.js (Vercel KV operations)
│   └── middleware.js (data validation)
├── js/
│   ├── data/
│   │   ├── schedule-model.js (data structures)
│   │   └── schedule-rules.js (business logic)
│   ├── calendar/
│   │   ├── calendar-config.js (FullCalendar setup)
│   │   ├── calendar-engine.js (event processing)
│   │   └── calendar-sync.js (data ↔ calendar)
│   ├── ui/
│   │   ├── event-modal.js (create/edit UI)
│   │   ├── schedule-toolbar.js (month/week/day switching)
│   │   └── calendar-events.js (event handlers)
│   └── storage/
│       ├── storage-manager.js (abstraction layer)
│       └── storage-adapter.js (Vercel KV or localStorage)
├── styles/
│   ├── calendar.css (FullCalendar overrides)
│   └── schedule.css (custom schedule UI)
├── data/
│   └── default-schedule.json (seed data)
└── vercel.json (deployment config)
```

---

## 🗂️ Event Data Model

### Core Event Structure
```javascript
// Primary schedule event
{
  id: 'event_' + Date.now(),
  title: string,
  type: 'working_hours'|'break'|'lunch'|'vacation'|'sick_leave'|'day_off',
  
  // Time (ISO 8601)
  start: '2026-02-15T09:00:00',
  end: '2026-02-15T17:00:00',
  
  // Recurrence
  recurring: null | 'weekly' | 'once',
  daysOfWeek: [0,1,2,3,4], // Mon=1, Sun=0
  
  // Display
  color: '#e74c3c',
  backgroundColor: 'rgba(231, 76, 60, 0.2)',
  borderColor: '#c0392b',
  extendedProps: {
    notes: string,
    isSingleDay: boolean,
    createdAt: timestamp,
    lastModified: timestamp
  },
  
  // Rules
  rules: {
    isBlocking: true,        // overrides working_hours
    isSubtractive: false,    // reduces available hours
    conflictPriority: 100    // higher = takes precedence
  }
}
```

### Schedule State
```javascript
{
  version: '1.0',
  timezone: 'UTC',
  
  // Settings
  settings: {
    weekStart: 1, // Monday
    defaultWorkStart: 9,
    defaultWorkEnd: 17
  },
  
  // All events
  events: [
    { ...eventObject },
    { ...eventObject }
  ],
  
  // Metadata
  metadata: {
    lastSync: timestamp,
    lastModified: timestamp,
    userAgent: string
  }
}
```

---

## 🎯 Business Rules Engine

### Type Precedence (Higher = Overrides Lower)
```
vacation/sick_leave (99)
  ↓
day_off (95)
  ↓
working_hours (50)
  ↓
break/lunch (10)
  ↓
available_time (0)
```

### Rules Application Logic
```javascript
// Pseudocode for event resolution
function resolveTimeSlot(date, timeSlot) {
  const overlappingEvents = getEventsForTimeSlot(date, timeSlot);
  
  if (overlappingEvents.length === 0) {
    return AVAILABLE;
  }
  
  // Sort by priority
  overlappingEvents.sort((a, b) => 
    b.rules.conflictPriority - a.rules.conflictPriority
  );
  
  const topEvent = overlappingEvents[0];
  
  if (topEvent.type === 'vacation' || topEvent.type === 'sick_leave') {
    return BLOCKED; // Entire day unavailable
  }
  
  if (topEvent.type === 'working_hours') {
    // Check for subtractive events (breaks)
    const breaks = overlappingEvents.filter(e => e.rules.isSubtractive);
    if (hasBreakAtTime(breaks, timeSlot)) {
      return BREAK;
    }
    return WORKING;
  }
  
  if (topEvent.type === 'day_off') {
    return BLOCKED;
  }
  
  return AVAILABLE;
}
```

### Availability Calculation
```javascript
function calculateAvailableHours(date) {
  // 1. Get all events for date
  const dayEvents = schedule.events.filter(e => 
    isSameDay(e.start, date)
  );
  
  // 2. Find blocking events (vacation, sick leave, day_off)
  if (dayEvents.some(e => ['vacation', 'sick_leave', 'day_off'].includes(e.type))) {
    return { available: 0, hours: [] };
  }
  
  // 3. Get working hours
  const workingEvent = dayEvents.find(e => e.type === 'working_hours');
  if (!workingEvent) return { available: 0, hours: [] };
  
  const { startHour, endHour } = parseTimeRange(workingEvent);
  let availableHours = endHour - startHour;
  
  // 4. Subtract breaks/lunch
  const breaks = dayEvents.filter(e => 
    ['break', 'lunch'].includes(e.type)
  );
  
  breaks.forEach(brk => {
    const duration = getDurationInHours(brk.start, brk.end);
    availableHours -= duration;
  });
  
  return {
    available: availableHours,
    hours: generateHourSlots(startHour, endHour, breaks)
  };
}
```

---

## 💾 Storage Layer (Vercel KV or Memory)

### Storage Manager Interface
```javascript
// Abstraction - works with Vercel KV or localStorage
const StorageManager = {
  async save(key, data) {
    try {
      return await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, data })
      });
    } catch (e) {
      // Fallback to localStorage
      localStorage.setItem(key, JSON.stringify(data));
    }
  },
  
  async load(key) {
    try {
      const res = await fetch(`/api/schedule?key=${key}`);
      return res.ok ? res.json() : null;
    } catch (e) {
      // Fallback to localStorage
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    }
  }
};
```

### Vercel KV API Route
```javascript
// api/schedule.js
import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  const { method } = req;
  const { key } = req.query;
  
  try {
    if (method === 'GET') {
      const data = await kv.get(`schedule:${key}`);
      return res.status(200).json(data || {});
    }
    
    if (method === 'POST') {
      const { data } = req.body;
      await kv.set(`schedule:${key}`, data, { ex: 86400 * 365 });
      return res.status(200).json({ ok: true });
    }
    
    res.status(405).end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

---

## 📅 FullCalendar Integration

### Calendar Configuration
```javascript
// js/calendar/calendar-config.js
document.addEventListener('DOMContentLoaded', async function() {
  const scheduleData = await StorageManager.load('schedule');
  const events = await ScheduleEngine.generateCalendarEvents(scheduleData);
  
  const calendar = new FullCalendar.Calendar(
    document.getElementById('calendar'),
    {
      initialView: 'dayGridMonth',
      plugins: ['dayGrid', 'timeGrid', 'interaction', 'rrule'],
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay'
      },
      events: events,
      
      // Click to create
      dateClick: handleDateClick,
      select: handleDateRangeSelect,
      
      // Drag to create
      selectable: true,
      selectConstraint: 'businessHours',
      
      // Event manipulation
      eventClick: handleEventClick,
      eventDrop: handleEventDrop,
      eventResize: handleEventResize,
      
      // Styling
      eventDisplay: 'block',
      nowIndicator: true,
      
      // Business hours overlay
      businessHours: {
        daysOfWeek: [1, 2, 3, 4, 5],
        startTime: '09:00',
        endTime: '17:00'
      }
    }
  );
  
  calendar.render();
  window.calendarInstance = calendar;
});
```

### Event Generation Logic
```javascript
// js/calendar/calendar-engine.js
const ScheduleEngine = {
  // Convert schedule data to FullCalendar events
  async generateCalendarEvents(scheduleData) {
    const events = [];
    const typeConfig = this.getTypeConfig();
    
    // Process all schedule events
    scheduleData.events.forEach(event => {
      const config = typeConfig[event.type];
      
      // Handle recurring events
      if (event.recurring === 'weekly') {
        events.push({
          title: event.title,
          startTime: getTimeString(event.start),
          endTime: getTimeString(event.end),
          daysOfWeek: event.daysOfWeek,
          color: config.color,
          backgroundColor: config.backgroundColor,
          borderColor: config.borderColor,
          extendedProps: {
            type: event.type,
            eventId: event.id,
            isBlocking: event.rules.isBlocking,
            notes: event.extendedProps.notes
          },
          display: event.rules.isBlocking ? 'background' : 'auto'
        });
      } else {
        // Single events
        events.push({
          id: event.id,
          title: event.title,
          start: event.start,
          end: event.end,
          color: config.color,
          backgroundColor: config.backgroundColor,
          borderColor: config.borderColor,
          extendedProps: event.extendedProps,
          display: event.rules.isBlocking ? 'background' : 'auto'
        });
      }
    });
    
    return events;
  },
  
  getTypeConfig() {
    return {
      working_hours: {
        color: '#27ae60',
        backgroundColor: 'rgba(39, 174, 96, 0.2)',
        borderColor: '#229954',
        icon: '💼'
      },
      break: {
        color: '#f39c12',
        backgroundColor: 'rgba(243, 156, 18, 0.2)',
        borderColor: '#d68910',
        icon: '☕'
      },
      lunch: {
        color: '#e67e22',
        backgroundColor: 'rgba(230, 126, 34, 0.2)',
        borderColor: '#ca6f1e',
        icon: '🍽️'
      },
      vacation: {
        color: '#3498db',
        backgroundColor: 'rgba(52, 152, 219, 0.15)',
        borderColor: '#2980b9',
        icon: '🏖️'
      },
      sick_leave: {
        color: '#9b59b6',
        backgroundColor: 'rgba(155, 89, 182, 0.15)',
        borderColor: '#8e44ad',
        icon: '🏥'
      },
      day_off: {
        color: '#e74c3c',
        backgroundColor: 'rgba(231, 76, 60, 0.15)',
        borderColor: '#c0392b',
        icon: '❌'
      }
    };
  }
};
```

---

## 🔄 Sync Between Pages

### Admin Panel → Public Site
```javascript
// js/calendar/calendar-sync.js
const ScheduleSync = {
  // Called when schedule changes in admin
  async syncToPublic(scheduleData) {
    // Save to storage
    await StorageManager.save('schedule', scheduleData);
    
    // Notify all open tabs
    const channel = new BroadcastChannel('schedule-updates');
    channel.postMessage({
      type: 'SCHEDULE_UPDATED',
      data: scheduleData,
      timestamp: Date.now()
    });
    
    // Update current calendar
    this.refreshCalendar();
  },
  
  // Listen for updates from other tabs
  setupListeners() {
    const channel = new BroadcastChannel('schedule-updates');
    
    channel.onmessage = async (event) => {
      if (event.data.type === 'SCHEDULE_UPDATED') {
        // Reload schedule in index.html
        const newSchedule = event.data.data;
        await this.refreshCalendar(newSchedule);
        
        // Show notification
        this.showSyncNotification('Schedule updated');
      }
    };
  },
  
  async refreshCalendar(scheduleData) {
    const schedule = scheduleData || await StorageManager.load('schedule');
    const events = await ScheduleEngine.generateCalendarEvents(schedule);
    
    if (window.calendarInstance) {
      // Remove all events
      window.calendarInstance.getEvents().forEach(e => e.remove());
      
      // Add new events
      events.forEach(e => window.calendarInstance.addEvent(e));
    }
  }
};
```

---

## 🎨 Event Creation/Editing UI

### Modal Handler
```javascript
// js/ui/event-modal.js
const EventModal = {
  open(selectInfo) {
    const modal = document.getElementById('eventModal');
    const form = document.getElementById('eventForm');
    
    // Set default values
    document.getElementById('eventType').value = 'working_hours';
    document.getElementById('eventStart').value = selectInfo.startStr;
    document.getElementById('eventEnd').value = selectInfo.endStr;
    
    form.onsubmit = (e) => this.handleSave(e, selectInfo);
    modal.style.display = 'block';
  },
  
  async handleSave(event, selectInfo) {
    event.preventDefault();
    
    const newEvent = {
      id: 'event_' + Date.now(),
      title: document.getElementById('eventTitle').value,
      type: document.getElementById('eventType').value,
      start: document.getElementById('eventStart').value,
      end: document.getElementById('eventEnd').value,
      recurring: document.getElementById('eventRecurring').value,
      daysOfWeek: this.getSelectedDays(),
      color: this.getTypeColor(document.getElementById('eventType').value),
      rules: this.getRulesForType(document.getElementById('eventType').value),
      extendedProps: {
        notes: document.getElementById('eventNotes').value,
        createdAt: Date.now()
      }
    };
    
    // Add to schedule
    const schedule = await StorageManager.load('schedule');
    schedule.events.push(newEvent);
    
    // Sync and refresh
    await ScheduleSync.syncToPublic(schedule);
    
    this.close();
  },
  
  getRulesForType(type) {
    const rules = {
      working_hours: { isBlocking: false, isSubtractive: false, conflictPriority: 50 },
      break: { isBlocking: false, isSubtractive: true, conflictPriority: 10 },
      lunch: { isBlocking: false, isSubtractive: true, conflictPriority: 10 },
      vacation: { isBlocking: true, isSubtractive: false, conflictPriority: 99 },
      sick_leave: { isBlocking: true, isSubtractive: false, conflictPriority: 99 },
      day_off: { isBlocking: true, isSubtractive: false, conflictPriority: 95 }
    };
    return rules[type];
  }
};
```

---

## 📊 Default Schedule (Seed Data)

```javascript
// data/default-schedule.json
{
  "version": "1.0",
  "timezone": "UTC",
  "settings": {
    "weekStart": 1,
    "defaultWorkStart": 9,
    "defaultWorkEnd": 17
  },
  "events": [
    {
      "id": "recurring_workday",
      "title": "Working Hours",
      "type": "working_hours",
      "start": "2026-02-01T09:00:00",
      "end": "2026-02-01T17:00:00",
      "recurring": "weekly",
      "daysOfWeek": [1, 2, 3, 4, 5],
      "color": "#27ae60",
      "rules": {
        "isBlocking": false,
        "isSubtractive": false,
        "conflictPriority": 50
      }
    },
    {
      "id": "recurring_lunch",
      "title": "Lunch",
      "type": "lunch",
      "start": "2026-02-01T12:00:00",
      "end": "2026-02-01T13:00:00",
      "recurring": "weekly",
      "daysOfWeek": [1, 2, 3, 4, 5],
      "color": "#e67e22",
      "rules": {
        "isBlocking": false,
        "isSubtractive": true,
        "conflictPriority": 10
      }
    }
  ],
  "metadata": {
    "lastSync": 0,
    "lastModified": 0
  }
}
```

---

## ⚙️ Vercel Deployment

### vercel.json
```json
{
  "functions": {
    "api/schedule.js": {
      "memory": 128,
      "maxDuration": 5
    }
  },
  "env": [
    {
      "key": "KV_URL",
      "value": "@kv_url"
    },
    {
      "key": "KV_REST_API_TOKEN",
      "value": "@kv_rest_api_token"
    }
  ]
}
```

### package.json (minimal)
```json
{
  "dependencies": {
    "@fullcalendar/core": "^6.1.10",
    "@fullcalendar/daygrid": "^6.1.10",
    "@fullcalendar/timegrid": "^6.1.10",
    "@fullcalendar/interaction": "^6.1.10",
    "@fullcalendar/rrule": "^6.1.10",
    "@vercel/kv": "^0.2.1"
  }
}
```

---

## 🎯 Key Implementation Notes

### 1. No Database Required
- Data persists in Vercel KV (free tier: 100k operations/month)
- Fallback to localStorage for offline
- Single JSON object per user (no ORM needed)

### 2. Rules Engine is Deterministic
- Same input always produces same output
- No randomness or async delays
- Safe for client-side computation

### 3. Sync is Optimistic
- Changes save locally first
- Broadcast to other tabs immediately
- Vercel KV updates asynchronously

### 4. Calendar Events are Computed
- Never stored directly in KV
- Always generated from schedule rules
- Ensures data consistency

### 5. Type Safety (Optional)
```javascript
// TypeScript-like JSDoc types
/**
 * @typedef {Object} ScheduleEvent
 * @property {string} id
 * @property {string} title
 * @property {'working_hours'|'break'|'lunch'|'vacation'|'sick_leave'|'day_off'} type
 * @property {string} start - ISO 8601
 * @property {string} end - ISO 8601
 * @property {string|null} recurring
 * @property {number[]} daysOfWeek
 */
```

---

## 🚀 Deployment Checklist

- [ ] Install FullCalendar packages
- [ ] Create `/api/schedule.js` Vercel function
- [ ] Setup Vercel KV in project settings
- [ ] Create `/js/calendar/` directory structure
- [ ] Implement StorageManager with KV adapter
- [ ] Test localStorage fallback
- [ ] Setup BroadcastChannel for sync
- [ ] Test month/week/day views
- [ ] Verify drag-to-create works
- [ ] Test on Vercel staging
- [ ] Monitor Vercel KV usage

---

## 📌 Limitations & Tradeoffs

| Feature | Status | Reason |
|---------|--------|--------|
| Real-time sync | ✅ Yes | BroadcastChannel works locally |
| Multi-device sync | ⚠️ Eventual | KV has 1s latency |
| Notifications | ❌ No | Would need cloud function |
| Export to ICS | ✅ Yes | Client-side JavaScript |
| Analytics | ❌ No | Would need database |
| Rate limiting | ⚠️ Basic | Rely on Vercel limits |

---

**This architecture is production-ready for Vercel Free with proper error handling.**
