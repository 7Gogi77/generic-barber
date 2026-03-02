/**
 * FullCalendar Integration - Event generation and configuration
 * Converts schedule data into FullCalendar events
 */

const CalendarEngine = {
  /**
   * Generate FullCalendar events from schedule data
   * Handles recurring events expansion and rule application
   */
  async generateCalendarEvents(scheduleData) {
    const events = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const toLocalDateString = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    // Generate events for next 6 months
    const endDate = new Date(today);
    endDate.setMonth(endDate.getMonth() + 6);

    const eventsSource = (Array.isArray(scheduleData.events) ? scheduleData.events : []).filter(e => !(typeof window !== 'undefined' && typeof window.isEventDeleted === 'function' && window.isEventDeleted(e.id)));

    eventsSource.forEach((event) => {
      // Single events
      if (event.recurring === 'once' || !event.recurring) {
        try {
          const formattedEvent = this.formatCalendarEvent(event);
          if (!formattedEvent) {
            console.warn('⚠ Skipping event due to format error:', event?.id || event?.title);
          } else {
            console.log('📌 Adding single event:', formattedEvent);
            events.push(formattedEvent);
          }
        } catch (err) {
          console.warn('⚠ formatCalendarEvent threw for event:', event?.id || event?.title, err);
        }
      }

      // Weekly recurring events
      if (event.recurring === 'weekly' && event.daysOfWeek) {
        // Recurrence expansion starts at the later of today or the event's start date (if provided)
        let startFrom = new Date(today);
        if (event.start) {
          try {
            const eventStartDate = new Date((String(event.start)).split('T')[0] + 'T00:00:00');
            if (!isNaN(eventStartDate.getTime()) && eventStartDate > startFrom) startFrom = eventStartDate;
          } catch (_) { /* ignore parsing errors */ }
        }

        let current = new Date(startFrom);

        while (current <= endDate) {
          if (event.daysOfWeek.includes(current.getDay())) {
            const recurrenceEvent = { ...event };
            const timeStr = (typeof event.start === 'string' && event.start.includes('T')) ? event.start.split('T')[1] : null;
            const endTimeStr = (typeof event.end === 'string' && event.end.includes('T')) ? event.end.split('T')[1] : null;

            const startTimeUse = timeStr || '09:00';
            const endTimeUse = endTimeStr || '17:00';

            recurrenceEvent.start = toLocalDateString(current) + 'T' + startTimeUse;
            recurrenceEvent.end = toLocalDateString(current) + 'T' + endTimeUse;

            try {
              const formattedEvent = this.formatCalendarEvent(recurrenceEvent);
              if (!formattedEvent) {
                console.warn('⚠ Skipping recurring event due to format error:', recurrenceEvent?.id || recurrenceEvent?.title);
              } else {
                console.log('🔁 Adding recurring event:', formattedEvent);
                events.push(formattedEvent);
              }
            } catch (err) {
              console.warn('⚠ formatCalendarEvent threw for recurring event:', recurrenceEvent?.id || recurrenceEvent?.title, err);
            }
          }

          current.setDate(current.getDate() + 1);
        }
      }
    });

    console.log('✅ Total formatted events:', events.length);
    try {
      const timedCount = events.filter(ev => !ev.allDay).length;
      const allDayCount = events.length - timedCount;
      console.log(`🔎 Formatted events breakdown — timed=${timedCount}, allDay=${allDayCount}`);
      // Log any suspicious events (timed but start/end strings look like dates only)
      events.forEach(ev => {
        try {
          if (!ev.allDay && ev.start && typeof ev.start === 'string') {
            console.warn('⚠ Suspicious formatted timed event with string start:', ev);
          }
        } catch (inner) { /* ignore */ }
      });
    } catch (e) { /* ignore */ }

    // Deduplicate events with tolerance for small time shifts (prefer id equality,
    // but prefer local-origin events and non-generic titles when times collide)
    const unique = [];
    const TIME_TOLERANCE_MS = 10 * 60 * 1000; // 10 minutes

    const isTimesClose = (aStart, aEnd, bStart, bEnd) => {
      try {
        const as = new Date(aStart).getTime();
        const bs = new Date(bStart).getTime();
        const ae = new Date(aEnd).getTime();
        const be = new Date(bEnd).getTime();
        return Number.isFinite(as) && Number.isFinite(bs) && Number.isFinite(ae) && Number.isFinite(be) && Math.abs(as - bs) <= TIME_TOLERANCE_MS && Math.abs(ae - be) <= TIME_TOLERANCE_MS;
      } catch (_) { return false; }
    };

    const genericTitle = t => {
      if (!t) return true;
      const s = String(t).trim();
      return s === '' || s === 'Stranka' || s === 'Rezervacija' || s === 'Customer';
    };

    const prefer = (keep, incoming) => {
      // prefer local-origin events
      const keepLocal = keep.extendedProps?.origin === 'local';
      const incomingLocal = incoming.extendedProps?.origin === 'local';
      if (keepLocal !== incomingLocal) return keepLocal; // if keepLocal true, keep the existing one

      // prefer events with non-generic titles (e.g., not 'Stranka')
      const kTitle = keep.extendedProps?.customer || keep.title || '';
      const iTitle = incoming.extendedProps?.customer || incoming.title || '';
      const kGeneric = genericTitle(kTitle);
      const iGeneric = genericTitle(iTitle);
      if (kGeneric !== iGeneric) return !kGeneric; // if keep is non-generic, keep it

      // prefer non-booking types (prefer worker/event types over generic booking)
      const kBooking = keep.extendedProps?.isBooking || keep.type === 'booking';
      const iBooking = incoming.extendedProps?.isBooking || incoming.type === 'booking';
      if (kBooking !== iBooking) return !kBooking;

      // as a last resort, keep the existing one
      return true;
    };

    events.forEach(e => {
      // CRITICAL: First check for exact ID match - never allow duplicate IDs
      if (e.id) {
        const existingById = unique.findIndex(u => u.id === e.id);
        if (existingById !== -1) {
          console.log('⏭️ Skipping duplicate event by ID:', e.id, '(already exists)');
          return;
        }
      }

      const cust = (e.extendedProps && e.extendedProps.customer) ? String(e.extendedProps.customer).trim() : (e.title ? String(e.title).replace(/^\S+\s/, '').trim() : '');
      const getMs = (val) => { try { return new Date(val).getTime(); } catch(_) { return NaN; } };
      const sMs = getMs(e.start);
      const eMs_ = getMs(e.end);

      // Find an index of a conflicting event (times close + same/empty customer)
      let conflictIdx = -1;
      for (let i = 0; i < unique.length; i++) {
        const u = unique[i];
        const uCust = (u.extendedProps && u.extendedProps.customer) ? String(u.extendedProps.customer).trim() : (u.title ? String(u.title).replace(/^\S+\s/, '').trim() : '');
        if (isTimesClose(e.start, e.end, u.start, u.end) && ((cust && uCust && cust === uCust) || (!cust && !uCust))) { conflictIdx = i; break; }
      }

      if (conflictIdx !== -1) {
        const u = unique[conflictIdx];
        
        // Decide which to keep
        const keepExisting = prefer(u, e);
        if (!keepExisting) {
          console.log('🔁 Replacing event due to preference (keep incoming):', e, 'replacing', u);
          unique[conflictIdx] = e; // prefer incoming
          return; // replaced existing, skip further processing
        } else {
          console.log('⏭️ Skipping near-duplicate event (kept existing):', e);
          return; // keep existing, skip incoming
        }
      }

      unique.push(e);
    });

    console.log('✅ Events after dedupe:', unique.length);
    return unique;
  },

  /**
   * Format single event for FullCalendar
   */
  formatCalendarEvent(event) {
    const typeConfig = ScheduleRules.TYPE_CONFIG[event.type];

    // Determine whether the event strings include explicit times
    // Accept ISO 'T' format, space-separated 'YYYY-MM-DD HH:MM', or Date objects
    const timeRegex = /\d{1,2}:\d{2}/;
    const hasStartTime = (event.start instanceof Date) || (typeof event.start === 'string' && (event.start.includes('T') || timeRegex.test(event.start)));
    const hasEndTime = (event.end instanceof Date) || (typeof event.end === 'string' && (event.end.includes('T') || timeRegex.test(event.end)));

    // Normalize common space-separated date-times to ISO style only when they contain a time part
    if (typeof event.start === 'string' && timeRegex.test(event.start) && !event.start.includes('T')) {
      event.start = event.start.replace(/\s+/, 'T');
    }
    if (typeof event.end === 'string' && timeRegex.test(event.end) && !event.end.includes('T')) {
      event.end = event.end.replace(/\s+/, 'T');
    }

    // Normalize hour-only ISO times (e.g. '2026-02-04T12' -> '2026-02-04T12:00') to avoid inconsistent parsing
    const hourOnlyRegex = /^\d{4}-\d{2}-\d{2}T\d{1,2}(:)?$/;
    if (typeof event.start === 'string' && /^\d{4}-\d{2}-\d{2}T\d{1,2}$/.test(event.start)) {
      event.start = event.start + ':00';
    }
    if (typeof event.end === 'string' && /^\d{4}-\d{2}-\d{2}T\d{1,2}$/.test(event.end)) {
      event.end = event.end + ':00';
    }

    // Normalize start/end to Date objects with sensible fallbacks
    let startDate, endDate;
    let displayEnd = event.end;

    try {
      if (hasStartTime) {
        startDate = new Date(event.start);
      } else {
        // Date-only event: treat as day at 00:00
        startDate = new Date((event.start || '').split('T')[0] + 'T00:00:00');
      }

      if (hasEndTime) {
        endDate = new Date(event.end);
      } else {
        // If end missing or date-only, take the date and add one day for exclusive end
        const endDateStr = ((event.end || event.start) + '').split('T')[0];
        endDate = new Date(endDateStr + 'T00:00:00');
        endDate.setDate(endDate.getDate() + 1);
        displayEnd = endDate.toISOString().split('T')[0] + 'T00:00:00';
      }
    } catch (err) {
      console.warn('⚠ formatCalendarEvent parsing fallback', err);
      // Fallback to attempt gentle parsing; do not throw — return null when unfixable
      startDate = new Date(event.start || Date.now());
      endDate = new Date(event.end || event.start || Date.now());
    }

    // If dates are invalid (NaN), try common fallback strategies
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      // Try using admin-style fields when present: startDate/startTime and endDate/endTime
      try {
        const maybeStart = (event.startDate && event.startTime) ? (String(event.startDate) + 'T' + String(event.startTime)) : null;
        const maybeEnd = (event.endDate && event.endTime) ? (String(event.endDate) + 'T' + String(event.endTime)) : null;
        if (maybeStart) startDate = new Date(maybeStart);
        if (maybeEnd) endDate = new Date(maybeEnd);
      } catch (_) { /* ignore */ }

      // Final check; if still invalid, log and skip this event safely
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.warn('⚠ formatCalendarEvent: invalid dates for event, skipping:', event?.id || event?.title, { start: event.start, end: event.end, startDateField: event.startDate, startTimeField: event.startTime, endDateField: event.endDate, endTimeField: event.endTime });
        return null;
      }
    }

    const durationMs = endDate - startDate;
    const isMultiDay = Number.isFinite(durationMs) && durationMs > (24 * 60 * 60 * 1000);

    // More robust all-day detection:
    // - If both original strings lacked time parts -> all-day
    // - Or if both start/end times are exactly 00:00 and duration >= 24h
    let isAllDay = false;
    if (!hasStartTime && !hasEndTime) {
      isAllDay = true;
    } else if (startDate.getHours() === 0 && startDate.getMinutes() === 0 && endDate.getHours() === 0 && endDate.getMinutes() === 0 && durationMs >= (24 * 60 * 60 * 1000)) {
      isAllDay = true;
    }

    console.log(`🔍 Formatting event "${event.title}":`, {
      originalStart: event.start,
      originalEnd: event.end,
      isMultiDay: isMultiDay,
      durationDays: Number.isFinite(durationMs) ? Math.floor(durationMs / (24 * 60 * 60 * 1000)) : 0,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      isAllDay: isAllDay
    });

    // Decide display mode for blocking types: render blocking events visibly by default
    // (previously vacation/day_off used 'background' which hid them; show all blocking types as visible)
    const BLOCKING_BACKGROUND_TYPES = new Set([]);
    const isBlockingType = event.rules?.isBlocking || typeConfig?.isBlocking;
    const displayMode = (isBlockingType && BLOCKING_BACKGROUND_TYPES.has(event.type)) ? 'background' : 'auto';

      // Booking events should render the customer name (no icon prefix) to avoid duplicate/emoji-titled items
    const isBooking = event.extendedProps?.isBooking || false;
    const customerName = event.extendedProps?.customer || null;
    const titleText = isBooking ? (customerName || event.title || 'Rezervacija') : ((typeConfig?.icon || '📅') + ' ' + (event.title || event.type));

    // For timed events, return Date objects to preserve local time in FullCalendar
    if (!isAllDay) {
      return {
        id: event.id,
        title: titleText,
        start: startDate,
        end: endDate,
        allDay: false,
        color: event.color || typeConfig?.color || '#95a5a6',
        backgroundColor: event.backgroundColor || typeConfig?.backgroundColor || 'rgba(149, 165, 166, 0.15)',
        borderColor: event.borderColor || typeConfig?.borderColor || '#7f8c8d',
        textColor: '#2c3e50',
        extendedProps: {
          type: event.type,
          eventId: event.id,
          isBlocking: event.rules?.isBlocking || typeConfig?.isBlocking || false,
          isSubtractive: event.rules?.isSubtractive || typeConfig?.isSubtractive || false,
          priority: event.rules?.conflictPriority || typeConfig?.priority || 0,
          isMultiDay: isMultiDay,
          // Preserve key extended props so downstream merge/dedupe logic can make correct choices
          origin: event.extendedProps?.origin || null,
          adminKey: event.extendedProps?.adminKey || null,
          worker: event.extendedProps?.worker || null,
          createdAt: event.extendedProps?.createdAt || event.createdAt || null,
          lastModified: event.extendedProps?.lastModified || null,
          // Merge booking-specific extended props (customer, email, phone, services, price, duration, notes)
          isBooking: isBooking,
          customer: customerName || event.extendedProps?.customerName || null,
          email: event.extendedProps?.email || null,
          phone: event.extendedProps?.phone || null,
          services: event.extendedProps?.services || null,
          price: typeof event.extendedProps?.price !== 'undefined' ? event.extendedProps.price : null,
          duration: event.extendedProps?.duration || null,
          notes: event.extendedProps?.notes || ''
        },
        // Blocking events: use displayMode (background only for vacation/day_off, others visible)
        display: displayMode,
        // Allow drag & drop
        editable: true,
        durationEditable: true,
        // Custom styling
        classNames: [
          'schedule-event',
          `event-type-${event.type}`,
          (event.rules?.isBlocking || typeConfig?.isBlocking) ? 'event-blocking' : 'event-normal',
          isMultiDay ? 'event-multiday' : 'event-single'
        ]
      };
    }

    // Use local date-only strings for all-day events (avoid UTC day-shift)
    const toLocalDateString = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    const startIso = toLocalDateString(startDate);
    const endIso = toLocalDateString(endDate);

    return {
      id: event.id,
      title: titleText,
      start: startIso,
      end: endIso,
      allDay: true,
      color: event.color || typeConfig?.color || '#95a5a6',
      backgroundColor: event.backgroundColor || typeConfig?.backgroundColor || 'rgba(149, 165, 166, 0.15)',
      borderColor: event.borderColor || typeConfig?.borderColor || '#7f8c8d',
      textColor: '#2c3e50',
      extendedProps: {
        type: event.type,
        eventId: event.id,
        isBlocking: event.rules?.isBlocking || false,
        isSubtractive: event.rules?.isSubtractive || false,
        priority: event.rules?.conflictPriority || 0,
        isMultiDay: isMultiDay,
        // Preserve key extended props so downstream merge/dedupe logic can make correct choices
        origin: event.extendedProps?.origin || null,
        adminKey: event.extendedProps?.adminKey || null,
        worker: event.extendedProps?.worker || null,
        createdAt: event.extendedProps?.createdAt || event.createdAt || null,
        lastModified: event.extendedProps?.lastModified || null,
        // Merge booking-specific extended props (customer, email, phone, services, price, duration, notes)
        isBooking: isBooking,
        customer: customerName || event.extendedProps?.customerName || null,
        email: event.extendedProps?.email || null,
        phone: event.extendedProps?.phone || null,
        services: event.extendedProps?.services || null,
        price: typeof event.extendedProps?.price !== 'undefined' ? event.extendedProps.price : null,
        duration: event.extendedProps?.duration || null,
        notes: event.extendedProps?.notes || ''
      },
      // Blocking events: use displayMode (background only for vacation/day_off, others visible)
      display: displayMode,
      // Allow drag & drop
      editable: true,
      durationEditable: true,
      // Custom styling
      classNames: [
        'schedule-event',
        `event-type-${event.type}`,
        event.rules?.isBlocking ? 'event-blocking' : 'event-normal',
        isMultiDay ? 'event-multiday' : 'event-single'
      ]
    };
  },

  /**
   * Initialize FullCalendar with configuration
   */
  calendar: null,
  currentScheduleData: null,

  /**
   * Limit events shown per day in month view
   */
  limitEventsPerDay(maxEvents) {
    try {
      console.log(`🔍 limitEventsPerDay called with maxEvents=${maxEvents}`);
      
      // Get all event elements
      const allEvents = Array.from(document.querySelectorAll('.fc-daygrid-event'));
      console.log(`📍 Found ${allEvents.length} total event elements`);
      
      if (allEvents.length === 0) {
        console.log('⚠️ No events found');
        return;
      }
      
      // Group events by their parent day cell (use data-date where possible)
      const eventsByDay = new Map();
      
      allEvents.forEach((eventEl, idx) => {
        try {
          // Find the parent day cell (which contains all events for that day)
          let parent = eventEl.parentElement;
          
          // Go up until we find a day cell container
          while (parent && parent.classList && !parent.classList.contains('fc-daygrid-day-cell')) {
            parent = parent.parentElement;
          }
          
          if (!parent) {
            parent = eventEl.parentElement; // fallback
          }
          
          // Prefer the explicit `data-date` attribute if present, fall back to index
          const key = parent ? (parent.getAttribute('data-date') || parent.getAttribute('data-datekey') || String(idx)) : String(idx);
          
          if (!eventsByDay.has(key)) {
            eventsByDay.set(key, []);
          }
          eventsByDay.get(key).push(eventEl);
        } catch (e) {
          console.warn(`⚠️ Error processing event ${idx}:`, e);
        }
      });
      
      console.log(`📊 Grouped into ${eventsByDay.size} days`);
      
      // Process each day
      eventsByDay.forEach((dayEvents, dayKey) => {
        if (dayEvents.length > maxEvents) {
          console.log(`   Day: ${dayEvents.length} events → hiding ${dayEvents.length - maxEvents}`);
          
          // Hide events beyond max
          for (let i = maxEvents; i < dayEvents.length; i++) {
            // Use setProperty so '!important' is honored when needed
            try {
              dayEvents[i].style.setProperty('display', 'none', 'important');
              dayEvents[i].style.setProperty('visibility', 'hidden', 'important');
            } catch (_) {
              // Fallback for older browsers
              dayEvents[i].style.display = 'none';
              dayEvents[i].style.visibility = 'hidden';
            }
          }
          
          // Add or update "more" link (avoid adding duplicates)
          const hiddenCount = dayEvents.length - maxEvents;
          const lastVisible = dayEvents[maxEvents - 1];
          let moreDiv = (lastVisible && lastVisible.parentElement) ? lastVisible.parentElement.querySelector('.fc-daygrid-day-more') : null;
          if (!moreDiv) {
            moreDiv = document.createElement('div');
            moreDiv.className = 'fc-daygrid-day-more';
            moreDiv.style.cssText = 'padding: 2px 4px; font-size: 11px; color: #3498db; font-weight: 600;';
            if (lastVisible && lastVisible.parentElement) {
              lastVisible.parentElement.appendChild(moreDiv);
            }
          }
          if (moreDiv) {
            moreDiv.textContent = `+${hiddenCount} više`;
          }
        }
      });
      
    } catch (error) {
      console.error('❌ Error in limitEventsPerDay:', error);
    }
  },

  initializeCalendar(containerElement, scheduleData, options = {}) {
    // Check if FullCalendar is available
    if (typeof FullCalendar === 'undefined') {
      console.error('❌ FullCalendar library not loaded');
      containerElement.innerHTML = '<p style="color: #e74c3c; padding: 20px;">Calendar library failed to load. Please check your internet connection and refresh the page.</p>';
      return null;
    }

    console.log('📅 Initializing FullCalendar...');
    console.log('📅 Container element:', containerElement);
    console.log('📅 Schedule data:', scheduleData);

    // Store for later reference
    this.currentScheduleData = scheduleData;

    try {
      // Clear container first
      containerElement.innerHTML = '';
      
      // Get actual available width
      const parentWidth = containerElement.parentElement?.offsetWidth || window.innerWidth;
      console.log('Parent width:', parentWidth);
      
      // Calculate responsive height based on screen size - use a pixel height so timeGrid has space
      const topOffset = 140; // header + toolbars + margins
      const viewportH = window.innerHeight || document.documentElement.clientHeight || 800;
      const calcHeight = Math.max(520, viewportH - topOffset);

      // Store on window object so it can be accessed in other functions
      window._calendarHeight = calcHeight;
      window._minCalendarHeight = 520;

      console.log('Using calendar pixel height:', calcHeight);

      // Set container dimensions - give it a fixed height in px so FullCalendar can render timeGrid
      containerElement.style.padding = '0';
      containerElement.style.margin = '0';
      containerElement.style.boxSizing = 'border-box';
      containerElement.style.display = 'block';
      containerElement.style.width = '100%';
      containerElement.style.maxWidth = '100%';
      containerElement.style.minWidth = '100%';
      containerElement.style.minHeight = `${window._minCalendarHeight}px`;
      containerElement.style.height = `${calcHeight}px`;
      containerElement.style.overflow = 'visible';

      console.log('Container after style:', {
        width: containerElement.style.width,
        height: containerElement.style.height,
        offsetWidth: containerElement.offsetWidth,
        offsetHeight: containerElement.offsetHeight
      });

      // Ensure parent can hold the height and width
      if (containerElement.parentElement) {
        containerElement.parentElement.style.overflow = 'visible';
        containerElement.parentElement.style.width = '100%';
        containerElement.parentElement.style.minWidth = '100%';
        containerElement.parentElement.style.maxWidth = '100%';
        // Keep parent's height flexible but allow it to size to its contents
        containerElement.parentElement.style.display = 'block';
      }

      // Allow container to fill available space
      containerElement.style.flex = '0 0 auto';
      containerElement.style.width = '100%';
      containerElement.style.overflow = 'auto';

      // Compute slot duration from SITE_CONFIG if present
      const slotMinutes = (window.SITE_CONFIG && window.SITE_CONFIG.booking && window.SITE_CONFIG.booking.slotDuration) ? window.SITE_CONFIG.booking.slotDuration : 30;
      const slotDurationStr = `00:${('0' + slotMinutes).slice(-2)}:00`;
      console.log(`📅 Calendar slot duration: ${slotMinutes} minutes (${slotDurationStr})`);

      // Compute commonly used slot min/max strings and allow timeGrid views to show the full day (scrollable)
      const slotMinTimeVal = (window.SITE_CONFIG && window.SITE_CONFIG.booking && window.SITE_CONFIG.booking.businessHours) ? (('0' + window.SITE_CONFIG.booking.businessHours.start).slice(-2) + ':00:00') : '06:00:00';
      const slotMaxTimeVal = (window.SITE_CONFIG && window.SITE_CONFIG.booking && window.SITE_CONFIG.booking.businessHours) ? (('0' + window.SITE_CONFIG.booking.businessHours.end).slice(-2) + ':00:00') : '22:00:00';
      const timeGridSlotMax = '24:00:00';
      const initialScrollTime = options.scrollTime || (window.SITE_CONFIG && window.SITE_CONFIG.booking && window.SITE_CONFIG.booking.scrollTime) || '12:00:00';

      const calendar = new FullCalendar.Calendar(containerElement, {
        initialView: options.initialView || 'dayGridMonth',
        headerToolbar: {
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
        },
        // Slovenian button text
        buttonText: {
          today: 'Danes',
          month: 'Mesec',
          week: 'Teden',
          day: 'Dan',
          list: 'Seznam'
        },
        locale: 'sl',
        firstDay: 1,
        nowIndicator: true,
        dayMaxEvents: 2, // Limit to 2 events per day cell, rest shown in +more link
        dayMaxEventRows: 2, // Limit rows to prevent overlap
        moreLinkClick: 'popover',
        // Prioritize multi-day events first, then by start time
        eventOrder: function(a, b) {
          // Calculate if events span multiple days
          const aStart = new Date(a.start);
          const aEnd = new Date(a.end || a.start);
          const bStart = new Date(b.start);
          const bEnd = new Date(b.end || b.start);
          
          const aMultiDay = Math.abs(aEnd - aStart) > (24 * 60 * 60 * 1000);
          const bMultiDay = Math.abs(bEnd - bStart) > (24 * 60 * 60 * 1000);
          
          // Multi-day events come first
          if (aMultiDay && !bMultiDay) return -1;
          if (!aMultiDay && bMultiDay) return 1;
          
          // If both multi-day or both single-day, sort by start time
          if (aStart < bStart) return -1;
          if (aStart > bStart) return 1;
          
          // If same start time, sort by duration (longer first)
          const aDuration = aEnd - aStart;
          const bDuration = bEnd - bStart;
          return bDuration - aDuration;
        },
        // Business hours (visual only)
        businessHours: {
          daysOfWeek: [1,2,3,4,5],
          startTime: (window.SITE_CONFIG && window.SITE_CONFIG.booking && window.SITE_CONFIG.booking.businessHours) ? (('0' + window.SITE_CONFIG.booking.businessHours.start).slice(-2) + ':00') : '09:00',
          endTime: (window.SITE_CONFIG && window.SITE_CONFIG.booking && window.SITE_CONFIG.booking.businessHours) ? (('0' + window.SITE_CONFIG.booking.businessHours.end).slice(-2) + ':00') : '17:00'
        },
        // TimeGrid options (defaults apply globally, views override to show full day)
        slotMinTime: slotMinTimeVal,
        slotMaxTime: slotMaxTimeVal,
        slotDuration: slotDurationStr,
        slotLabelInterval: { hours: 1 },
        slotLabelFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
        // Hide the all-day slot so week/day views don't show a separate all-day row
        allDaySlot: false,
        views: {
          dayGridMonth: { type: 'dayGridMonth' },
          // Force full 24-hour rendering for timeGrid week/day views
          timeGridWeek: { type: 'timeGrid', slotMinTime: '00:00:00', slotMaxTime: '24:00:00', slotDuration: '00:30:00' },
          timeGridDay: { type: 'timeGrid', slotMinTime: '00:00:00', slotMaxTime: '24:00:00' }
        },
        // Initial vertical scroll position in timeGrid views
        scrollTime: initialScrollTime,
        height: calcHeight,
        // Remove contentHeight: 'auto' to enable scrolling in timegrid views

        // Load events - always fetch fresh from storage to avoid duplicates
        events: async (info, successCallback, failureCallback) => {
          try {
            // CRITICAL: Always reload deletion tracking FIRST before any event loading
            if (typeof window !== 'undefined' && typeof window.loadDeletedEventIds === 'function') {
              await Promise.resolve(window.loadDeletedEventIds());
            }
            
            // Load fresh schedule data from storage each time
            let freshScheduleData = scheduleData;
            if (typeof StorageManager !== 'undefined' && StorageManager.load) {
              try {
                freshScheduleData = await StorageManager.load('schedule');
              } catch (e) {
                console.warn('⚠ Could not load fresh schedule, using initial data');
              }
            }
            
            // Generate events with deletion filter applied
            const events = await CalendarEngine.generateCalendarEvents(freshScheduleData);
            successCallback(events);
          } catch (err) { failureCallback(err); }
        },

        // Basic sizing hooks so FullCalendar can recompute after view changes



        // Interactions
        selectable: true,
        selectOverlap: true,
        editable: true,
        eventDurationEditable: true,

        // Event handling - NOTE: These are overridden by poslovni-panel.html
        // Only used in admin-panel.html - check if modal exists before calling
        selectStart: (selectInfo) => {
          // Prevent FullCalendar's default selection behavior during our custom cell drag
          if (window._isDraggingCustomCells) {
            return false;
          }
          console.log('🖱️ Selection started:', selectInfo.startStr);
        },

        select: (selectInfo) => {
          // Prevent FullCalendar's select handler if we're doing custom cell dragging
          if (window._isDraggingCustomCells) {
            return false;
          }
          console.log('📅 Date selected:', selectInfo.startStr, '→', selectInfo.endStr);
          const shiftDateString = (dateStr, days) => {
            if (!dateStr) return dateStr;
            const [yy, mm, dd] = String(dateStr).split('T')[0].split('-').map(Number);
            if (!yy || !mm || !dd) return dateStr;
            const dt = new Date(yy, mm - 1, dd);
            dt.setDate(dt.getDate() + days);
            const y = dt.getFullYear();
            const m = String(dt.getMonth() + 1).padStart(2, '0');
            const d = String(dt.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
          };
          
          // Parse start and end dates (handle both with and without time)
          let startDate = selectInfo.startStr.split('T')[0]; // "2026-02-16"
          let endDate = selectInfo.endStr ? selectInfo.endStr.split('T')[0] : startDate; // "2026-02-21"
          
          // FullCalendar's end is exclusive, so subtract 1 day
          endDate = shiftDateString(endDate, -1); // "2026-02-20"
          
          console.log('🎯 Highlighting range:', startDate, 'to', endDate);
          
          // Get all day cells and highlight those within range
          document.querySelectorAll('[data-date]').forEach(cell => {
            const cellDate = cell.getAttribute('data-date'); // "2026-02-17"
            if (cellDate >= startDate && cellDate <= endDate) {
              cell.style.backgroundColor = 'rgba(0, 122, 255, 0.2)'; // Blue highlight
              console.log('  ✓ Highlighted', cellDate);
            } else {
              cell.style.backgroundColor = ''; // Clear previous highlight
            }
          });
          
          console.log('📋 Checking for eventModal...');
          const hasAdminModal = document.getElementById('eventModal');
          console.log('📋 Admin modal exists?', !!hasAdminModal);
          // If admin modal exists (admin-panel.html), use the admin modal flow
          if (hasAdminModal) {
            console.log('📋 Calling CalendarEngine.openEventModal from calendar-engine.js (select)');
            CalendarEngine.openEventModal(null, selectInfo, calendar, scheduleData);
            return;
          }

          // Otherwise, if we're in the business panel, open the Add Event modal
          // and prefill with the selected date range. FullCalendar's select end
          // is exclusive for all-day selections, so subtract one day for display.
          const addModal = document.getElementById('addEventModal');
          if (addModal && typeof window.openAddEventModal === 'function') {
            try {
              const startStr = selectInfo.startStr ? selectInfo.startStr.split('T')[0] : null;
              let endStr = selectInfo.endStr ? selectInfo.endStr.split('T')[0] : startStr;

              // If endStr is present and selection was all-day, FullCalendar gives exclusive end — subtract one day
              if (selectInfo.endStr) {
                endStr = shiftDateString(selectInfo.endStr, -1);
              }

              console.log('📤 Opening Add Event modal with range:', startStr, '→', endStr);
              // openAddEventModalWithTab accepts (startDate, endDate)
              window.openAddEventModal(startStr, endStr);
            } catch (err) {
              console.warn('⚠ Failed to open Add Event modal from select handler:', err);
              // Fallback: open with start only
              window.openAddEventModal(selectInfo.startStr ? selectInfo.startStr.split('T')[0] : null);
            }
          } else {
            console.log('📋 Skipping - no Add Event modal present');
          }
        },
        
        eventClick: (clickInfo) => {
          console.log('📅 Event clicked:', clickInfo.event.title);
          console.log('📋 Checking for eventModal...');
          const hasAdminModal = document.getElementById('eventModal');
          console.log('📋 Admin modal exists?', !!hasAdminModal);
          // Only call if the admin modal exists (admin-panel.html context)
          if (hasAdminModal) {
            console.log('📋 Calling CalendarEngine.openEventModal from calendar-engine.js');
            CalendarEngine.openEventModal(clickInfo.event, null, calendar, scheduleData);
          } else {
            console.log('📋 Skipping - not in admin context (no eventModal found)');
          }
        },

        eventContent: (arg) => {
          try {
            const isMobile = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 480px)').matches;
            if (!isMobile) return undefined;

            const type = arg.event.extendedProps?.type || arg.event.type || null;
            const typeCfg = (typeof ScheduleRules !== 'undefined' && ScheduleRules.TYPE_CONFIG && type) ? ScheduleRules.TYPE_CONFIG[type] : null;
            const isBooking = arg.event.extendedProps?.isBooking || arg.event.extendedProps?.tab === 'customer' || arg.event.extendedProps?.customer || arg.event.type === 'booking';
            let emoji = typeCfg && typeCfg.icon ? typeCfg.icon : null;
            if (!emoji && isBooking) emoji = '👤';
            if (!emoji) emoji = '📌';

            return { html: `<span class="mobile-event-emoji" aria-label="${emoji}" title="${emoji}">${emoji}</span>` };
          } catch (_) {
            return undefined;
          }
        },
        
        eventDidMount: (info) => {
          try {
            // Always log mounting details for diagnostics
            const inTimeGrid = info.el && !!info.el.closest('.fc-timegrid');
            console.log('eventDidMount:', { id: info.event.id, title: info.event.title, allDay: info.event.allDay, inTimeGrid });

            // Ensure event nodes are visible (in case of stray CSS)
            if (info.el) {
              info.el.style.visibility = 'visible';
              info.el.style.opacity = 1;
              info.el.style.zIndex = 3;
            }

            // Style booking events (respect explicit per-event coloring when present)
            if (info.event.extendedProps?.isBooking || info.event.id?.startsWith('apt_')) {
              if (info.el) {
                if (!info.event.backgroundColor && !info.event.color) info.el.style.backgroundColor = 'rgba(52, 152, 219, 0.2)';
                if (!info.event.borderColor) info.el.style.borderColor = '#3498db';
                info.el.style.borderWidth = '1px';
                if (!info.event.textColor) info.el.style.color = '#2c3e50';
              }
            }

            // General fallback: if an event (any type) lacks explicit colors, apply TYPE_CONFIG values
            try {
              const evt = info.event || {};
              const el = info.el;
              const type = evt.extendedProps && evt.extendedProps.type ? evt.extendedProps.type : (evt.extendedProps && evt.extendedProps.worker ? 'worker_event' : (evt.type || null));
              const typeCfg = (typeof ScheduleRules !== 'undefined' && ScheduleRules.TYPE_CONFIG && type) ? ScheduleRules.TYPE_CONFIG[type] : null;

              if (el) {
                // Only apply if computed background is transparent or no explicit background provided
                const cs = window.getComputedStyle(el);
                const isTransparentBg = cs && (cs.background === 'rgba(0, 0, 0, 0) none repeat scroll 0% 0% / auto padding-box border-box' || cs.backgroundColor === 'rgba(0, 0, 0, 0)');

                if ((!evt.backgroundColor && typeCfg && typeCfg.backgroundColor) || isTransparentBg) {
                  try { el.style.backgroundColor = (evt.backgroundColor || typeCfg.backgroundColor || typeCfg && typeCfg.color || 'rgba(52, 152, 219, 0.2)'); } catch(_){}
                }
                if ((!evt.borderColor && typeCfg && typeCfg.borderColor) || (cs && (!cs.borderColor || cs.borderColor === 'transparent'))) {
                  try { el.style.borderColor = (evt.borderColor || typeCfg.borderColor || '#3498db'); el.style.borderWidth = el.style.borderWidth || '1px'; } catch(_){}
                }
                if ((!evt.textColor && typeCfg && typeCfg.color) || (cs && (!cs.color || cs.color === 'rgba(0, 0, 0, 0)')) ) {
                  try { el.style.color = (evt.textColor || typeCfg.color || '#2c3e50'); } catch(_){}
                }
              }
            } catch (fbErr) { /* ignore fallback failures */ }

            // Mobile-only: render a single emoji indicator for each event (replace content)
            try {
              const isMobile = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 480px)').matches;
              if (isMobile && info.el) {
                const type = info.event.extendedProps?.type || info.event.type || null;
                const typeCfg = (typeof ScheduleRules !== 'undefined' && ScheduleRules.TYPE_CONFIG && type) ? ScheduleRules.TYPE_CONFIG[type] : null;
                const isBooking = info.event.extendedProps?.isBooking || info.event.extendedProps?.tab === 'customer' || info.event.extendedProps?.customer || info.event.type === 'booking';
                let emoji = typeCfg && typeCfg.icon ? typeCfg.icon : null;
                if (!emoji && isBooking) emoji = '👤';
                if (!emoji) emoji = '📌';

                info.el.innerHTML = `<span class="mobile-event-emoji" aria-label="${emoji}" title="${emoji}">${emoji}</span>`;
                info.el.classList.add('mobile-emoji-only');
              }
            } catch (_) { /* ignore */ }

          } catch (err) { console.warn('eventDidMount hook failed', err); }
        },

        // Hook fired after the events array is applied to the view
        eventsSet: (events) => {
          try {
            const timed = events.filter(e => !e.allDay).length;
            const allDay = events.length - timed;
            console.log('eventsSet: total=', events.length, 'timed=', timed, 'allDay=', allDay);
            // If there are timed events but no timeGrid DOM presence, escalate
            const timegrid = document.querySelector('.fc-timegrid');
            const timegridEventEls = document.querySelectorAll('.fc-timegrid .fc-event');
            if (timed > 0 && timegrid && timegridEventEls.length === 0) {
              // Remediation disabled: do not attempt automatic remakes or repairs from eventsSet
              // This avoids any automatic DOM manipulation or forced re-initialization.
            }
          } catch (err) { console.warn('eventsSet hook failed', err); }
        },
        
        eventContent: (arg) => {
          // Calculate event duration in minutes
          const durationMinutes = arg.event.start && arg.event.end ? 
            Math.round((new Date(arg.event.end) - new Date(arg.event.start)) / (1000 * 60)) : 0;
          
          const startTime = arg.event.start ? new Date(arg.event.start).toLocaleTimeString('sl-SI', {hour: '2-digit', minute: '2-digit'}) : '';
          const endTime = arg.event.end ? new Date(arg.event.end).toLocaleTimeString('sl-SI', {hour: '2-digit', minute: '2-digit'}) : '';
          const timeText = startTime ? (endTime ? `${startTime} - ${endTime}` : startTime) : '';
          
          // Determine emoji based on event type
          let emoji = '📌';
          const type = arg.event.extendedProps?.type || arg.event.type;
          const isBooking = arg.event.extendedProps?.isBooking || arg.event.id?.startsWith('apt_') || arg.event.extendedProps?.tab === 'customer';
          if (isBooking) emoji = '👤'; // Customer booking
          else if (type === 'worker' || arg.event.extendedProps?.worker) emoji = '👨‍💼'; // Worker event
          
          // Check current view type
          const currentView = arg.view?.type || '';
          
          // In WEEK view only: if duration < 45 minutes, show only time + emoji to prevent text overflow
          if (currentView === 'timeGridWeek' && durationMinutes < 45 && durationMinutes > 0) {
            return {
              html: `<div style="display: flex; align-items: center; justify-content: space-between; width: 100%; height: 100%; padding: 1px 3px; font-size: 11px; font-weight: 600;" title="${arg.event.title}"><span>${startTime}</span><span>${emoji}</span></div>`
            };
          }
          
          // For longer appointments (>= 45 min) OR in month/day views, show full content
          if (arg.event.extendedProps?.isBooking || arg.event.id?.startsWith('apt_')) {
            try {
              const customerName = arg.event.extendedProps?.customer || arg.event.extendedProps?.worker || arg.event.title || 'Rezervacija';
              return {
                html: `<div style="padding: 2px; font-size: 12px; font-weight: bold;">${customerName}</div><div style="padding: 2px; font-size: 10px;">${timeText}</div>`
              };
            } catch (err) { /* fallback to default booking rendering */ }
          }

          // Custom rendering for multi-day events
          if (arg.event.extendedProps?.isMultiDay && arg.event.allDay) {
            return {
              html: `<div style="width: 100%; padding: 4px 6px; white-space: normal; overflow: visible;">${arg.event.title}</div>`
            };
          }
          
          // Default rendering for schedule events - show title with time range when available
          if (arg.event.title) {
            const title = arg.event.title.length > 20 ? arg.event.title.substring(0, 20) + '...' : arg.event.title;
            return {
              html: `<div style="padding: 1px 2px; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"><div style=\"font-weight:600; font-size:12px;\">${timeText}</div><div>${title}</div></div>`
            };
          }
          
          return false; // Use default rendering
        },

        eventDrop: async (dropInfo) => {
          console.log('📅 Event dropped:', dropInfo.event.title, 'ID:', dropInfo.event.id);
          
          try {
            // CRITICAL: Reload fresh data from storage to avoid using stale copies
            let currentData = scheduleData;
            if (typeof StorageManager !== 'undefined' && StorageManager.load) {
              try {
                currentData = await StorageManager.load('schedule');
              } catch (e) {
                console.warn('⚠ Could not load fresh schedule, using initial data');
              }
            }
            
            // Find the event by ID
            const eventIndex = currentData.events.findIndex(e => e.id === dropInfo.event.id);
            
            if (eventIndex !== -1) {
              const originalStart = currentData.events[eventIndex].start;
              const originalEnd = currentData.events[eventIndex].end;
              const workerName = currentData.events[eventIndex].workerName;
              const clientName = currentData.events[eventIndex].clientName;
              
              // Update times (normalize all-day end to inclusive date)
              const isAllDay = !!dropInfo.event.allDay;
              let newStart = dropInfo.event.startStr;
              let newEnd = dropInfo.event.endStr;

              const shiftDateString = (dateStr, days) => {
                if (!dateStr) return dateStr;
                const [yy, mm, dd] = String(dateStr).split('T')[0].split('-').map(Number);
                if (!yy || !mm || !dd) return dateStr;
                const dt = new Date(yy, mm - 1, dd);
                dt.setDate(dt.getDate() + days);
                const y = dt.getFullYear();
                const m = String(dt.getMonth() + 1).padStart(2, '0');
                const d = String(dt.getDate()).padStart(2, '0');
                return `${y}-${m}-${d}`;
              };

              if (isAllDay) {
                if (newStart) {
                  newStart = String(newStart).split('T')[0];
                }
                if (newEnd) {
                  newEnd = shiftDateString(newEnd, -1);
                } else if (newStart) {
                  newEnd = newStart;
                }
              }

              currentData.events[eventIndex].start = newStart;
              currentData.events[eventIndex].end = newEnd;
              
              console.log('✅ Updated event:', currentData.events[eventIndex].id, 'old:', originalStart, '→', 'new:', dropInfo.event.startStr);
              
              // Remove ALL duplicates with same ID, worker, date, and time combination
              const cleanedEvents = currentData.events.filter((evt, idx) => {
                // Keep if it's the current index (the one we just updated)
                if (idx === eventIndex) return true;
                // Remove if same ID
                if (evt.id === dropInfo.event.id) {
                  console.log('🗑️ Removing duplicate event:', evt.id, 'at', evt.start, '→', evt.end);
                  return false;
                }
                // Remove if same worker + client + time (different ID but same slot)
                if (evt.workerName === workerName && 
                    evt.clientName === clientName && 
                    evt.start === originalStart && 
                    evt.end === originalEnd) {
                  console.log('🗑️ Removing duplicate by slot:', evt.id, evt.workerName, evt.clientName);
                  return false;
                }
                return true;
              });
              
              currentData.events = cleanedEvents;
              
              // Update the global scheduleData
              scheduleData = currentData;
              
              // Save to storage
              await StorageManager.save('schedule', currentData);
              console.log('💾 Saved to storage after drop (total events:', currentData.events.length, ')');
              
              // Force calendar to refetch from storage
              setTimeout(() => {
                if (calendar && typeof calendar.refetchEvents === 'function') {
                  console.log('🔄 Refetching events after drop');
                  calendar.refetchEvents();
                }
              }, 300);
            } else {
              console.warn('⚠ Event not found in scheduleData:', dropInfo.event.id);
              console.warn('Available event IDs:', currentData.events.map(e => e.id));
              dropInfo.revert();
            }
          } catch (error) {
            console.error('❌ Error in eventDrop:', error);
            dropInfo.revert();
          }
        },

        eventResize: async (resizeInfo) => {
          console.log('📅 Event resized:', resizeInfo.event.title, 'ID:', resizeInfo.event.id);
          
          try {
            // Find and update the event in scheduleData
            const eventIndex = scheduleData.events.findIndex(e => e.id === resizeInfo.event.id);
            
            if (eventIndex !== -1) {
              // Update the event in place (normalize all-day end to inclusive date)
              const isAllDay = !!resizeInfo.event.allDay;
              let newStart = resizeInfo.event.startStr;
              let newEnd = resizeInfo.event.endStr;

              const shiftDateString = (dateStr, days) => {
                if (!dateStr) return dateStr;
                const [yy, mm, dd] = String(dateStr).split('T')[0].split('-').map(Number);
                if (!yy || !mm || !dd) return dateStr;
                const dt = new Date(yy, mm - 1, dd);
                dt.setDate(dt.getDate() + days);
                const y = dt.getFullYear();
                const m = String(dt.getMonth() + 1).padStart(2, '0');
                const d = String(dt.getDate()).padStart(2, '0');
                return `${y}-${m}-${d}`;
              };

              if (isAllDay) {
                if (newStart) {
                  newStart = String(newStart).split('T')[0];
                }
                if (newEnd) {
                  newEnd = shiftDateString(newEnd, -1);
                } else if (newStart) {
                  newEnd = newStart;
                }
              }

              scheduleData.events[eventIndex].start = newStart;
              scheduleData.events[eventIndex].end = newEnd;
              
              console.log('✅ Updated event:', scheduleData.events[eventIndex].id, 'new times:', resizeInfo.event.startStr, '→', resizeInfo.event.endStr);
              
              // Save to storage
              await StorageManager.save('schedule', scheduleData);
              console.log('💾 Saved to storage');
              
              // Force calendar to refetch events after a brief delay
              setTimeout(() => {
                if (calendar && typeof calendar.refetchEvents === 'function') {
                  console.log('🔄 Refetching events after resize');
                  calendar.refetchEvents();
                }
              }, 300);
            } else {
              console.warn('⚠ Event not found in scheduleData:', resizeInfo.event.id);
              resizeInfo.revert();
            }
          } catch (error) {
            console.error('❌ Error in eventResize:', error);
            resizeInfo.revert();
          }
        },

        datesSet: (arg) => {
          console.log('📅 Dates set');

          // Update view-specific classes so styles can be scoped (dayGrid vs timeGrid)
          // Restore granular classes so week and day can have separate CSS
          try {
            const v = arg && arg.view && arg.view.type ? arg.view.type : '';
            if (containerElement) {
              // Specific timegrid variants (no generic view-timegrid class to avoid bleed)
              containerElement.classList.toggle('view-timegrid-week', v === 'timeGridWeek');
              containerElement.classList.toggle('view-timegrid-day', v === 'timeGridDay');
              // Month/daygrid
              containerElement.classList.toggle('view-daygrid', v === 'dayGridMonth');
            }
          } catch (e) { /* ignore */ }

          // If view is a timeGrid, ensure initial scroll position and allow vertical scrolling
          try {
            const v2 = arg && arg.view && arg.view.type ? arg.view.type : '';
            if (v2.startsWith('timeGrid')) {
              try { if (calendar && typeof calendar.setOption === 'function') {
                calendar.setOption('scrollTime', initialScrollTime);
                // Ensure slot bounds are set for full 24h in case the internal options didn't apply
                calendar.setOption('slotMinTime', '00:00:00');
                calendar.setOption('slotMaxTime', '24:00:00');
              } } catch (_) {}

              // Attempt to scroll the timegrid body to the approximate time slot
              setTimeout(() => {
                try {
                  const timeParts = (initialScrollTime || '12:00:00').split(':');
                  const targetHour = parseInt(timeParts[0], 10) || 12;
                  const scrollBody = containerElement.querySelector('.fc-scrollgrid-section-body');
                  const slotEls = containerElement.querySelectorAll('.fc-timegrid .fc-timegrid-slot');
                  if (scrollBody && slotEls && slotEls.length) {
                    // Find a slot whose label matches targetHour
                    for (let i = 0; i < slotEls.length; i++) {
                      const label = slotEls[i].querySelector('.fc-timegrid-slot-label');
                      if (label && /\d{1,2}/.test(label.textContent || '')) {
                        const h = parseInt((label.textContent || '').trim().split(':')[0], 10);
                        if (!isNaN(h) && h >= targetHour) {
                          scrollBody.scrollTop = Math.max(0, slotEls[i].offsetTop - 40);
                          break;
                        }
                      }
                    }
                    // If no matching slot found, ensure we can scroll to bottom so late slots are reachable
                    // (this helps if slot labels are not present or in unexpected format)
                    if (scrollBody.scrollHeight > scrollBody.clientHeight && scrollBody.scrollTop === 0) {
                      // leave as-is; user can use the Bottom button to jump to end
                    }
                  }
                } catch (_) { /* ignore scrolling failures */ }
              }, 120);
            }
          } catch (_) { /* ignore */ }

          // After view renders, limit timed events to 3 per day
          setTimeout(() => {
            if (arg.view.type === 'dayGridMonth') {
              console.log('� Month view rendered - using FullCalendar dayMaxEvents:true for auto height');
            }
            
            // For timeGridWeek only, ensure timegrid and scroll bodies are sized (skip Day to avoid fallbacks there)
            if (arg.view.type === 'timeGridWeek') {
              console.log('🔧 Sizing timeGridWeek view:', arg.view.type);
              setTimeout(() => {
                try {
                  const containerElement = document.getElementById('scheduleCalendar');
                  if (!containerElement) return;
                  const toolbar = containerElement.querySelector('.fc-toolbar');
                  const headerRow = containerElement.querySelector('.fc-col-header');
                  const fcRoot = containerElement.querySelector('.fc');
                  const viewHarness = containerElement.querySelector('.fc-view-harness');
                  const timegrid = containerElement.querySelector('.fc-timegrid');
                  const scrollBodies = containerElement.querySelectorAll('.fc-scrollgrid-section-body');

                  const toolbarH = toolbar ? Math.ceil(toolbar.getBoundingClientRect().height) : 0;
                  const headerH = headerRow ? Math.ceil(headerRow.getBoundingClientRect().height) : 0;
                  const avail = Math.max(520, containerElement.clientHeight - toolbarH - headerH - 8);

                  console.log(`timeGrid sizing: avail=${avail}px, timegrid found? ${!!timegrid}, scrollBodies=${scrollBodies.length}`);

                  if (fcRoot) { fcRoot.style.height = avail + 'px'; fcRoot.style.minHeight = avail + 'px'; fcRoot.style.overflow = 'visible'; }
                  if (viewHarness) { viewHarness.style.height = avail + 'px'; viewHarness.style.minHeight = avail + 'px'; }
                  if (timegrid) { timegrid.style.height = avail + 'px'; timegrid.style.minHeight = avail + 'px'; timegrid.style.overflowX = 'hidden'; timegrid.style.overflowY = 'auto'; }
                  if (scrollBodies && scrollBodies.length) { scrollBodies.forEach(b => { b.style.height = avail + 'px'; b.style.minHeight = avail + 'px'; b.style.maxHeight = avail + 'px'; b.style.overflowX = 'hidden'; b.style.overflowY = 'auto'; }); }
                  
                  // Also target the fc-scroller elements inside timegrid
                  const scrollers = containerElement.querySelectorAll('.fc-timegrid .fc-scroller');
                  if (scrollers && scrollers.length) { scrollers.forEach(s => { s.style.maxHeight = avail + 'px'; s.style.overflowY = 'auto'; s.style.overflowX = 'hidden'; }); }

                  if (calendar && typeof calendar.updateSize === 'function') calendar.updateSize();

                  // Ensure FullCalendar created the time grid slots - retry a few times and fallback to forcing a view re-render
                  (function ensureTimeGridSlots(attempt){
                    try {
                      const slotsEl = containerElement.querySelector('.fc-timegrid .fc-timegrid-slots');
                      const hasSlots = slotsEl && slotsEl.querySelectorAll('*').length > 0;
                      console.log('ensureTimeGridSlots: attempt', attempt, 'hasSlots?', !!hasSlots);

                      if (hasSlots) {
                        // Slots present - good
                        return;
                      }

                      if (attempt >= 4) {
                        // TimeGrid slots not created after retries. Do not force a view re-render here to avoid aggressive fallback behavior.
                        // Exiting silently; higher-level flow (if any) may decide to handle this.
                        return;
                      }

                      // Not yet present - try again with exponential backoff
                      const retryDelays = [120, 240, 480, 800];
                      setTimeout(() => {
                        try { if (calendar && typeof calendar.updateSize === 'function') calendar.updateSize(); } catch(e){}
                        ensureTimeGridSlots(attempt + 1);
                      }, retryDelays[attempt] || 400);
                    } catch (err) { console.warn('⚠ ensureTimeGridSlots failed', err); }
                  })(0);

                } catch (err) { console.warn('⚠ timeGrid sizing in datesSet failed', err); }
              }, 100);
            }
            
            if (calendar.updateSize) {
              calendar.updateSize();
            }
          }, 150);
        },

        viewDidMount: (arg) => {
          console.log('📅 View mounted');
          setTimeout(() => {
            if (calendar.updateSize) {
              calendar.updateSize();
            }

            // Apply view-specific classes on mount so each view can be targeted independently
            try {
              const v = arg && arg.view && arg.view.type ? arg.view.type : '';
              if (containerElement) {

              }
            } catch (e) { /* ignore */ }
            
            // MONTH VIEW: Fix cell heights to prevent expansion - runs after view fully mounted
            const daygridBody = document.querySelector('.fc-daygrid-body');
            if (daygridBody) {
              const isMonthView = arg && arg.view && arg.view.type === 'dayGridMonth';
              const rows = daygridBody.querySelectorAll('.fc-daygrid-row');
              if (rows.length > 0) {
                try {
                  if (isMonthView) {
                    // MONTH VIEW: Set fixed 120px height on all rows and cells
                    daygridBody.style.overflowY = 'auto';
                    daygridBody.style.webkitOverflowScrolling = 'touch';
                    rows.forEach((row) => {
                      row.style.height = '140px';
                      row.style.minHeight = '140px';
                      row.style.maxHeight = '140px';
                      row.style.overflow = 'visible';
                      row.querySelectorAll('.fc-daygrid-day-cell').forEach(cell => {
                        cell.style.height = '140px';
                        cell.style.minHeight = '140px';
                        cell.style.maxHeight = '140px';
                        cell.style.overflow = 'visible';

                        // Keep events container within cell bounds
                        const eventsContainer = cell.querySelector('.fc-daygrid-day-events');
                        if (eventsContainer) {
                          eventsContainer.style.height = 'calc(100% - 40px)';
                          eventsContainer.style.maxHeight = 'calc(100% - 40px)';
                          eventsContainer.style.overflow = 'visible';
                          eventsContainer.style.display = 'flex';
                          eventsContainer.style.flexDirection = 'column';
                          eventsContainer.style.flex = 'none';
                          eventsContainer.style.minHeight = '0';
                          eventsContainer.style.boxSizing = 'border-box';
                        }

                        const moreEl = cell.querySelector('.fc-daygrid-day-more');
                        if (moreEl) { moreEl.style.marginBottom = ''; moreEl.style.paddingBottom = ''; }
                      });
                    });
                    console.log(`✅ Month view mount: fixed 140px cell heights (${rows.length} rows)`);
                  } else {
                    // Other views: clear forced sizing to allow natural heights
                    daygridBody.style.overflowY = 'auto';
                    daygridBody.style.webkitOverflowScrolling = 'touch';
                    rows.forEach((row) => {
                      row.style.height = '';
                      row.style.minHeight = '';
                      row.style.maxHeight = '';
                      row.style.overflow = '';
                      row.querySelectorAll('.fc-daygrid-day-cell').forEach(cell => {
                        cell.style.height = '';
                        cell.style.minHeight = '';

                        // Clear any temporary per-cell events sizing applied earlier
                        const eventsContainer = cell.querySelector('.fc-daygrid-day-events');
                        if (eventsContainer) {
                          eventsContainer.style.height = '';
                          eventsContainer.style.maxHeight = '';
                          eventsContainer.style.overflow = '';
                          eventsContainer.style.overflowY = '';
                          eventsContainer.style.display = '';
                          eventsContainer.style.flex = '';
                          eventsContainer.style.minHeight = '';
                          eventsContainer.style.boxSizing = '';
                          eventsContainer.style.paddingBottom = '';
                          eventsContainer.style.gap = '';
                        }

                        const moreEl = cell.querySelector('.fc-daygrid-day-more');
                        if (moreEl) { moreEl.style.marginBottom = ''; moreEl.style.paddingBottom = ''; }
                      });
                    });
                    console.log(`✅ Daygrid mount: cleared forced row sizing (${rows.length} rows)`);
                  }
                } catch (e) { /* ignore */ }
              }
            }

            // TIMEGRID SANITY CHECK - only apply to timeGridWeek (do not attempt fallbacks for Day view)
            try {
              const v = arg && arg.view && arg.view.type ? arg.view.type : '';
              if (v === 'timeGridWeek' || v === 'timeGridDay') {
                // Force slot bounds for full day and set initial scrollTime again in case options didn't apply earlier
                try { if (calendar && typeof calendar.setOption === 'function') {
                  calendar.setOption('slotMinTime', '00:00:00');
                  calendar.setOption('slotMaxTime', '24:00:00');
                  calendar.setOption('scrollTime', initialScrollTime);
                  console.log('🔧 Applied timeGrid full-day options:', { slotMinTime: '00:00:00', slotMaxTime: '24:00:00', scrollTime: initialScrollTime });

                  // Note: we avoid DOM overrides to prevent fallback side-effects. If slots do not render properly, investigate CSS/FullCalendar options instead.

                } } catch (_) {}

                setTimeout(async () => {
                  try {
                    const timedEvents = (calendar && typeof calendar.getEvents === 'function') ? calendar.getEvents().filter(e => !e.allDay) : [];
                    const timegridEventEls = containerElement.querySelectorAll('.fc-timegrid .fc-event');
                    const slots = containerElement.querySelectorAll('.fc-timegrid .fc-timegrid-slot');
                    console.log('viewDidMount sanity (timeGrid):', { view: v, timedEvents: timedEvents.length, timegridEventEls: timegridEventEls.length, slots: slots.length });

                    // If there are timed events but nothing rendered in the timeGrid, it's likely FullCalendar DOM failed to create time slot or event nodes
                    if (timedEvents.length > 0 && timegridEventEls.length === 0) {
                      // Timed events exist but no elements in timeGrid — remediation disabled (no automatic remake)
                      return;
                    }

                    // If there are no slots at all (collapsed DOM), do not force re-render; remediation disabled
                    if (slots.length === 0) {
                      // No-op: do not force view re-render.
                    }

                    // Minimal approach: check and log slot counts and presence of scroll body; do NOT modify DOM (no fallbacks)
                    try {
                      const slotsContainer = containerElement.querySelector('.fc-timegrid .fc-timegrid-slots');
                      const scrollBody = containerElement.querySelector('.fc-timegrid .fc-scrollgrid-section-body') || containerElement.querySelector('.fc-scrollgrid-section-body');
                      if (slotsContainer && slots && slots.length && scrollBody) {
                        console.log('ℹ timeGrid slots detected:', { slots: slots.length, slotsContainerClientH: slotsContainer.clientHeight, scrollBodyClientH: scrollBody.clientHeight });
                      } else {
                        console.log('ℹ timeGrid slots or scroll body missing or insufficient:', { slots: slots.length, hasSlotsContainer: !!slotsContainer, hasScrollBody: !!scrollBody });
                      }
                    } catch (e) { console.warn('ℹ timeGrid slot check failed', e); }
                  } catch (err) { console.warn('viewDidMount sanity check failed', err); }
                }, 220);
              }
            } catch (err) { /* ignore */ }
          }, 350);
        },

        // Styling
        nowIndicator: true,
        eventDisplay: 'auto',
        // Make overlapping events display side-by-side in timeGrid views
        slotEventOverlap: false,
        // Ensure all-day slot hidden (no dedicated all-day column/row)
        allDaySlot: false,
        height: window._calendarHeight || 600,
        contentHeight: 'parent'
      });

      console.log('✅ Calendar object created:', calendar);
      console.log('Calendar constructor type:', typeof calendar);
      console.log('Calendar is FullCalendar.Calendar:', calendar instanceof FullCalendar.Calendar);
      console.log('Calendar methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(calendar)).slice(0, 10));

      // SMART CELL SELECTION SYSTEM
      // Shows real-time highlighting when dragging to select empty cells
      // Detects if clicking on an event vs empty cell to avoid interfering with appointment dragging
      let isDraggingCells = false;
      let cellSelectionStartDate = null;
      let dragElement = null; // Track which element started the drag
      
      const clearHighlights = () => {
        document.querySelectorAll('[data-date].calendar-cell-selected').forEach(cell => {
          cell.classList.remove('calendar-cell-selected');
        });
      };
      
      // Helper to find the closest day cell (works even if hovering over child elements)
      const findDayCell = (elem) => {
        let current = elem;
        while (current && current !== document) {
          if (current.hasAttribute && current.hasAttribute('data-date')) {
            return current;
          }
          // Try FullCalendar's day cell classes as fallback
          if (current.classList && (current.classList.contains('fc-daygrid-day-cell') || current.classList.contains('fc-daygrid-day'))) {
            return current;
          }
          current = current.parentElement;
        }
        return null;
      };
      
      // Find cell at cursor position - tries elementFromPoint first, then searches bounding rects
      const getCellAtCursorPosition = (x, y) => {
        // First, try direct element at point
        const elemUnderMouse = document.elementFromPoint(x, y);
        if (elemUnderMouse) {
          const cell = findDayCell(elemUnderMouse);
          if (cell && cell.getAttribute('data-date')) {
            return cell;
          }
        }
        
        // Fallback: find cell by checking bounding rectangles
        // This catches cases where cursor is in whitespace but still over a cell visually
        const allCells = Array.from(document.querySelectorAll('[data-date]'));
        for (let cell of allCells) {
          const rect = cell.getBoundingClientRect();
          if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
            return cell;
          }
        }
        
        return null;
      };
      
      // Detect drag-to-select: only if pointerdown is on empty cell/day-top, NOT on an event
      document.addEventListener('pointerdown', (e) => {
        isDraggingCells = false;
        window._isDraggingCustomCells = false;
        
        // Only handle events in the calendar
        if (!e.target.closest('#scheduleCalendar')) return;
        
        // Check if clicking on an event - if so, let FullCalendar/drag system handle it
        if (e.target.closest('.fc-event') || e.target.closest('.fc-daygrid-event')) {
          return;
        }
        
        // Check if clicking on a day cell or day header (empty area)
        const dayCell = findDayCell(e.target);
        if (dayCell) {
          isDraggingCells = true;
          window._isDraggingCustomCells = true;
          cellSelectionStartDate = dayCell.getAttribute('data-date');
          dragElement = dayCell;
          clearHighlights();
          console.log('📍 Cell selection drag started on', cellSelectionStartDate);
          
          // Set initial highlight on the start cell using CSS class
          dayCell.classList.add('calendar-cell-selected');
          
          // Capture pointer on the element to ensure we get all move events
          if (dayCell.setPointerCapture && e.pointerId) {
            dayCell.setPointerCapture(e.pointerId);
          }
        }
      });
      
      // Real-time highlighting as user drags across cells
      // Uses mousemove for responsive feedback
      document.addEventListener('mousemove', (e) => {
        if (!isDraggingCells || !cellSelectionStartDate) return;
        
        const currentCell = getCellAtCursorPosition(e.clientX, e.clientY);
        if (!currentCell) {
          // Still highlight from start to last known good cell
          return;
        }
        
        const currentDate = currentCell.getAttribute('data-date');
        if (!currentDate) return; // No date found
        
        const startDate = cellSelectionStartDate < currentDate ? cellSelectionStartDate : currentDate;
        const endDate = cellSelectionStartDate < currentDate ? currentDate : cellSelectionStartDate;
        
        // Highlight all cells in the range using CSS class (more reliable than inline styles)
        document.querySelectorAll('[data-date]').forEach(cell => {
          const cellDate = cell.getAttribute('data-date');
          if (cellDate >= startDate && cellDate <= endDate) {
            cell.classList.add('calendar-cell-selected');
          } else {
            cell.classList.remove('calendar-cell-selected');
          }
        });
      });
      
      // End drag selection
      document.addEventListener('pointerup', (e) => {
        if (isDraggingCells && dragElement && e.pointerId) {
          try {
            dragElement.releasePointerCapture(e.pointerId);
          } catch (err) {
            // Ignore if not captured
          }
        }
        isDraggingCells = false;
        window._isDraggingCustomCells = false;
        cellSelectionStartDate = null;
        dragElement = null;
        // Keep highlights visible - FullCalendar's select event will handle opening the modal
      });
      
      // Clear highlights when modal closes or escape is pressed
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          clearHighlights();
          isDraggingCells = false;
          window._isDraggingCustomCells = false;
          cellSelectionStartDate = null;
        }
      });
      
      // Expose clearHighlights globally for modal close handlers
      window.clearCalendarHighlights = clearHighlights;

      // Render the calendar
      console.log('📅 About to call calendar.render()...');
      console.log('Calendar object:', calendar);
      console.log('Calendar._component:', calendar._component);
      
      try {
        console.log('Calling render...');
        const renderResult = calendar.render();
        console.log('✅ FullCalendar rendered successfully, result:', renderResult);
        // Expose calendar globally for debug helpers
        try { window.calendar = calendar; } catch (err) { /* ignore */ }

        // Diagnostic helpers: inspect computed styles for rendered events (call from console)
        try {
          window.calendarDebug = window.calendarDebug || {};
          window.calendarDebug.logEventStyles = () => {
            try {
              const firstTimeEvent = document.querySelector('.fc-timegrid .fc-event');
              const firstDayEvent = document.querySelector('.fc-daygrid .fc-event');
              const describe = (el) => {
                if (!el) return null;
                const cs = window.getComputedStyle(el);
                return {
                  tag: el.tagName,
                  className: el.className,
                  inlineStyle: el.getAttribute('style'),
                  background: cs.background,
                  backgroundImage: cs.backgroundImage,
                  backgroundColor: cs.backgroundColor,
                  color: cs.color,
                  opacity: cs.opacity,
                  visibility: cs.visibility,
                  display: cs.display,
                  zIndex: cs.zIndex
                };
              };
              const res = { timeEvent: describe(firstTimeEvent), dayEvent: describe(firstDayEvent) };
              console.log('🔬 calendarDebug.logEventStyles result:', res);
              return res;
            } catch (e) { console.warn('calendarDebug.logEventStyles failed', e); return null; }
          };
        } catch (e) { /* ignore diagnostic helper failure */ }

        // Apply initial view class to container
        try {
          const initView = calendar && calendar.view && calendar.view.type ? calendar.view.type : null;
          if (initView && containerElement) {
            containerElement.classList.toggle('view-timegrid-week', initView === 'timeGridWeek');
            containerElement.classList.toggle('view-timegrid-day', initView === 'timeGridDay');
            containerElement.classList.toggle('view-daygrid', initView === 'dayGridMonth');
          }
        } catch (e) { /* ignore */ }
        // Defer sizing — run a few attempts with increasing delays to allow FullCalendar DOM to settle
        (function robustSizing() {
          const delays = [50, 150, 350, 700];
          const maxAttempts = delays.length;

          function applySizing(avail) {
            try {
              const toolbar = containerElement.querySelector('.fc-toolbar');
              const headerRow = containerElement.querySelector('.fc-col-header');
              const fcRoot = containerElement.querySelector('.fc');
              const viewHarness = containerElement.querySelector('.fc-view-harness');
              const timegrid = containerElement.querySelector('.fc-timegrid');
              const scrollBodies = containerElement.querySelectorAll('.fc-scrollgrid-section-body');

              console.log('applySizing: timegrid found?', !!timegrid, 'scrollBodies count', scrollBodies.length);

              if (fcRoot) { fcRoot.style.height = avail + 'px'; fcRoot.style.minHeight = avail + 'px'; fcRoot.style.overflow = 'visible'; }
              if (viewHarness) { viewHarness.style.height = avail + 'px'; viewHarness.style.minHeight = avail + 'px'; }
              if (timegrid) { timegrid.style.height = avail + 'px'; timegrid.style.minHeight = avail + 'px'; timegrid.style.overflowX = 'hidden'; timegrid.style.overflowY = 'auto'; }
              if (scrollBodies && scrollBodies.length) { scrollBodies.forEach(b => { b.style.height = avail + 'px'; b.style.minHeight = avail + 'px'; b.style.maxHeight = avail + 'px'; b.style.overflowX = 'hidden'; b.style.overflowY = 'auto'; }); }
              
              // Also target the fc-scroller elements inside timegrid
              const scrollers = containerElement.querySelectorAll('.fc-timegrid .fc-scroller');
              if (scrollers && scrollers.length) { scrollers.forEach(s => { s.style.maxHeight = avail + 'px'; s.style.overflowY = 'auto'; s.style.overflowX = 'hidden'; }); }

              // Also set calendar options so FullCalendar knows the explicit height
              try { if (calendar && typeof calendar.setOption === 'function') { calendar.setOption('height', avail); calendar.setOption('contentHeight', 'parent'); } } catch (err) { /* ignore */ }
              if (calendar && typeof calendar.updateSize === 'function') calendar.updateSize();
            } catch (err) { console.warn('⚠ applySizing failed', err); }
          }

          function attempt(n) {
            try {
              const toolbar = containerElement.querySelector('.fc-toolbar');
              const headerRow = containerElement.querySelector('.fc-col-header');
              const toolbarH = toolbar ? Math.ceil(toolbar.getBoundingClientRect().height) : 0;
              const headerH = headerRow ? Math.ceil(headerRow.getBoundingClientRect().height) : 0;
              const avail = Math.max(520, containerElement.clientHeight - toolbarH - headerH - 8);

              console.log(`sizing attempt #${n + 1}/${maxAttempts} — computed avail=${avail}px`, { toolbarH, headerH, containerH: containerElement.clientHeight });
              applySizing(avail);

              // Check for collapsed sections
              const collapsed = Array.from(containerElement.querySelectorAll('.fc-scrollgrid-section-body')).filter(b => b.getBoundingClientRect().height < 6);
              const timegrid = containerElement.querySelector('.fc-timegrid');
              const timegridCollapsed = timegrid && timegrid.getBoundingClientRect().height < 6;

              console.log('collapsed scrollBodies:', collapsed.length, 'timegrid collapsed?', timegridCollapsed);

              if (collapsed.length === 0 && !timegridCollapsed) {
                console.log('✅ Sizing successful — no collapsed sections');
                return;
              }

              if (n + 1 < maxAttempts) {
                const delay = delays[n + 1];
                console.log(`⚠ Detected ${collapsed.length} collapsed sections; retrying in ${delay}ms`);
                setTimeout(() => attempt(n + 1), delay);
              } else {
                // Sizing attempts exhausted. No automatic DOM fallbacks will be applied here to avoid unexpected layout changes.
                // The caller/view may opt to handle layout issues explicitly. (No-op)
              }
            } catch (err) { console.warn('⚠ sizing attempt failed', err); }
          }

          // Run first attempt after a short delay
          setTimeout(() => attempt(0), delays[0]);
        })();

        // Safely process day cells (may not exist immediately after render).
        (function handleDayCells() {
          function processDayCell(dayCell) {
            const eventsContainer = dayCell.querySelector('.fc-daygrid-day-events');
            if (eventsContainer) {
              const allEventEls = Array.from(eventsContainer.querySelectorAll('.fc-daygrid-event'));
              if (allEventEls.length > 3) {
                const dateEl = dayCell.querySelector('.fc-daygrid-day-number');
                const dayNum = dateEl ? dateEl.textContent : '?';
                console.log(`%c📅 FEB ${dayNum}: ${allEventEls.length} events found`, 'color: blue; font-weight: bold; font-size: 13px');

                let timedCount = 0;
                allEventEls.forEach((el) => {
                  const text = el.textContent;
                  const hasTime = /\d{2}:\d{2}/.test(text);

                  if (hasTime) {
                    timedCount++;
                    if (timedCount > 3) {
                      el.style.display = 'none';
                      console.log(`%c  ❌ HIDING #${timedCount}: ${text.substring(0, 35)}`, 'color: red; font-weight: bold');
                    }
                  }
                });
              }
            }
          }

          try {
            let dayCells = containerElement.querySelectorAll('.fc-daygrid-day-cell');
            if (!dayCells || dayCells.length === 0) {
              // Retry once shortly after render in case DOM hasn't settled
              setTimeout(() => {
                try {
                  dayCells = containerElement.querySelectorAll('.fc-daygrid-day-cell');
                  if (dayCells && dayCells.length > 0) {
                    Array.from(dayCells).forEach(processDayCell);
                  } else {
                    console.log('⚠ No .fc-daygrid-day-cell elements found after retry.');
                  }
                } catch (err) { console.warn('⚠ Error processing dayCells on retry', err); }
              }, 250);
              return;
            }

            Array.from(dayCells).forEach(processDayCell);
          } catch (err) {
            console.warn('⚠ Error processing dayCells', err);
          }
        })();

      } catch (renderError) {
        console.error('❌ Error calling calendar.render():', renderError);
        console.error('Error stack:', renderError.stack);
        throw renderError;
      }
      
      // Post-render adjustments disabled to avoid automatic DOM sizing/fallbacks
      // This area formerly applied many forced layout changes (styles, updateSize, resize events, forced table display, refetchEvents).
      // Per request, we will not modify DOM layout here. We will still call a single updateSize() if available to allow FullCalendar to do its standard layout pass.
      try {
        if (calendar && typeof calendar.updateSize === 'function') calendar.updateSize();
      } catch (err) { /* ignore */ }

      
      // Store calendar reference
      this.calendar = calendar;
      this.containerElement = containerElement;
      
      // Add window resize handler for responsive resizing
      let resizeTimeout;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          console.log('📱 Window resized, recalculating calendar height');
          
          // Always use 100% - no fixed heights
          const newCalendarHeight = '100%';
          const newMinCalendarHeight = '100%';
          
          // Store new heights
          window._calendarHeight = newCalendarHeight;
          window._minCalendarHeight = newMinCalendarHeight;
          
          // Apply to container
          containerElement.style.minHeight = '100%';
          containerElement.style.height = '100%';
          
          // Apply to FC elements
          const fcView = containerElement.querySelector('.fc');
          if (fcView) {
            fcView.style.height = '100%';
            const fcRoot = containerElement.querySelector('.fc-root');
            if (fcRoot) fcRoot.style.height = '100%';
            const fcViewHarness = containerElement.querySelector('.fc-view-harness');
            if (fcViewHarness) fcViewHarness.style.height = '100%';
          }
          
          // Update calendar size
          if (calendar.updateSize) {
            calendar.updateSize();
          }
          
          console.log('✅ Calendar resized to: 100%');
        }, 250); // Debounce resize events
      });

      return calendar;
    } catch (error) {
      console.error('❌ Error in initializeCalendar:', error);
      console.error(error.stack);
      containerElement.innerHTML = '<p style="color: #e74c3c; padding: 20px;">Error: ' + error.message + '</p>';
      return null;
    }
  },

  /**
   * Remake Day/Week timeGrid views by fully reinitializing the calendar and cycling views
   * Useful when FullCalendar's timeGrid DOM fails to render the hourly slots
   */
  async remakeTimeGridViews(preferredView = 'timeGridWeek', scheduleDataParam) {
    // REMOVED: fallback remediation disabled by request
    // This function is intentionally a no-op to prevent automatic re-initialization or forced view changes.
    return this.calendar || null;
  },

  /**
   * Open event creation/editing modal
   */
  openEventModal(event, selectInfo, calendar, scheduleData) {
    const modal = document.getElementById('eventModal');
    const form = document.getElementById('eventForm');
    const deleteBtn = document.getElementById('eventDeleteBtn');
    const cancelBtn = document.getElementById('eventCancelBtn');
    const titleInput = document.getElementById('eventTitle');
    const typeInput = document.getElementById('eventType');
    const startInput = document.getElementById('eventStart');
    const endInput = document.getElementById('eventEnd');

    if (!modal || !form) {
      console.error('❌ Modal or form not found');
      return;
    }

    // Setup type buttons
    const typeButtons = document.querySelectorAll('#typeSelection button');
    typeButtons.forEach(btn => {
      btn.style.borderColor = '#ecf0f1';
      btn.style.backgroundColor = '#f8fafb';
      btn.style.color = '#2c3e50';

      const type = btn.getAttribute('data-type');
      // Determine initial selection: explicit event type > selectInfo (new-event defaults) > form input value
      const initialType = event?.extendedProps?.type ?? (selectInfo ? 'working_hours' : (typeInput ? typeInput.value : 'working_hours'));
      if (type === initialType) {
        btn.style.borderColor = '#3498db';
        btn.style.backgroundColor = '#3498db';
        btn.style.color = 'white';
      }

      btn.onclick = (e) => {
        e.preventDefault();
        typeButtons.forEach(b => {
          b.style.borderColor = '#ecf0f1';
          b.style.backgroundColor = '#f8fafb';
          b.style.color = '#2c3e50';
        });
        btn.style.borderColor = '#3498db';
        btn.style.backgroundColor = '#3498db';
        btn.style.color = 'white';
        typeInput.value = type;
      };
    });

    // Helper: format a Date (or date-like) into a local 'YYYY-MM-DDTHH:mm' for datetime-local inputs
    const fmtLocal = (d) => {
      try {
        const dt = (d instanceof Date) ? d : new Date(d);
        const pad = (n) => String(n).padStart(2, '0');
        return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
      } catch (_) { return ''; }
    };

    // Set form values
    if (event) {
      // Editing existing event (FullCalendar EventApi or plain object)
      titleInput.value = event.title || '';
      typeInput.value = event.extendedProps?.type || 'working_hours';
      startInput.value = event.start ? fmtLocal(event.start) : '';
      endInput.value = event.end ? fmtLocal(event.end) : (event.start ? fmtLocal(event.start) : '');
      deleteBtn.style.display = 'flex';
    } else {
      // Creating new event
      titleInput.value = '';
      typeInput.value = 'working_hours';
      
      // Debug: log what we received
      console.log('selectInfo:', selectInfo);
      console.log('startStr:', selectInfo?.startStr);
      console.log('endStr:', selectInfo?.endStr);
      
      // Auto-fill start and end times from selected date range
      if (selectInfo?.startStr) {
        try {
          // Parse the date string from FullCalendar
          let startDate = new Date(selectInfo.startStr);
          let endDate = new Date(selectInfo.endStr || selectInfo.startStr);
          
          // If dates are invalid, try parsing without timezone
          if (isNaN(startDate.getTime())) {
            startDate = new Date(selectInfo.startStr.replace('Z', ''));
          }
          if (isNaN(endDate.getTime())) {
            endDate = new Date((selectInfo.endStr || selectInfo.startStr).replace('Z', ''));
          }
          
          // Set default times: 09:00 to 17:00
          startDate.setHours(9, 0, 0, 0);
          endDate.setHours(17, 0, 0, 0);
          
          // Convert to datetime-local format (local time) using helper
          const startStr = fmtLocal(startDate);
          const endStr = fmtLocal(endDate);

          console.log('Formatted start (local):', startStr);
          console.log('Formatted end (local):', endStr);

          startInput.value = startStr;
          endInput.value = endStr;
        } catch (err) {
          console.error('Error parsing dates:', err);
          // Fallback: set default times for today
          const now = new Date();
          now.setHours(9, 0, 0, 0);
          const tomorrow = new Date(now);
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(17, 0, 0, 0);
          
          startInput.value = now.toISOString().slice(0, 16);
          endInput.value = tomorrow.toISOString().slice(0, 16);
        }
      }
      
      deleteBtn.style.display = 'none';
    }

    // Update type button styles
    typeButtons.forEach(btn => {
      const type = btn.getAttribute('data-type');
      if (type === typeInput.value) {
        btn.style.borderColor = '#3498db';
        btn.style.backgroundColor = '#3498db';
        btn.style.color = 'white';
      }
    });

    // Handle form submission
    form.onsubmit = async (e) => {
      e.preventDefault();

      const title = titleInput.value.trim();
      if (!title) {
        alert('Vnesite naziv dogodka');
        return;
      }

      const type = typeInput.value;
      const start = startInput.value;
      const end = endInput.value;

      console.log('🔍 SAVE EVENT - User input from modal:', {
        title,
        type,
        start,
        end
      });

      if (!start || !end) {
        alert('Vnesite datum in čas početka in konca');
        return;
      }

      // Get color for type
      const typeColors = {
        'working_hours': '#27ae60',
        'break': '#f39c12',
        'lunch': '#e67e22',
        'vacation': '#3498db',
        'sick_leave': '#9b59b6',
        'day_off': '#e74c3c'
      };

      if (event) {
        // Update existing event
        const eventObj = scheduleData.events.find(e => e.id === event.id);
        if (eventObj) {
          eventObj.title = title;
          eventObj.type = type;
          eventObj.start = start;
          eventObj.end = end;
          eventObj.color = typeColors[type];

          // Update in calendar when EventApi instance is provided (guarded)
          try {
            if (typeof event.setProp === 'function') {
              event.setProp('title', title);
              event.setProp('backgroundColor', typeColors[type]);
              if (typeof event.setExtendedProp === 'function') event.setExtendedProp('type', type);
              event.setStart(start);
              event.setEnd(end);
            }
          } catch (updateErr) { console.warn('⚠ Failed to update EventApi instance', updateErr); }

          // Persist update to storage/DB
          try {
            if (typeof window.saveScheduleData === 'function') {
              await window.saveScheduleData();
              console.log('✓ Event update persisted');
            } else {
              try { localStorage.setItem('schedule', JSON.stringify(scheduleData)); console.log('✓ Event update saved to localStorage'); } catch(e){}
            }
          } catch (saveErr) { console.warn('⚠ Failed to persist event update', saveErr); }
        }
      } else {
        // Create new event
        const newEvent = {
          id: Date.now().toString(),
          title: title,
          type: type,
          start: start,
          end: end,
          color: typeColors[type],
          recurring: 'once'
        };

        try {
          console.log('📌 Creating new event:', newEvent);
          scheduleData.events.push(newEvent);
          
          // Format event for FullCalendar before adding
          const formattedEvent = CalendarEngine.formatCalendarEvent(newEvent);
          console.log('📌 Formatted event for calendar:', formattedEvent);

          // Persist creation to storage/DB first so we treat scheduleData as canonical
          try {
            if (typeof window.saveScheduleData === 'function') {
              await window.saveScheduleData();
              console.log('✓ New event persisted');
            } else {
              try { localStorage.setItem('schedule', JSON.stringify(scheduleData)); console.log('✓ New event saved to localStorage'); } catch(e){}
            }
          } catch (saveErr) { console.warn('⚠ Failed to persist new event', saveErr); }

          // Refresh calendar from canonical schedule to avoid duplicates
          if (typeof loadAppointmentsToCalendarNow === 'function') {
            try { await loadAppointmentsToCalendarNow(); } catch (e) { console.warn('⚠ loadAppointmentsToCalendarNow failed', e); }
          } else if (calendar) {
            // Fallback: add the single formatted event
            try { calendar.addEvent(formattedEvent); console.log('📌 Event added to calendar (fallback add)'); } catch(e) { console.warn('⚠ calendar.addEvent fallback failed', e); }
          }
        } catch (err) {
          console.error('❌ Error adding event to calendar:', err);
          console.error('Error stack:', err.stack);
        }
      }

      // Save to storage
      const saveResult = await StorageManager.save('schedule', scheduleData);

      // Update events list
      CalendarEngine.updateEventsList(scheduleData);

      // Close modal
      modal.style.display = 'none';
    };

    // Handle delete
    deleteBtn.onclick = async (e) => {
      e.preventDefault();
      if (!confirm('Izbriši ta dogodek?')) return;

      const eventId = event && (event.id || event.extendedProps?.eventId);
      if (!eventId) {
        console.error('❌ Cannot delete: No event ID found');
        modal.style.display = 'none';
        return;
      }

      alert(`🗑️  DELETING (calendar-engine): ${eventId}`);
      console.log(`🗑️  DELETING EVENT: ${eventId}`);
      console.log(`📋 Deletion Tracker Size BEFORE: ${window.deletedEventIds?.size || 0}`);

      // STEP 1: Mark as deleted FIRST
      console.log(`⏳ Step 1: Calling markEventDeleted(${eventId})...`);
      if (typeof window.markEventDeleted === 'function') {
        window.markEventDeleted(eventId);
        console.log(`✓ Step 1 COMPLETE: ${eventId} marked as deleted`);
        console.log(`📋 Deletion Tracker Size AFTER markEventDeleted: ${window.deletedEventIds?.size || 0}`);
        if (typeof window.isEventDeleted === 'function') {
          console.log(`✓ Step 1 VERIFIED: isEventDeleted returns ${window.isEventDeleted(eventId)}`);
        }
      } else {
        console.error('❌ Step 1 FAILED: markEventDeleted not available');
      }

      // STEP 2: Remove from memory
      console.log(`⏳ Step 2: Removing from scheduleData...`);
      scheduleData.events = scheduleData.events.filter(ev => ev.id !== eventId);
      console.log('✓ Step 2 COMPLETE: Removed from scheduleData');

      // STEP 3: Save to localStorage
      console.log(`⏳ Step 3: Saving to localStorage...`);
      try {
        const saved = JSON.stringify(scheduleData);
        localStorage.setItem('schedule', saved);
        console.log('✓ Step 3 COMPLETE: Saved to localStorage');
      } catch (e) {
        console.error('❌ Step 3 FAILED: localStorage error:', e);
      }

      // STEP 4: Remove from DOM
      console.log(`⏳ Step 4: Removing from DOM...`);
      try {
        if (event && typeof event.remove === 'function') {
          event.remove();
          console.log('✓ Step 4 COMPLETE: Removed from DOM');
        }
      } catch (err) {
        console.warn('⚠ Step 4 FAILED:', err);
      }

      // STEP 5: Remove all calendar instances
      console.log(`⏳ Step 5: Removing calendar instances...`);
      if (calendar) {
        try {
          calendar.getEvents().forEach(ev => {
            if (ev.id === eventId) ev.remove();
          });
          console.log('✓ Step 5 COMPLETE: Removed all instances');
        } catch (err) {
          console.warn('⚠ Step 5 FAILED:', err);
        }
      }

      modal.style.display = 'none';

      // STEP 6: Reload deletion tracker
      console.log(`⏳ Step 6: Reloading deletion tracker...`);
      if (typeof window.loadDeletedEventIds === 'function') {
        window.loadDeletedEventIds();
        console.log('✓ Step 6 COMPLETE: Reloaded deletion tracker from localStorage');
      }

      // STEP 7: Refetch calendar
      console.log(`⏳ Step 7: Refetching calendar...`);
      if (calendar && typeof calendar.refetchEvents === 'function') {
        try {
          await Promise.resolve(calendar.refetchEvents());
          console.log('✓ Step 7 COMPLETE: Calendar refetched - deletion filter applied');
        } catch (err) {
          console.warn('⚠ Step 7 FAILED:', err);
        }
      }

      // STEP 8: Sync to Firebase in background
      console.log(`⏳ Step 8: Syncing to Firebase...`);
      if (typeof StorageManager !== 'undefined' && StorageManager.save) {
        StorageManager.save('schedule', scheduleData).then(result => {
          console.log('✓ Step 8 COMPLETE: Firebase synced');
        }).catch(err => {
          console.warn('⚠ Step 8 PARTIAL: Firebase sync failed (OK if offline):', err.message);
        });
      }

      console.log(`✅ DELETION COMPLETE: Event ${eventId} PERMANENTLY deleted`);
    };

    // Handle cancel
    cancelBtn.onclick = () => {
      modal.style.display = 'none';
    };

    // Close modal when clicking outside
    modal.onclick = (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    };

    // Show modal
    modal.style.display = 'flex';
  },

  /**
   * Update events list display
   */
  updateEventsList(scheduleData) {
    const listContainer = document.getElementById('eventsList');
    if (!listContainer) return;

    if (!scheduleData.events || scheduleData.events.length === 0) {
      listContainer.innerHTML = '<p style="color: #95a5a6; text-align: center; padding: 20px;">Nema događaja - dodajte novi klikanjem na kalendarijum!</p>';
      return;
    }

    const typeEmojis = {
      'working_hours': '💼',
      'break': '☕',
      'lunch': '🍽️',
      'vacation': '🏖️',
      'sick_leave': '🏥',
      'day_off': '❌'
    };

    const typeColors = {
      'working_hours': '#27ae60',
      'break': '#f39c12',
      'lunch': '#e67e22',
      'vacation': '#3498db',
      'sick_leave': '#9b59b6',
      'day_off': '#e74c3c'
    };

    const eventsHTML = scheduleData.events.map(event => {
      const startDate = new Date(event.start);
      const endDate = new Date(event.end);
      const emoji = typeEmojis[event.type] || '📅';
      const color = typeColors[event.type] || '#95a5a6';
      const startStr = startDate.toLocaleDateString('sl-SI', { weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit' });
      const startTime = startDate.toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit' });
      const endTime = endDate.toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit' });

      return `
        <div style="display: flex; gap: 12px; padding: 12px; background: white; border-radius: 6px; border-left: 4px solid ${color}; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <div style="font-size: 24px; min-width: 30px; text-align: center;">${emoji}</div>
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 600; color: #2c3e50; word-break: break-word;">${event.title}</div>
            <div style="font-size: 12px; color: #7f8c8d; margin-top: 4px;">
              📅 ${startStr} | ⏰ ${startTime} - ${endTime}
            </div>
          </div>
        </div>
      `;
    }).join('');

    listContainer.innerHTML = eventsHTML;
  }
};

// ===== WORKING HOURS MANAGEMENT =====
function saveWorkingHours() {
  const startTime = document.getElementById('workStartTime').value;
  const endTime = document.getElementById('workEndTime').value;
  
  if (!startTime || !endTime) {
    alert('⚠️ Molim postavi vrijeme početka i kraja rada!');
    return;
  }
  
  if (startTime >= endTime) {
    alert('⚠️ Vrijeme početka mora biti prije vremena kraja rada!');
    return;
  }
  
  // Save working hours config to localStorage
  const workingHours = { start: startTime, end: endTime };
  localStorage.setItem('workingHours', JSON.stringify(workingHours));
  
  // Show confirmation message
  const infoDiv = document.getElementById('workingHoursInfo');
  const displayDiv = document.getElementById('workingHoursDisplay');
  displayDiv.textContent = `${startTime} - ${endTime}`;
  infoDiv.style.display = 'block';
  
  // Create or update "Delo" events for working hours
  createWorkingHoursEvents(startTime, endTime).catch(err => {
    console.error('Greška pri kreiranju radnih sati:', err);
  });
  
  console.log(`✓ Radni sati postavljeni: ${startTime} - ${endTime}`);
}

// Helper za debug output
function debugLog(msg) {
  const timestamp = new Date().toLocaleTimeString();
  const fullMsg = `[${timestamp}] ${msg}`;
  console.log(fullMsg);
  // Write to either internal debugOutput (older) or the visible debug-panel
  const debugDiv = document.getElementById('debugOutput') || document.getElementById('debug-panel');
  if (debugDiv) {
    // If it's the debug-panel created in admin-panel.html, append HTML
    if (debugDiv.id === 'debug-panel') {
      debugDiv.innerHTML += fullMsg + '<br>';
    } else {
      debugDiv.textContent += '\n' + fullMsg;
      debugDiv.scrollTop = debugDiv.scrollHeight;
    }
  }
}

// Load appointments from bookings (global function)
async function loadAppointmentsToCalendarNow() {
  debugLog('🔄 Loading bookings from StorageManager schedule');
  try {
    if (window.calendar) {
      // Simply refetch events - the events callback will load fresh data
      window.calendar.refetchEvents();
      debugLog(`✅ Calendar events refetched`);
    }
  } catch (error) {
    debugLog(`❌ loadAppointmentsToCalendarNow error: ${error.message}`);
  }
}

// Create daily working hours events
async function createWorkingHoursEvents(startTime, endTime) {
  try {
    const schedule = await StorageManager.load('schedule');
    
    // Remove existing "Delo" events
    schedule.events = schedule.events.filter(e => e.type !== 'working_hours' || e.title !== '💼 Delo');
    
    // Get current and next 365 days
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 365; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      
      // Create working hours event for this day
      const event = {
        id: 'delo_' + dateStr,
        title: '💼 Delo',
        type: 'working_hours',
        start: `${dateStr}T${startTime}`,
        end: `${dateStr}T${endTime}`,
        recurring: 'daily',
        color: '#27ae60',
        backgroundColor: 'rgba(39, 174, 96, 0.3)',
        borderColor: '#27ae60',
        editable: false,
        extendedProps: {
          isWorkingHours: true
        }
      };
      
      schedule.events.push(event);
    }
    
    // Save to storage
    await StorageManager.save('schedule', schedule);
    
    // Refresh calendar from canonical schedule so rendering is consistent
    if (typeof loadAppointmentsToCalendarNow === 'function') {
      try { await loadAppointmentsToCalendarNow(); } catch (e) { console.warn('⚠ loadAppointmentsToCalendarNow failed', e); }
    } else if (window.calendar) {
      // Fallback: clear and add working hours manually
      window.calendar.getEvents().forEach(event => {
        if (event.extendedProps?.isWorkingHours) {
          event.remove();
        }
      });
      schedule.events.filter(e => e.extendedProps?.isWorkingHours).forEach(event => {
        const formatted = CalendarEngine.formatCalendarEvent(event);
        window.calendar.addEvent(formatted);
      });
    }
  } catch (error) {
    console.error('❌ Greška u createWorkingHoursEvents:', error);
  }
}

// Export CalendarEngine to window so it can be accessed globally
window.CalendarEngine = CalendarEngine;
console.log('✅ CalendarEngine exported to window:', typeof window.CalendarEngine);
console.log('✅ CalendarEngine.initializeCalendar exists:', typeof window.CalendarEngine?.initializeCalendar);
