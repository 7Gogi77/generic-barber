# 💡 Real-World Usage Examples

This file shows practical examples of how the scheduling system works.

---

## Example 1: Basic Working Hours

### Scenario
Barber shop is open Monday-Friday, 9 AM to 5 PM.

### How to Set It Up

**Event 1**: Regular Working Hours
```json
{
  "id": "work_mon_fri",
  "title": "Working Hours",
  "type": "working_hours",
  "start": "2026-02-09T09:00:00",
  "end": "2026-02-09T17:00:00",
  "recurring": "weekly",
  "daysOfWeek": [1, 2, 3, 4, 5],  // Monday-Friday
  "color": "#27ae60"
}
```

### Result
```
Monday:    9 AM - 5 PM ✅ Available (8 hours)
Tuesday:   9 AM - 5 PM ✅ Available (8 hours)
Wednesday: 9 AM - 5 PM ✅ Available (8 hours)
Thursday:  9 AM - 5 PM ✅ Available (8 hours)
Friday:    9 AM - 5 PM ✅ Available (8 hours)
Saturday:  ❌ Not available
Sunday:    ❌ Not available
```

### Test It
```javascript
// In browser console:
const avail = ScheduleRules.calculateAvailableHours(
  window.__scheduleData,
  new Date('2026-02-10') // Monday
);
console.log('Available hours:', avail.available); // 8
```

---

## Example 2: With Lunch Break

### Scenario
Same shop but now adds daily 12-1 PM lunch break.

### How to Set It Up

Add **Event 2**: Lunch Break (in addition to Event 1 above)
```json
{
  "id": "lunch_daily",
  "title": "Lunch",
  "type": "lunch",
  "start": "2026-02-09T12:00:00",
  "end": "2026-02-09T13:00:00",
  "recurring": "weekly",
  "daysOfWeek": [1, 2, 3, 4, 5],  // Mon-Fri
  "color": "#e67e22"
}
```

### Result
```
Monday:    9 AM - 12 PM ✅ Available (3 hours)
           12 PM - 1 PM 🍽️ Lunch (unavailable)
           1 PM - 5 PM  ✅ Available (4 hours)
           TOTAL: 7 hours available

System calculates: 8 hours - 1 hour lunch = 7 hours
```

### Test It
```javascript
// Check availability with lunch break
const avail = ScheduleRules.calculateAvailableHours(
  window.__scheduleData,
  new Date('2026-02-10') // Monday
);
console.log('Available hours:', avail.available); // 7
console.log('Breakdown:', avail.hours);
/*
[
  {hour: 9, available: true},
  {hour: 10, available: true},
  {hour: 11, available: true},
  {hour: 12, available: false, type: 'lunch'},  // Lunch break
  {hour: 13, available: true},
  {hour: 14, available: true},
  {hour: 15, available: true},
  {hour: 16, available: true}
]
*/
```

---

## Example 3: With Vacation

### Scenario
Barber is on vacation Feb 15-20 (Sunday to Friday).

### How to Set It Up

Add **Event 3**: Vacation (in addition to above)
```json
{
  "id": "vacation_feb",
  "title": "Vacation",
  "type": "vacation",
  "start": "2026-02-15T00:00:00",
  "end": "2026-02-20T23:59:59",
  "recurring": "once",
  "daysOfWeek": [],
  "color": "#3498db"
}
```

### Result
```
Monday Feb 9:     9 AM - 5 PM ✅ 7 hours (9 - lunch)
Friday Feb 13:    9 AM - 5 PM ✅ 7 hours
Monday Feb 16:    ❌ VACATION - 0 hours available
Tuesday Feb 17:   ❌ VACATION - 0 hours available
Wednesday Feb 18: ❌ VACATION - 0 hours available
Thursday Feb 19:  ❌ VACATION - 0 hours available
Friday Feb 20:    ❌ VACATION - 0 hours available
Monday Feb 23:    9 AM - 5 PM ✅ 7 hours (back to normal)
```

### Key Insight
**Vacation overrides working hours!**
- Even though Feb 15 is on the working hours schedule, vacation blocks the entire day
- This is because vacation has priority 99 vs working hours priority 50

### Test It
```javascript
// Check Feb 15 (during vacation)
const vacationDay = ScheduleRules.calculateAvailableHours(
  window.__scheduleData,
  new Date('2026-02-15')
);
console.log('Available hours:', vacationDay.available); // 0
console.log('Blocked reason:', vacationDay.blockedReason); // 'vacation'

// Check Feb 23 (after vacation)
const normalDay = ScheduleRules.calculateAvailableHours(
  window.__scheduleData,
  new Date('2026-02-23')
);
console.log('Available hours:', normalDay.available); // 7
```

---

## Example 4: With Sick Leave

### Scenario
Barber gets sick on Feb 25.

### How to Set It Up

Add **Event 4**: Sick Leave
```json
{
  "id": "sick_feb25",
  "title": "Sick Leave",
  "type": "sick_leave",
  "start": "2026-02-25T00:00:00",
  "end": "2026-02-25T23:59:59",
  "recurring": "once",
  "daysOfWeek": [],
  "color": "#9b59b6"
}
```

### Result
```
Wednesday Feb 25: ❌ SICK LEAVE - 0 hours available
```

### How It's Different From Vacation
- Both block the entire day (priority 99 and 99)
- Visually different on calendar (purple vs blue)
- Useful for reporting/analytics

---

## Example 5: With Morning Break

### Scenario
Barber takes 15-minute break at 11 AM daily.

### How to Set It Up

Add **Event 5**: Morning Break
```json
{
  "id": "break_morning",
  "title": "Break",
  "type": "break",
  "start": "2026-02-09T11:00:00",
  "end": "2026-02-09T11:15:00",
  "recurring": "weekly",
  "daysOfWeek": [1, 2, 3, 4, 5],
  "color": "#f39c12"
}
```

### Result
```
Monday: 
  9:00 AM - 11:00 AM  ✅ 2 hours
  11:00 AM - 11:15 AM ☕ Break (15 min)
  11:15 AM - 12:00 PM ✅ 0.75 hours
  12:00 PM - 1:00 PM  🍽️ Lunch
  1:00 PM - 5:00 PM   ✅ 4 hours

  TOTAL: 6.75 hours available
```

### Test It
```javascript
// Check all hourly slots
const avail = ScheduleRules.calculateAvailableHours(
  window.__scheduleData,
  new Date('2026-02-10') // Monday
);

avail.hours.forEach(slot => {
  console.log(`${slot.hour}:00 - ${slot.available ? '✅ Available' : '❌ ' + slot.type}`);
});
/*
9:00 - ✅ Available
10:00 - ✅ Available
11:00 - ❌ break
12:00 - ❌ lunch
13:00 - ✅ Available
14:00 - ✅ Available
15:00 - ✅ Available
16:00 - ✅ Available
*/
```

---

## Example 6: Complex Week with Multiple Events

### Scenario
Complete realistic schedule:
- Work: Mon-Fri 9-5
- Lunch: Daily 12-1
- Break: Daily 11-11:15
- Day off: Saturday-Sunday
- Vacation: Feb 15-20
- Sick leave: Feb 25

### Timeline
```
Feb 9 (Mon):     9-5 (9h - breaks = 6.75h) ✅
Feb 10 (Tue):    9-5 (9h - breaks = 6.75h) ✅
Feb 11 (Wed):    9-5 (9h - breaks = 6.75h) ✅
Feb 12 (Thu):    9-5 (9h - breaks = 6.75h) ✅
Feb 13 (Fri):    9-5 (9h - breaks = 6.75h) ✅

Feb 14 (Sat):    ❌ Not available
Feb 15 (Sun):    ❌ VACATION (high priority)
Feb 16 (Mon):    ❌ VACATION
Feb 17 (Tue):    ❌ VACATION
Feb 18 (Wed):    ❌ VACATION
Feb 19 (Thu):    ❌ VACATION
Feb 20 (Fri):    ❌ VACATION

Feb 21 (Sat):    ❌ Not available
Feb 22 (Sun):    ❌ Not available
Feb 23 (Mon):    9-5 (9h - breaks = 6.75h) ✅ Back to work
Feb 24 (Tue):    9-5 (9h - breaks = 6.75h) ✅
Feb 25 (Wed):    ❌ SICK LEAVE (high priority)
Feb 26 (Thu):    9-5 (9h - breaks = 6.75h) ✅
Feb 27 (Fri):    9-5 (9h - breaks = 6.75h) ✅
```

### Code to Get Overview
```javascript
// Get availability for entire month
const overview = ScheduleRules.getAvailabilityOverview(
  window.__scheduleData,
  new Date('2026-02-01'),
  new Date('2026-02-29')
);

console.log(overview);
/*
{
  totalDays: 29,
  workingDays: 17,  // Mon-Fri minus vacation
  timeOffDays: 12,  // Weekends + vacation + sick
  totalAvailableHours: 114,  // 17 days × 6.75 hours
  breakdown: {
    '2026-02-09': {available: 6.75, hours: [...]},
    '2026-02-15': {available: 0, blockedReason: 'vacation', hours: []},
    '2026-02-25': {available: 0, blockedReason: 'sick_leave', hours: []},
    ...
  }
}
*/
```

---

## Example 7: Checking if a Time Slot is Bookable

### Scenario
Customer wants to book February 10 at 2 PM for a haircut.

### How to Check

```javascript
// Check if Feb 10, 2-3 PM is available
const canBook = ScheduleRules.isTimeSlotAvailable(
  window.__scheduleData,
  new Date('2026-02-10T14:00:00'), // 2 PM
  new Date('2026-02-10T15:00:00')  // 3 PM
);

console.log(canBook);
/*
Result: { available: true }

Explanation:
- Feb 10 is Monday (working day) ✅
- No vacation/sick leave on Feb 10 ✅
- 2-3 PM is not during lunch (12-1 PM) ✅
- 2-3 PM is not during break (11-11:15 AM) ✅
- So: AVAILABLE
*/
```

---

## Example 8: Finding Next Available 1-Hour Slot

### Scenario
Customer doesn't have time preference, just needs next available hour.

### Code
```javascript
// Find next available 1-hour slot starting from now
async function findNextAvailableSlot(scheduleData, startDate, daysToSearch = 7) {
  for (let i = 0; i < daysToSearch; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + i);
    
    const avail = ScheduleRules.calculateAvailableHours(scheduleData, currentDate);
    
    if (avail.available > 0) {
      // Find first available hour
      const firstAvailableHour = avail.hours.find(h => h.available);
      if (firstAvailableHour) {
        return {
          date: currentDate,
          hour: firstAvailableHour.hour,
          available: true
        };
      }
    }
  }
  
  return { available: false };
}

// Usage:
const next = await findNextAvailableSlot(
  window.__scheduleData,
  new Date()  // Start from today
);

console.log(next);
/*
{
  date: 2026-02-09T00:00:00.000Z,  // Monday
  hour: 9,                          // 9 AM
  available: true
}

// This means: Next available is Monday 9 AM
*/
```

---

## Example 9: Handling Conflicts

### Scenario
What happens if events overlap?

### Test Case
```javascript
// Two working hours events on same day:
// 1. Morning: 9 AM - 12 PM
// 2. Afternoon: 2 PM - 5 PM

const events = [
  {
    type: 'working_hours',
    start: '2026-02-10T09:00:00',
    end: '2026-02-10T12:00:00'
  },
  {
    type: 'working_hours',
    start: '2026-02-10T14:00:00',
    end: '2026-02-10T17:00:00'
  }
];

// For each hour, the system picks the event that applies
const slot10am = ScheduleRules.resolveTimeSlot(events, 10); // Morning event
const slot1pm = ScheduleRules.resolveTimeSlot(events, 13);  // No event (lunch time)
const slot3pm = ScheduleRules.resolveTimeSlot(events, 15); // Afternoon event

console.log(slot10am.title); // "Working Hours" (morning)
console.log(slot1pm);        // null (not available)
console.log(slot3pm.title);  // "Working Hours" (afternoon)
```

---

## Example 10: Syncing Between Admin and Public Pages

### Scenario
Admin updates schedule, public booking page should automatically reflect changes.

### How It Works

**Step 1**: Admin creates new vacation (Feb 25 - Feb 27)
```javascript
// In admin-panel.html
const newVacation = {
  id: 'vacation_feb25-27',
  type: 'vacation',
  start: '2026-02-25T00:00:00',
  end: '2026-02-27T23:59:59'
};

// Save to storage (both KV and localStorage)
const schedule = await StorageManager.load('schedule');
schedule.events.push(newVacation);
await StorageManager.save('schedule', schedule);

// Broadcast to other tabs
StorageManager.broadcastUpdate(schedule);
```

**Step 2**: Public page (index.html) receives update
```javascript
// In index.html's storage-manager.js listener:
// BroadcastChannel receives message
// Calls window.onScheduleUpdated(newScheduleData)
// Which regenerates calendar events
// Calendar removes old Feb 25 (was available)
// Calendar adds new event showing Feb 25-27 as vacation (❌)
```

**Step 3**: No refresh needed!
- Same-origin communication via BroadcastChannel = instant
- Data persisted in KV = survives page refresh
- localStorage serves as backup if KV fails

### Test It
```javascript
// Open admin-panel.html in Tab A
// Open index.html in Tab B

// In Tab A console:
const schedule = await StorageManager.load('schedule');
schedule.events.push({
  id: 'test_event',
  type: 'vacation',
  start: '2026-02-25T00:00:00',
  end: '2026-02-25T23:59:59'
});
await StorageManager.save('schedule', schedule);
StorageManager.broadcastUpdate(schedule);

// Go to Tab B
// Calendar should update automatically
// (no page refresh needed)
```

---

## Key Takeaways

1. **Priority System Works**: Vacation (99) > day off (95) > working hours (50) > breaks (10)
2. **Conflicts Resolved**: If events overlap, highest priority wins
3. **Subtractive Logic**: Breaks/lunch reduce available hours (not block)
4. **Real-Time Sync**: Changes in admin instantly appear in public page
5. **Persistent Storage**: Data survives page refresh (KV or localStorage)
6. **Flexible Recurring**: Can define complex patterns with daysOfWeek
7. **Easy to Extend**: Add new event types by updating TYPE_CONFIG

---

## Testing Yourself

Try these in your browser console:

```javascript
// 1. Load schedule
const data = await StorageManager.load('schedule');

// 2. Check availability for any date
const avail = ScheduleRules.calculateAvailableHours(data, new Date('2026-02-10'));
console.log(avail);

// 3. Get month overview
const overview = ScheduleRules.getAvailabilityOverview(
  data,
  new Date('2026-02-01'),
  new Date('2026-02-28')
);
console.log(overview);

// 4. Check if specific time is bookable
const canBook = ScheduleRules.isTimeSlotAvailable(
  data,
  new Date('2026-02-10T14:00:00'),
  new Date('2026-02-10T15:00:00')
);
console.log(canBook);
```

All examples assume schedule with working hours + lunch + vacation + breaks defined.
