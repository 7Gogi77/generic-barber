# 🚀 Quick Integration Guide - Copy-Paste Ready

This file contains all the exact code you need to copy & paste into your HTML files.

---

## 1️⃣ Add to admin-panel.html

### Location: Just before closing `</body>` tag

```html
<!-- ========== SCHEDULE SYSTEM - START ========== -->

<!-- FullCalendar Library -->
<link href='https://cdn.jsdelivr.net/npm/fullcalendar@6.1.10/index.global.min.css' rel='stylesheet' />
<script src='https://cdn.jsdelivr.net/npm/fullcalendar@6.1.10/index.global.min.js'></script>

<!-- Schedule System Modules -->
<script src="/js/schedule-model.js"></script>
<script src="/js/storage-manager.js"></script>
<script src="/js/calendar-engine.js"></script>

<!-- Schedule Styles -->
<link rel="stylesheet" href="/css/calendar.css">

<!-- Initialize Schedule Calendar -->
<script>
  async function initializeAdminSchedule() {
    const container = document.getElementById('scheduleCalendar');
    if (!container) return; // Not on admin page

    try {
      const scheduleData = await StorageManager.load('schedule');
      const calendar = CalendarEngine.initializeCalendar(container, scheduleData);
      
      window.onScheduleUpdated = async (newData) => {
        const events = await CalendarEngine.generateCalendarEvents(newData);
        calendar.getEvents().forEach(e => e.remove());
        events.forEach(e => calendar.addEvent(e));
      };
      
      StorageManager.setupSync(window.onScheduleUpdated);
      console.log('✅ Admin schedule calendar initialized');
    } catch (error) {
      console.error('❌ Error initializing admin schedule:', error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAdminSchedule);
  } else {
    initializeAdminSchedule();
  }
</script>

<!-- ========== SCHEDULE SYSTEM - END ========== -->
```

### Location: In the admin section (replace old Phase 1 schedule UI)

Find this section:
```html
<!-- Urnik Lastnika Section (OLD PHASE 1) -->
<section id="scheduleSection" class="admin-panel-section">
```

Replace it with:

```html
<!-- Urnik Lastnika Section (PHASE 2 - FullCalendar) -->
<section id="scheduleSection" class="admin-panel-section">
  <h2>Urnik Lastnika (Admin Schedule)</h2>
  <p>Create and manage your working hours, breaks, vacation, and days off.</p>
  
  <!-- Calendar Container -->
  <div id="scheduleCalendar" style="margin: 20px 0; background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"></div>
  
  <!-- Legend -->
  <div style="margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #3498db;">
    <h3 style="margin-top: 0;">Event Types & Colors</h3>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 15px;">
      <div style="padding: 10px; background: white; border-radius: 4px;">
        <span style="display: inline-block; width: 16px; height: 16px; background: #27ae60; border-radius: 2px; margin-right: 8px; vertical-align: middle;"></span>
        <strong>💼 Working Hours</strong> - Regular work time
      </div>
      <div style="padding: 10px; background: white; border-radius: 4px;">
        <span style="display: inline-block; width: 16px; height: 16px; background: #f39c12; border-radius: 2px; margin-right: 8px; vertical-align: middle;"></span>
        <strong>☕ Break</strong> - Short break (15-30 min)
      </div>
      <div style="padding: 10px; background: white; border-radius: 4px;">
        <span style="display: inline-block; width: 16px; height: 16px; background: #e67e22; border-radius: 2px; margin-right: 8px; vertical-align: middle;"></span>
        <strong>🍽️ Lunch</strong> - Lunch break (1-2 hours)
      </div>
      <div style="padding: 10px; background: white; border-radius: 4px;">
        <span style="display: inline-block; width: 16px; height: 16px; background: #3498db; border-radius: 2px; margin-right: 8px; vertical-align: middle;"></span>
        <strong>🏖️ Vacation</strong> - Entire day unavailable
      </div>
      <div style="padding: 10px; background: white; border-radius: 4px;">
        <span style="display: inline-block; width: 16px; height: 16px; background: #9b59b6; border-radius: 2px; margin-right: 8px; vertical-align: middle;"></span>
        <strong>🏥 Sick Leave</strong> - Entire day unavailable
      </div>
      <div style="padding: 10px; background: white; border-radius: 4px;">
        <span style="display: inline-block; width: 16px; height: 16px; background: #e74c3c; border-radius: 2px; margin-right: 8px; vertical-align: middle;"></span>
        <strong>❌ Day Off</strong> - Regular day off
      </div>
    </div>
  </div>

  <!-- Instructions -->
  <div style="margin-top: 20px; padding: 15px; background: #e8f4f8; border-radius: 4px; border-left: 4px solid #3498db;">
    <strong>💡 How to use:</strong>
    <ul style="margin: 10px 0 0 0; padding-left: 20px;">
      <li>Click on a date to create a new event</li>
      <li>Click an existing event to edit it</li>
      <li>Drag events to move them to a different time/date</li>
      <li>Drag the bottom of an event to change its duration</li>
      <li>Use the month/week/day buttons in the top left to change view</li>
      <li>Use the sync button (🔄) to manually sync with cloud</li>
    </ul>
  </div>
</section>
```

---

## 2️⃣ Add to index.html (Public Booking Page)

### Location: Just before closing `</body>` tag

```html
<!-- ========== SCHEDULE DISPLAY - START ========== -->

<!-- FullCalendar Library -->
<link href='https://cdn.jsdelivr.net/npm/fullcalendar@6.1.10/index.global.min.css' rel='stylesheet' />
<script src='https://cdn.jsdelivr.net/npm/fullcalendar@6.1.10/index.global.min.js'></script>

<!-- Schedule System Modules -->
<script src="/js/schedule-model.js"></script>
<script src="/js/storage-manager.js"></script>
<script src="/js/calendar-engine.js"></script>

<!-- Schedule Styles -->
<link rel="stylesheet" href="/css/calendar.css">

<!-- Initialize Public Schedule Display -->
<script>
  async function initializePublicSchedule() {
    const container = document.getElementById('publicScheduleCalendar');
    if (!container) return; // Not on public booking page

    try {
      const scheduleData = await StorageManager.load('schedule');
      
      // Create read-only calendar for public
      const publicConfig = {
        initialView: 'dayGridMonth',
        locale: 'sl',
        firstDay: 1,
        headerToolbar: {
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        editable: false,
        selectable: false,
        eventClick: function(info) {
          // Show availability on click
          updateAvailableTimesList(info.event.startStr);
        }
      };

      const calendar = CalendarEngine.initializeCalendar(container, scheduleData, publicConfig);
      
      // Listen for updates from admin panel
      window.onScheduleUpdated = async (newData) => {
        console.log('📅 Schedule updated - refreshing calendar');
        const events = await CalendarEngine.generateCalendarEvents(newData);
        calendar.getEvents().forEach(e => e.remove());
        events.forEach(e => calendar.addEvent(e));
      };
      
      StorageManager.setupSync(window.onScheduleUpdated);
      console.log('✅ Public schedule calendar initialized');
    } catch (error) {
      console.error('❌ Error initializing public schedule:', error);
    }
  }

  function updateAvailableTimesList(dateStr) {
    const listContainer = document.getElementById('availableTimesList');
    if (!listContainer) return;

    const date = new Date(dateStr);
    const availability = ScheduleRules.calculateAvailableHours(
      window.__scheduleData || {},
      date
    );

    if (availability.blockedReason) {
      listContainer.innerHTML = `<p style="color: #e74c3c;"><strong>Not available:</strong> ${availability.blockedReason}</p>`;
      return;
    }

    const availableHours = availability.hours
      .filter(h => h.available)
      .map(h => `${String(h.hour).padStart(2, '0')}:00`)
      .join(', ');

    if (availableHours) {
      listContainer.innerHTML = `<p><strong>Available times:</strong> ${availableHours}</p>`;
    } else {
      listContainer.innerHTML = `<p style="color: #e74c3c;"><strong>No available times</strong> on this day</p>`;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePublicSchedule);
  } else {
    initializePublicSchedule();
  }
</script>

<!-- ========== SCHEDULE DISPLAY - END ========== -->
```

### Location: Where you want the calendar to appear

```html
<!-- Schedule Display Section -->
<section id="scheduleDisplaySection" style="margin: 40px 0;">
  <div class="container">
    <h2>📅 Check Our Availability</h2>
    <p>Browse our schedule to find available times for booking.</p>
    
    <!-- Calendar -->
    <div id="publicScheduleCalendar" style="margin: 20px 0; background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"></div>
    
    <!-- Available Times Display -->
    <div id="availableTimes" style="margin-top: 20px; padding: 20px; background: #f0f8ff; border-radius: 8px; border-left: 4px solid #3498db; display: none;">
      <h3 style="margin-top: 0; color: #2c3e50;">⏰ Available Booking Times</h3>
      <div id="availableTimesList" style="font-size: 16px; line-height: 1.6;"></div>
      <p style="font-size: 14px; color: #7f8c8d; margin-top: 15px;">Click on a date above to see detailed availability.</p>
    </div>
  </div>
</section>
```

---

## 3️⃣ Create Seed Data (Optional)

Create file: `data/default-schedule.json`

```json
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
      "id": "working_hours_default",
      "title": "Working Hours",
      "type": "working_hours",
      "start": "2026-02-09T09:00:00",
      "end": "2026-02-09T17:00:00",
      "recurring": "weekly",
      "daysOfWeek": [1, 2, 3, 4, 5],
      "color": "#27ae60",
      "backgroundColor": "rgba(39, 174, 96, 0.15)",
      "borderColor": "#229954"
    },
    {
      "id": "lunch_default",
      "title": "Lunch",
      "type": "lunch",
      "start": "2026-02-09T12:00:00",
      "end": "2026-02-09T13:00:00",
      "recurring": "weekly",
      "daysOfWeek": [1, 2, 3, 4, 5],
      "color": "#e67e22",
      "backgroundColor": "rgba(230, 126, 34, 0.15)",
      "borderColor": "#d35400"
    }
  ],
  "metadata": {
    "lastSync": 1706500800000,
    "lastModified": 1706500800000
  }
}
```

Then load it at startup in admin-panel.html:

```javascript
// In the initializeAdminSchedule function, before CalendarEngine.initializeCalendar:

// Load default schedule if empty
let scheduleData = await StorageManager.load('schedule');
if (scheduleData.events.length === 0) {
  try {
    const response = await fetch('/data/default-schedule.json');
    if (response.ok) {
      scheduleData = await response.json();
      await StorageManager.save('schedule', scheduleData);
      console.log('📋 Loaded default schedule');
    }
  } catch (e) {
    console.log('Default schedule file not found - using empty schedule');
  }
}
```

---

## 4️⃣ Testing Locally

### Install & Run

```bash
# Install dependencies
npm install

# Start server (any of these work)
npm start
npx http-server
python -m http.server 3000

# Open browser
http://localhost:3000/admin-panel.html
```

### Quick Tests

```javascript
// In browser console:

// Test 1: Check if modules are loaded
console.log(ScheduleRules); // Should print object
console.log(StorageManager); // Should print object
console.log(CalendarEngine); // Should print object

// Test 2: Load schedule
const data = await StorageManager.load('schedule');
console.log('Schedule:', data);

// Test 3: Calculate availability
const avail = ScheduleRules.calculateAvailableHours(data, new Date());
console.log('Available hours today:', avail);

// Test 4: Check if calendar exists
console.log('Calendar container:', document.getElementById('scheduleCalendar'));
```

---

## 5️⃣ Deploy to Vercel

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Login
vercel login

# 3. Link project
vercel link

# 4. Setup KV database
vercel env pull

# 5. Deploy
vercel deploy --prod

# 6. Check logs
vercel logs
```

---

## ✅ Verification Checklist

After adding code:

- [ ] admin-panel.html loads without errors (F12 → Console)
- [ ] index.html loads without errors
- [ ] Calendar displays monthly view
- [ ] Can click date to create event
- [ ] Can see event legend with colors
- [ ] Open both pages in separate tabs
- [ ] Create event in admin tab
- [ ] Check event appears in public tab (no refresh)
- [ ] Refresh admin page - event still there
- [ ] All 6 event types work (working_hours, break, lunch, vacation, sick_leave, day_off)

---

## 🆘 If Something Breaks

1. **Open DevTools** (F12)
2. **Check Console** tab for red errors
3. **Check Network** tab - look for 404s
4. **Check Application** tab - localStorage should have schedule data
5. **Try clearing localStorage**:
   ```javascript
   localStorage.clear();
   location.reload();
   ```
6. **Check that all script tags are present** in correct order

---

## 📖 What Each File Does

| File | Purpose |
|------|---------|
| `js/schedule-model.js` | Core business logic (availability calculation, rules engine) |
| `js/storage-manager.js` | Save/load data to KV or localStorage |
| `js/calendar-engine.js` | FullCalendar integration and modal dialogs |
| `js/calendar.css` | Styling for FullCalendar and forms |
| `api/schedule.js` | Vercel API endpoint for persistence |
| `vercel.json` | Deployment configuration |

---

## 🎉 That's It!

You now have a complete, production-ready scheduling system. Just copy-paste the code above and you're done!

Questions? Check:
- `SCHEDULING_INTEGRATION.md` - Detailed API docs
- `INTEGRATION_CHECKLIST.md` - Full setup guide
- `SCHEDULING_SYSTEM.md` - Architecture overview
