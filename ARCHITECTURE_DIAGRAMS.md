# 🎯 System Architecture Diagrams

Visual diagrams showing how the scheduling system works.

---

## 1. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER INTERACTIONS                            │
└─────────────────┬───────────────────────────────────┬────────────┘
                  │                                   │
        ┌─────────▼──────────┐              ┌────────▼──────────────┐
        │  Admin Panel       │              │ Public Booking Page   │
        │ (admin-panel.html) │              │  (index.html)         │
        └─────────┬──────────┘              └────────┬──────────────┘
                  │                                   │
         ┌────────▼─────────────────────────────────▼────────┐
         │     CalendarEngine.js (UI Layer)                  │
         │  - Initialize calendar                            │
         │  - Handle clicks/drags                            │
         │  - Modal dialogs                                  │
         └──────────────┬───────────────────────────────────┘
                        │
         ┌──────────────▼───────────────────────────────┐
         │   ScheduleRules (Business Logic)            │
         │  - Validate event                           │
         │  - Resolve conflicts                        │
         │  - Calculate availability                   │
         └──────────────┬───────────────────────────────┘
                        │
         ┌──────────────▼───────────────────────────────┐
         │   StorageManager (Data Persistence)         │
         │        Try → Fallback Chain                 │
         └──────────────┬───────────────────────────────┘
                        │
        ┌───────────────┴──────────────────┐
        │                                   │
   ┌────▼─────────┐              ┌────────▼────────┐
   │ Vercel KV    │ (persistent) │  localStorage   │ (browser cache)
   │ Cloud        │              │  Fallback       │
   └──────────────┘              └────────┬────────┘
                                          │
                          ┌───────────────▼────────────┐
                          │  BroadcastChannel Sync     │
                          │ (Real-time cross-tab sync) │
                          └────────────────────────────┘
```

---

## 2. Event Priority Resolution

```
CONFLICT RESOLUTION FLOWCHART
═════════════════════════════

                    Multiple Events at Same Time?
                              │
                              ▼
                    Sort by Priority (Descending)
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
            ┌──────────────┐    ┌──────────────┐
            │ Vacation (99)│    │ Sick (99)    │
            │ Day Off (95) │    │              │
            │              │    │ ← BLOCKING   │
            │ ← WINS       │    │ EVENTS       │
            └──────────────┘    │              │
                    ▲            └──────────────┘
                    │
                    │ (No blocking)
                    ▼
            ┌──────────────┐
            │Working Hours │
            │  (priority   │
            │    50)       │
            └──────────────┘
                    │
                    │ (subtract breaks)
                    ▼
            ┌──────────────┐
            │ Break/Lunch  │
            │ (priority    │
            │    10)       │
            └──────────────┘
                    │
                    ▼
            ┌──────────────────────┐
            │ FINAL AVAILABILITY   │
            │ (subtractive result) │
            └──────────────────────┘
```

---

## 3. Weekly Schedule Structure

```
MONDAY TO SUNDAY
═════════════════════════════════════════════════════════

Monday (daysOfWeek[1]):
  🕘 8:00   ❌ Not working yet
  🕙 9:00   ✅ Available (Working Hours)
  🕚 10:00  ✅ Available
  🕛 11:00  ☕ Break (Working Hours - 15min)
  🕐 12:00  🍽️ Lunch (Working Hours - 1 hour)
  🕑 13:00  ✅ Available
  🕒 14:00  ✅ Available
  🕓 15:00  ✅ Available
  🕔 16:00  ✅ Available
  🕕 17:00  ❌ Closed
          ───────────────────
          6.75 HOURS AVAILABLE

Tuesday (daysOfWeek[2]):  Same as Monday → 6.75 hours
Wednesday (daysOfWeek[3]): Same as Monday → 6.75 hours
Thursday (daysOfWeek[4]):  Same as Monday → 6.75 hours
Friday (daysOfWeek[5]):    Same as Monday → 6.75 hours

Saturday (daysOfWeek[6]):
  ❌ NO WORKING HOURS DEFINED → 0 hours available

Sunday (daysOfWeek[0]):
  ❌ NO WORKING HOURS DEFINED → 0 hours available
```

---

## 4. Storage & Sync Mechanism

```
ADMIN MAKES A CHANGE
════════════════════════════════════════════════════════

         [Admin creates vacation event]
                     │
                     ▼
         CalendarEngine: Modal captures input
                     │
                     ▼
         ScheduleValidation: Checks structure
                     │
         ┌───────────▼──────────────┐
         │    Is valid?             │
         │  ✅ Yes  │ ❌ No        │
         └────┬──────┴──────────────┘
              │                │
              ▼                ▼
    ┌─────────────────┐   ┌──────────┐
    │  Save event     │   │ Show err │
    │  to schedule    │   │ Stay open│
    │  object         │   └──────────┘
    └────────┬────────┘
             │
             ▼
   StorageManager.save()
   ┌──────────────────────────────────────┐
   │ try:                                 │
   │   POST /api/schedule                 │
   │   (send to Vercel KV)                │
   │                                      │
   │ catch:                               │
   │   localStorage.setItem()             │
   │   (fallback to browser)              │
   │                                      │
   │ finally:                             │
   │   return { ok: true }                │
   └──────────────────────────────────────┘
             │
             ▼
   StorageManager.broadcastUpdate()
   ┌──────────────────────────────────────┐
   │ new BroadcastChannel('schedule-       │
   │   updates').postMessage(schedule)    │
   └──────────────────────────────────────┘
             │
             │ (if user has other tabs open)
             │
    ┌────────▼─────────────────────────┐
    │                                   │
    ▼                                   ▼
[Tab A]                           [Tab B]
Admin Panel                       Index (Public)
(no message                       window.onScheduleUpdated()
 since it's                       triggered by
 originating tab)                 BroadcastChannel
                                       │
                                       ▼
                                  CalendarEngine:
                                  generateCalendarEvents()
                                       │
                                       ▼
                                  calendar.getEvents()
                                  .forEach(e => e.remove())
                                       │
                                       ▼
                                  events.forEach(e =>
                                    calendar.addEvent(e))
                                       │
                                       ▼
                                  ✅ Calendar refreshed
                                  (no page refresh needed)
```

---

## 5. Event Type Hierarchy

```
EVENT TYPE PRECEDENCE TREE
═════════════════════════════════════════════════════════

                    ┌─────────────────────────────────┐
                    │  Determining Availability        │
                    │  for a Time Slot                 │
                    └────────────┬────────────────────┘
                                 │
                ┌────────────────▼──────────────┐
                │ Is there a BLOCKING event?    │
                │ (vacation/sick/dayoff)        │
                ├────────────┬──────────────────┤
                │ Priority   │ Type             │
                ├────────────┼──────────────────┤
                │ 🔴 99      │ Vacation         │
                │ 🔴 99      │ Sick Leave       │
                │ 🟠 95      │ Day Off          │
                └────────────┴──────────┬───────┘
                                        │
                ┌───────────────────────▼──────────────┐
                │ If BLOCKING present:                 │
                │ ➜ Entire day = 0 available hours     │
                │                                      │
                │ If NO blocking:                      │
                │ ➜ Continue to next check             │
                └───────────────────────┬──────────────┘
                                        │
                ┌────────────────┬──────▼──────────┐
                │ Check WORKING  │ HOURS          │
                │ Priority 🟡 50 │                │
                ├────────────────┼────────────────┤
                │ Found?         │ What to do?    │
                ├────────────────┼────────────────┤
                │ ✅ Yes         │ Use this span  │
                │ ❌ No          │ 0 hours        │
                └────────────────┴────────┬───────┘
                                         │
                ┌────────────────────────▼────────────┐
                │ Subtract SUBTRACTIVE events         │
                │ (breaks/lunch)                      │
                │ Priority 🟢 10                      │
                ├────────────────────────────────────┤
                │ For each hour in working span:      │
                │ - If break/lunch overlaps: -1 hour  │
                │ - Otherwise: +1 available           │
                └────────────────────────────────────┘
                                 │
                                 ▼
                        ✅ FINAL AVAILABILITY
                        (working hours - breaks)
```

---

## 6. Database Schema (JSON Structure)

```
SCHEDULE STATE (Main Object)
═════════════════════════════════════════════════════════

{
  "version": "1.0",                    ← Version control
  
  "timezone": "UTC",                   ← Timezone info
  
  "settings": {                        ← User preferences
    "weekStart": 1,                    ← 1 = Monday, 0 = Sunday
    "defaultWorkStart": 9,             ← Default start hour
    "defaultWorkEnd": 17               ← Default end hour
  },
  
  "events": [                          ← Array of events
    {
      "id": "event_1706500800000",     ← Unique identifier
      "title": "Working Hours",         ← Display name
      "type": "working_hours",          ← Event type enum
      
      "start": "2026-02-09T09:00:00",  ← ISO8601 datetime
      "end": "2026-02-09T17:00:00",    ← ISO8601 datetime
      
      "recurring": "weekly",            ← "once", "weekly", "daily"
      "daysOfWeek": [1,2,3,4,5],       ← Mon-Fri (0=Sun...6=Sat)
      
      "color": "#27ae60",               ← Hex color for UI
      "backgroundColor": "rgba...",     ← Semi-transparent
      "borderColor": "#229954",         ← Darker shade
      
      "rules": {                        ← Business logic
        "isBlocking": false,            ← Overrides other events?
        "isSubtractive": false,         ← Reduces available hours?
        "conflictPriority": 50          ← Higher = wins conflicts
      },
      
      "extendedProps": {                ← Extra data
        "notes": "Description",         ← Optional notes
        "createdAt": 1706500800000,    ← Timestamp
        "lastModified": 1706500800000  ← Timestamp
      }
    },
    
    { ... more events ... }
  ],
  
  "metadata": {                        ← System info
    "lastSync": 1706500800000,         ← When last synced
    "lastModified": 1706500800000      ← Last change time
  }
}
```

---

## 7. Request/Response Flow

```
PUBLIC BOOKING PAGE CHECKING AVAILABILITY
═════════════════════════════════════════════════════════

User clicks "February 15" on calendar
         │
         ▼
    [Calendar Click Event]
         │
         ▼
    window.onCalendarDateSelect()
         │
         ▼
    Load schedule from storage
    const schedule = await StorageManager.load('schedule')
         │
         ▼
    Calculate availability
    const avail = ScheduleRules
      .calculateAvailableHours(schedule, date)
         │
         ▼
    ┌─────────────────────────────────┐
    │ Display Results                 │
    │                                 │
    │ If blocked:                     │
    │   "Vacation - Not available"    │
    │                                 │
    │ If available:                   │
    │   "Available times: 9, 10, 13,  │
    │    14, 15, 16"                  │
    │   (lunch 12-1 excluded)         │
    └─────────────────────────────────┘
         │
         ▼
    [Display to user]
```

---

## 8. Sync Timing Diagram

```
TIME SYNCHRONIZATION BETWEEN TABS
═════════════════════════════════════════════════════════

Tab A (Admin)                          Tab B (Public)
─────────────────────────────────────────────────────

0ms:   Create event
       │
2ms:   Validate event
       │
5ms:   StorageManager.save()
       │ POST /api/schedule
15ms:  ✅ KV save complete
       │
20ms:  BroadcastChannel.postMessage()
       │
       ├──────────────────────────────→ BroadcastChannel listener
       │                                activated (≈25ms)
       │                                │
       │                                ▼
       │                              window.onScheduleUpdated()
       │                              invoked
       │                                │
       │                                ▼
       │                              CalendarEngine.generateCalendarEvents()
       │                                │
       │                                ▼
       │                              calendar.getEvents().remove()
       │                                │
       │                                ▼
       │                              calendar.addEvent(new events)
       │                                │
       │                                ▼
35ms:  ✅ Calendar refreshed         ✅ Calendar refreshed
       in Tab B

TOTAL LATENCY: ~35 milliseconds
(From user action to display in other tab)
```

---

## 9. Conflict Resolution Example

```
SCENARIO: Multiple events at 2 PM on Monday
═════════════════════════════════════════════════════════

Event 1: Working Hours (priority 50)
         Mon-Fri, 9 AM - 5 PM

Event 2: Break (priority 10)
         Mon-Fri, 3 PM - 3:15 PM

Event 3: Lunch (priority 10)
         Mon-Fri, 12 PM - 1 PM

Question: What's available at 2 PM on Monday?

Process:
────────

1. Get all events for Monday:
   ✅ Working Hours (2 PM is in 9-5 range)
   ❌ Break (2 PM is not in 3-3:15 range)
   ❌ Lunch (2 PM is not in 12-1 range)
   
   → Only Working Hours applies at 2 PM

2. Check Working Hours properties:
   - isBlocking: false (doesn't block)
   - isSubtractive: false (doesn't reduce)
   - priority: 50
   
   → Use this event

3. Apply event:
   2 PM is AVAILABLE (covered by working hours,
                       not blocked by breaks)

4. Result:
   ┌──────────────────────────┐
   │ 2:00 PM - AVAILABLE ✅   │
   │ Reason: Working Hours    │
   └──────────────────────────┘
```

---

## 10. Calendar Event Generation

```
CONVERTING SCHEDULE TO CALENDAR EVENTS
═════════════════════════════════════════════════════════

Input: Schedule object with recurring events
Output: Array of individual FullCalendar events

Process:
─────────

Schedule Event:
┌────────────────────────────────────────┐
│ Title: Working Hours                   │
│ Type: working_hours                    │
│ Recurring: weekly                      │
│ DaysOfWeek: [1,2,3,4,5]                │
│ Start: 2026-02-09T09:00:00            │
│ End: 2026-02-09T17:00:00              │
└────────────────────────────────────────┘
                 │
                 ▼
           Expand weekly for 6 months
           (Feb 9 - Aug 9)
                 │
    ┌────────────┼────────────┐
    │            │            │
    ▼            ▼            ▼
  Mon 9 Feb   Mon 16 Feb    Mon 23 Feb  ... Mon 4 Aug
  9-5         9-5            9-5            9-5
   │
   ▼
For each instance, create FullCalendar event:
┌──────────────────────────────────────────┐
│ title: "Working Hours"                   │
│ start: "2026-02-09T09:00:00"            │
│ end: "2026-02-09T17:00:00"              │
│ backgroundColor: "rgba(39, 174, 96...)"  │
│ borderColor: "#229954"                   │
│ editable: true (on admin page)           │
│ editable: false (on public page)         │
└──────────────────────────────────────────┘
                 │
                 ▼
      [~26 events for this recurring]
      + [all other events]
                 │
                 ▼
    [Array of 50-100+ events]
           Ready for FullCalendar
```

---

These diagrams show how data flows through the system from user action to final display!
