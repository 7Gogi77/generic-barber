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
          } else {
            events.push(formattedEvent);
          }
        } catch (err) {}
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
              } else {
                events.push(formattedEvent);
              }
            } catch (err) {}
          }

          current.setDate(current.getDate() + 1);
        }
      }
    });

    try {
      const timedCount = events.filter(ev => !ev.allDay).length;
      const allDayCount = events.length - timedCount;
      // Log any suspicious events (timed but start/end strings look like dates only)
      events.forEach(ev => {
        try {
          if (!ev.allDay && ev.start && typeof ev.start === 'string') {
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
          unique[conflictIdx] = e; // prefer incoming
          return; // replaced existing, skip further processing
        } else {
          return; // keep existing, skip incoming
        }
      }

      unique.push(e);
    });

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
      // Fallback to attempt gentle parsing; do not throw – return null when unfixable
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
        return null;
      }
    }

    const durationMs = endDate - startDate;
    const isMultiDay = Number.isFinite(durationMs) && durationMs >= (24 * 60 * 60 * 1000);

    // More robust all-day detection:
    // - If both original strings lacked time parts -> all-day
    // - Or if both start/end times are exactly 00:00 and duration >= 24h
    let isAllDay = false;
    if (!hasStartTime && !hasEndTime) {
      isAllDay = true;
    } else if (startDate.getHours() === 0 && startDate.getMinutes() === 0 && endDate.getHours() === 0 && endDate.getMinutes() === 0 && durationMs >= (24 * 60 * 60 * 1000)) {
      isAllDay = true;
    }


    // Decide display mode for blocking types: render blocking events visibly by default
    // (previously vacation/day_off used 'background' which hid them; show all blocking types as visible)
    const BLOCKING_BACKGROUND_TYPES = new Set([]);
    const isBlockingType = event.rules?.isBlocking || typeConfig?.isBlocking;
    const displayMode = (isBlockingType && BLOCKING_BACKGROUND_TYPES.has(event.type)) ? 'background' : 'auto';

      // Booking events should render the customer name (no icon prefix) to avoid duplicate/emoji-titled items
    const isBooking = event.extendedProps?.isBooking || false;
    const customerName = event.extendedProps?.customer || null;
    const titleText = isBooking ? (customerName || event.title || 'Rezervacija') : (event.title || event.type);

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
      
      // Get all event elements
      const allEvents = Array.from(document.querySelectorAll('.fc-daygrid-event'));
      
      if (allEvents.length === 0) {
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
        } catch (e) {}
      });
      
      
      // Process each day
      eventsByDay.forEach((dayEvents, dayKey) => {
        if (dayEvents.length > maxEvents) {
          
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
      
    } catch (error) {}
  },

  initializeCalendar(containerElement, scheduleData, options = {}) {
    // Check if FullCalendar is available
    if (typeof FullCalendar === 'undefined') {
      containerElement.innerHTML = '<p style="color: #e74c3c; padding: 20px;">Calendar library failed to load. Please check your internet connection and refresh the page.</p>';
      return null;
    }


    // Store for later reference
    this.currentScheduleData = scheduleData;

    try {
      // Clear container
      containerElement.innerHTML = '';

      // == COMPUTE CALENDAR HEIGHT ========
      // Compute available height for the calendar container
      function _computeCalHeight() {
        // On mobile, use viewport height directly — parent may not be painted yet
        if (window.innerWidth <= 768) {
          return Math.max(400, window.innerHeight - 56);
        }
        // Use the content-area's actual inner height (subtract padding)
        var parent = containerElement.parentElement;
        if (parent && parent.clientHeight > 100) {
          var cs = getComputedStyle(parent);
          var pt = parseFloat(cs.paddingTop) || 0;
          var pb = parseFloat(cs.paddingBottom) || 0;
          return parent.clientHeight - pt - pb;
        }
        // Fallback: viewport minus content-area padding
        return Math.max(300, window.innerHeight - 32);
      }

      // == SIZE THE MONTH VIEW ========
      // Sets a pixel height on the container AND tells FC to expand rows.
      // Also strips any lingering inline styles left by the week-view handler.
      function _lockMonthRowHeights(totalHeight) {
        if (!calendar) return;
        var rows = containerElement.querySelectorAll('.fc-daygrid-body tbody tr');
        if (!rows || !rows.length) return;

        // Measure the real rendered body area instead of estimating from toolbar/header.
        var bodyScroller = containerElement.querySelector('.fc-scrollgrid-section-body .fc-scroller');
        var bodyH = bodyScroller ? Math.floor(bodyScroller.clientHeight) : 0;
        if (!bodyH) {
          var daygridBody = containerElement.querySelector('.fc-daygrid-body');
          if (daygridBody) bodyH = Math.floor(daygridBody.getBoundingClientRect().height);
        }
        if (!bodyH) {
          var toolbar = containerElement.querySelector('.fc-toolbar');
          var colHeader = containerElement.querySelector('.fc-col-header');
          var toolbarH = toolbar ? Math.ceil(toolbar.getBoundingClientRect().height) : 0;
          var headerH = colHeader ? Math.ceil(colHeader.getBoundingClientRect().height) : 0;
          bodyH = Math.max(240, totalHeight - toolbarH - headerH - 10);
        }

        var rowCount = rows.length;
        // Keep a small safety budget so borders/subpixel rounding never push the last row outside.
        var safeBody = Math.max(120, bodyH - 8);
        var rowH = Math.max(72, Math.floor(safeBody / rowCount));

        function applyRowHeight(px) {
          var rowHpx = px + 'px';
          containerElement.style.setProperty('--month-row-h', rowHpx);

          rows.forEach(function(tr) {
            tr.style.setProperty('height', rowHpx, 'important');
            tr.style.setProperty('min-height', rowHpx, 'important');
            tr.style.setProperty('max-height', rowHpx, 'important');
          });

          // Do not clip day-events container; clipping breaks multi-day span rendering.
          containerElement.querySelectorAll('.fc-daygrid-day-events').forEach(function(el) {
            el.style.removeProperty('max-height');
            el.style.setProperty('overflow', 'visible', 'important');
          });
        }

        applyRowHeight(rowH);

        // Final safeguard: if last row still clips below the white body, trim row height to fit.
        if (bodyScroller && rows.length) {
          var lastRow = rows[rows.length - 1];
          var over = Math.ceil(lastRow.getBoundingClientRect().bottom - bodyScroller.getBoundingClientRect().bottom);
          if (over > 0) {
            var reduce = Math.max(1, Math.ceil(over / rowCount));
            rowH = Math.max(64, rowH - reduce);
            applyRowHeight(rowH);
          }
        }
      }

      function _sizeMonthView() {
        if (!calendar) return;
        var h = _computeCalHeight();
        containerElement.style.height = h + 'px';

        // Mobile: lightweight resize — do NOT touch FC internal scroller positioning.
        // Forcing position:absolute without a sized parent chain collapses the grid to 0.
        if (window.innerWidth <= 768) {
          calendar.setOption('dayMaxEvents', 1);
          calendar.setOption('dayMaxEventRows', 1);
          calendar.setOption('height', h);
          calendar.setOption('expandRows', true);
          calendar.updateSize();
          setTimeout(function() { _lockMonthRowHeights(h); }, 50);
          setTimeout(function() { _lockMonthRowHeights(h); }, 250);
          setTimeout(function() { _lockMonthRowHeights(h); }, 500);
          return;
        }

        // Strip leftover inline height/overflow from week-view handler
        ['.fc', '.fc-view-harness', '.fc-scroller-harness', '.fc-scrollgrid-section-body td', 'tr.fc-scrollgrid-section-body'].forEach(function(sel) {
          containerElement.querySelectorAll(sel).forEach(function(el) {
            el.style.removeProperty('height');
            el.style.removeProperty('min-height');
            el.style.removeProperty('max-height');
            el.style.removeProperty('overflow');
          });
        });
        // Restore FC's absolute scroller positioning (week-view sets position:relative)
        // Do NOT set overflow — let FC manage it for expandRows to calculate row heights
        containerElement.querySelectorAll('.fc-scroller-liquid-absolute').forEach(function(el) {
          el.style.removeProperty('height');
          el.style.removeProperty('min-height');
          el.style.removeProperty('max-height');
          el.style.removeProperty('overflow');
          el.style.position = 'absolute';
          el.style.top = '0';
          el.style.right = '0';
          el.style.bottom = '0';
          el.style.left = '0';
        });
        containerElement.querySelectorAll('.fc-scroller-harness').forEach(function(el) {
          el.style.removeProperty('overflow');
        });
        // Update month event capacity based on viewport.
        // Mobile stays strict (1), larger screens auto-fit by cell height.
        var w = window.innerWidth;
        var maxEv = w <= 768 ? 1 : true;
        var maxRows = w <= 768 ? 1 : true;
        calendar.setOption('dayMaxEvents', maxEv);
        calendar.setOption('dayMaxEventRows', maxRows);
        calendar.setOption('height', h);
        calendar.setOption('expandRows', true);
        calendar.updateSize();
        // Post-render pass: lock all month rows and kill header scrollbar compensation.
        setTimeout(function() {
          _lockMonthRowHeights(h);
          containerElement.querySelectorAll('.fc-scrollgrid-section-header .fc-scroller').forEach(function(el) {
            el.style.setProperty('overflow', 'hidden', 'important');
          });
        }, 0);
        setTimeout(function() { _lockMonthRowHeights(h); }, 80);
        setTimeout(function() { _lockMonthRowHeights(h); }, 180);
        setTimeout(function() { _lockMonthRowHeights(h); }, 320);
      }
      try {
        const _savedBS = JSON.parse(localStorage.getItem('bookingSettings') || 'null');
        if (_savedBS && window.SITE_CONFIG && window.SITE_CONFIG.booking) {
          const _days = _savedBS.workingHoursByDay ||
                        JSON.parse(localStorage.getItem('workingHoursByDay') || 'null');
          if (_days) {
            const _enabledKeys = [1,2,3,4,5,6,0].filter(k => _days[k] && _days[k].enabled);
            if (_enabledKeys.length > 0) {
              const _startH = Math.min(..._enabledKeys.map(k => parseInt((_days[k].start || '09:00').split(':')[0], 10)));
              const _endH   = Math.max(..._enabledKeys.map(k => parseInt((_days[k].end   || '19:00').split(':')[0], 10)));
              window.SITE_CONFIG.booking.businessHours = { start: _startH, end: _endH };
            }
            window.SITE_CONFIG.booking._workingHoursByDay = _days;
          }
          if (_savedBS.allowMultiDayAppointments !== undefined)
            window.SITE_CONFIG.booking.allowMultiDayAppointments = _savedBS.allowMultiDayAppointments;
          if (_savedBS.maxAppointmentDays !== undefined)
            window.SITE_CONFIG.booking.maxAppointmentDays = _savedBS.maxAppointmentDays;
        }
      } catch(_e) { console.warn('? Could not apply saved booking settings', _e); }

      // Compute slot duration from SITE_CONFIG if present
      const slotMinutes = (window.SITE_CONFIG && window.SITE_CONFIG.booking && window.SITE_CONFIG.booking.slotDuration) ? window.SITE_CONFIG.booking.slotDuration : 30;
      const slotDurationStr = `00:${('0' + slotMinutes).slice(-2)}:00`;

      // Compute commonly used slot min/max strings and allow timeGrid views to show the full day (scrollable)
      const slotMinTimeVal = (window.SITE_CONFIG && window.SITE_CONFIG.booking && window.SITE_CONFIG.booking.businessHours) ? (('0' + window.SITE_CONFIG.booking.businessHours.start).slice(-2) + ':00:00') : '06:00:00';
      const slotMaxTimeVal = (window.SITE_CONFIG && window.SITE_CONFIG.booking && window.SITE_CONFIG.booking.businessHours) ? (('0' + window.SITE_CONFIG.booking.businessHours.end).slice(-2) + ':00:00') : '22:00:00';
      const timeGridSlotMax = '24:00:00';
      const initialScrollTime = options.scrollTime || (window.SITE_CONFIG && window.SITE_CONFIG.booking && window.SITE_CONFIG.booking.scrollTime) || '12:00:00';

      // Compute week-view slot bounds and hidden days from per-day working hours
      const _wkByDay = window.SITE_CONFIG && window.SITE_CONFIG.booking && window.SITE_CONFIG.booking._workingHoursByDay;
      let weekSlotMin = slotMinTimeVal, weekSlotMax = slotMaxTimeVal, weekHiddenDays = [];
      if (_wkByDay) {
        const _enabled = Object.entries(_wkByDay).filter(([, d]) => d.enabled);
        if (_enabled.length) {
          // Use exact HH:MM – rounding to full hours leaves empty slots at top/bottom
          const _parseMinutes = t => { const p = (t || '00:00').split(':'); return parseInt(p[0],10)*60 + parseInt(p[1]||0,10); };
          const _fmt = totalMins => ('0'+Math.floor(totalMins/60)).slice(-2)+':'+('0'+(totalMins%60)).slice(-2)+':00';
          const _minMins = Math.min(..._enabled.map(([,d]) => _parseMinutes(d.start || '09:00')));
          const _maxMins = Math.max(..._enabled.map(([,d]) => _parseMinutes(d.end   || '19:00')));
          weekSlotMin = _fmt(_minMins);
          weekSlotMax = _fmt(Math.min(_maxMins, 24*60));
        }
        weekHiddenDays = Object.entries(_wkByDay).filter(([, d]) => !d.enabled).map(([k]) => parseInt(k, 10));
      }

      const _isMobile = window.innerWidth <= 768;

      // == INITIALIZE FULLCALENDAR ========
      // Set height to a computed pixel value at init time so expandRows works.
      const _initHeight = _computeCalHeight();
      containerElement.style.height = _initHeight + 'px';

      const calendar = new FullCalendar.Calendar(containerElement, {
        initialView: options.initialView || 'dayGridMonth',
        headerToolbar: _isMobile ? {
          left: 'prev,next',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
        } : {
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
        },
        // Slovenian button text (compact single-letter on mobile)
        buttonText: _isMobile ? {
          today:    'Danes',
          month:    'M',
          week:     'T',
          day:      'D',
          list:     'S',
          listWeek: 'S'
        } : {
          today:    'Danes',
          month:    'Mesec',
          week:     'Teden',
          day:      'Dan',
          list:     'Seznam',
          listWeek: 'Seznam'
        },
        locale: 'sl',
        firstDay: 1,
        allDayText: 'Cel dan',
        nowIndicator: true,
        fixedWeekCount: true, // Always 6 rows for equal row heights like LimeBooking
        dayMaxEvents: _isMobile ? 1 : true, // Mobile fixed, laptop/desktop auto-fit per cell
        dayMaxEventRows: _isMobile ? 1 : true,
        moreLinkContent: function() {
          return { html: 'Prikaži vse...' };
        },
        // Show abbreviated month name on first cell of each month (e.g. "1 Mar")
        // Only for dayGrid (month) view — skip in timeGrid to avoid duplicate day numbers
        dayCellContent: function(arg) {
          const vt = arg.view?.type || '';
          if (vt.startsWith('timeGrid')) return undefined;
          const d = arg.date;
          const dayNum = d.getDate();
          if (dayNum === 1) {
            const monthNames = ['Jan','Feb','Mar','Apr','Maj','Jun','Jul','Avg','Sep','Okt','Nov','Dec'];
            return { html: `<span>${dayNum} ${monthNames[d.getMonth()]}</span>` };
          }
          return { html: `<span>${dayNum}</span>` };
        },
        moreLinkClick: function(info) {
          window._moreLinkJustClicked = true;
          setTimeout(() => { window._moreLinkJustClicked = false; }, 100);
          // Reposition popover after it renders so it stays inside the viewport
          setTimeout(() => {
            const popover = document.querySelector('.fc-popover');
            if (!popover) return;
            // Remove the duplicate day number from the popover body
            popover.querySelectorAll('.fc-daygrid-day-top, .fc-more-popover-misc').forEach(function(el) { el.remove(); });
            const rect = popover.getBoundingClientRect();
            const vh = window.innerHeight || document.documentElement.clientHeight;
            if (rect.bottom > vh - 10) {
              const overflow = rect.bottom - (vh - 10);
              const currentTop = parseInt(popover.style.top || '0', 10) || rect.top;
              popover.style.top = Math.max(10, currentTop - overflow - 10) + 'px';
            }
          }, 30);
          return 'popover'; // Show popover when clicking more-link
        },
        // Prioritize multi-day events first, then by start time
        eventOrder: function(a, b) {
          // Calculate if events span multiple days
          const aStart = new Date(a.start);
          const aEnd = new Date(a.end || a.start);
          const bStart = new Date(b.start);
          const bEnd = new Date(b.end || b.start);
          
          const aMultiDay = Math.abs(aEnd - aStart) >= (24 * 60 * 60 * 1000);
          const bMultiDay = Math.abs(bEnd - bStart) >= (24 * 60 * 60 * 1000);
          
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
        // Business hours (visual only – shades non-working cells in timeGrid views)
        businessHours: (() => {
          const _byDay = window.SITE_CONFIG && window.SITE_CONFIG.booking && window.SITE_CONFIG.booking._workingHoursByDay;
          if (_byDay) {
            return Object.entries(_byDay)
              .filter(([, d]) => d.enabled)
              .map(([k, d]) => ({
                daysOfWeek: [parseInt(k, 10)],
                startTime: d.start || '09:00',
                endTime:   d.end   || '19:00'
              }));
          }
          return {
            daysOfWeek: [1,2,3,4,5],
            startTime: (window.SITE_CONFIG && window.SITE_CONFIG.booking && window.SITE_CONFIG.booking.businessHours) ? (('0' + window.SITE_CONFIG.booking.businessHours.start).slice(-2) + ':00') : '09:00',
            endTime:   (window.SITE_CONFIG && window.SITE_CONFIG.booking && window.SITE_CONFIG.booking.businessHours) ? (('0' + window.SITE_CONFIG.booking.businessHours.end).slice(-2)   + ':00') : '17:00'
          };
        })(),
        // TimeGrid options (defaults apply globally, views override to show full day)
        slotMinTime: slotMinTimeVal,
        slotMaxTime: slotMaxTimeVal,
        slotDuration: slotDurationStr,
        slotLabelInterval: { hours: 1 },
        slotLabelFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
        // allDaySlot:true shows multi-day events in a compact row at top of week view (clickable)
        // and they continue to span correctly in month view
        allDaySlot: true,
        views: {
          dayGridMonth: { type: 'dayGridMonth', expandRows: true }, // expandRows fills available height equally
          // On mobile: 1 slot per hour in week view to reduce scrolling; short header (no month)
          timeGridWeek: { type: 'timeGrid', expandRows: false, slotMinTime: weekSlotMin, slotMaxTime: weekSlotMax, slotDuration: _isMobile ? '01:00:00' : '00:15:00', dayHeaderFormat: _isMobile ? { weekday: 'short' } : undefined },
          timeGridDay: { type: 'timeGrid', expandRows: false, slotMinTime: weekSlotMin, slotMaxTime: weekSlotMax, slotDuration: _isMobile ? '01:00:00' : '00:15:00', dayHeaderFormat: _isMobile ? { weekday: 'short', day: 'numeric' } : undefined }
        },
        // Hide non-working days in the week view
        hiddenDays: weekHiddenDays,
        // Initial vertical scroll position in timeGrid views
        scrollTime: initialScrollTime,
        // Use exact pixel height so expandRows distributes rows equally
        height: _initHeight,
        expandRows: true,

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
              } catch (e) {}
            }
            
            // Generate events with deletion filter applied
            const events = await CalendarEngine.generateCalendarEvents(freshScheduleData);
            const _wf = window._calWorkerFilterId;
            const _filtered = (!_wf || _wf === 'all')
                ? events
                : events.filter(e => !e.extendedProps?.worker || e.extendedProps.worker === _wf);
            successCallback(_filtered);
          } catch (err) { failureCallback(err); }
        },

        // Basic sizing hooks so FullCalendar can recompute after view changes



        // Interactions
        selectable: !_isMobile, // disable drag-to-select on mobile; use FAB (+) instead
        selectMirror: true, // Show ghost-event block while dragging in timeGrid (week/day)
        selectOverlap: true,
        editable: true,
        eventDurationEditable: true,
        // Require a long deliberate press before triggering a selection (prevents accidental
        // selections when scrolling on touch devices)
        longPressDelay: 1500,
        eventLongPressDelay: 300,
        selectLongPressDelay: 1500,

        // Event handling - NOTE: These are overridden by poslovni-panel.html
        // Only used in admin-panel.html - check if modal exists before calling
        select: (selectInfo) => {
          // On mobile: completely disable selection – no highlights, no modal, nothing
          if (_isMobile) return false;
          if (window._skipNextFcSelect) {
            window._skipNextFcSelect = false;
            return false;
          }
          // Block selections triggered by a scroll gesture (touch moved before lifting)
          if (window._calTouchScrolled) {
            window._calTouchScrolled = false;
            return false;
          }
          // Prevent FullCalendar's select handler if we're doing custom cell dragging
          if (window._isDraggingCustomCells) {
            return false;
          }
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

          // Branch on whether this is a timed selection (week/day view) or all-day (month view)
          const isTimed = !selectInfo.allDay;
          let startDate = selectInfo.startStr.split('T')[0];
          let endDate = selectInfo.endStr ? selectInfo.endStr.split('T')[0] : startDate;
          let selStartTime = null;
          let selEndTime = null;

          if (isTimed) {
            // Week / day view: preserve the selected time range; end is NOT exclusive in time sense
            const extractTime = (str) => {
              if (!str || !str.includes('T')) return null;
              // str may be "2026-03-04T09:30:00" or "2026-03-04T09:30:00+01:00"
              const timePart = str.split('T')[1];
              if (!timePart) return null;
              const hm = timePart.substring(0, 5); // "09:30"
              return hm;
            };
            selStartTime = extractTime(selectInfo.startStr);
            selEndTime   = extractTime(selectInfo.endStr);
            // endDate is the same date as startDate in most cases; no -1 shift needed
          } else {
            // Month view: all-day selection – FullCalendar end is exclusive, subtract 1 day
            endDate = shiftDateString(endDate, -1);

            // Highlight selected day cells
            document.querySelectorAll('[data-date]').forEach(cell => {
              const cellDate = cell.getAttribute('data-date');
              if (cellDate >= startDate && cellDate <= endDate) {
                cell.style.backgroundColor = 'rgba(0, 122, 255, 0.2)';
              } else {
                cell.style.backgroundColor = '';
              }
            });
          }
          
          const hasAdminModal = document.getElementById('eventModal');
          // If admin modal exists (admin-panel.html), use the admin modal flow
          if (hasAdminModal) {
            CalendarEngine.openEventModal(null, selectInfo, calendar, scheduleData);
            return;
          }

          // Business panel: open the Add Event modal pre-filled with date + time
          const addModal = document.getElementById('addEventModal');
          if (addModal && typeof window.openAddEventModal === 'function') {
            window.openAddEventModal(startDate, endDate, 0, null, selStartTime, selEndTime);
          }
        },
        
        eventClick: (clickInfo) => {
          const hasAdminModal = document.getElementById('eventModal');
          // Only call if the admin modal exists (admin-panel.html context)
          if (hasAdminModal) {
            CalendarEngine.openEventModal(clickInfo.event, null, calendar, scheduleData);
          } else {
          }
        },

        eventContent: (arg) => {
          try {
            const isBooking = arg.event.extendedProps?.isBooking || arg.event.extendedProps?.tab === 'customer' || arg.event.extendedProps?.customer;
            const type = arg.event.extendedProps?.type || arg.event.type || 'unknown';
            
            // Get customer/worker name
            let displayName = '';
            if (isBooking) {
              displayName = (arg.event.extendedProps?.customer || arg.event.title || 'Anonimni Termin').trim();
            } else {
              displayName = arg.event.title || 'Termin';
            }
            
            // Get time
            const startTime = arg.event.start ? new Date(arg.event.start).toLocaleTimeString('sl-SI', {hour: '2-digit', minute: '2-digit'}) : '';
            const endTime = arg.event.end ? new Date(arg.event.end).toLocaleTimeString('sl-SI', {hour: '2-digit', minute: '2-digit'}) : '';
            const timeText = startTime && endTime ? `${startTime} - ${endTime}` : startTime;
            
            // Select Bootstrap icon based on event type
            let iconClass = 'bi-calendar-event';
            if (isBooking) {
              iconClass = 'bi-person-check';
            } else if (type === 'vacation') {
              iconClass = 'bi-palmtree';
            } else if (type === 'break' || type === 'lunch') {
              iconClass = 'bi-cup-hot';
            } else if (type === 'sick_leave') {
              iconClass = 'bi-bandaid';
            } else if (type === 'day_off') {
              iconClass = 'bi-calendar-x';
            } else if (type === 'working_hours') {
              iconClass = 'bi-briefcase';
            }
            
            // Determine view type
            const view = arg.view?.type || '';
            const isMobileView = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 768px)').matches;
            
            // List view (mobile agenda): icon + name + time in a compact row
            if (view.startsWith('list')) {
              return {
                html: `<div style="display:flex;align-items:center;gap:8px;width:100%;padding:1px 0;overflow:hidden;">
                  <i class="bi ${iconClass}" style="font-size:14px;flex-shrink:0;"></i>
                  <span style="font-weight:500;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${displayName}</span>
                  ${timeText ? `<span style="font-size:12px;opacity:0.65;white-space:nowrap;flex-shrink:0;">${timeText}</span>` : ''}
                </div>`
              };
            }

            // On mobile timeGrid (week/day): top-left name / surname / time-range
            if (isMobileView && (view === 'timeGridWeek' || view === 'timeGridDay')) {
              const nameParts = displayName.split(' ');
              const firstName = nameParts[0] || '';
              const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
              return {
                html: `<div style="display:flex;flex-direction:column;align-items:flex-start;justify-content:flex-start;width:100%;height:100%;padding:2px 3px;gap:0;overflow:hidden;line-height:1.2;">
                  <span style="font-size:9px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;">${firstName}</span>
                  ${lastName ? `<span style="font-size:8px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;opacity:0.85;">${lastName}</span>` : ''}
                  ${timeText ? `<span style="font-size:7px;font-weight:500;opacity:0.65;white-space:nowrap;">${timeText}</span>` : ''}
                </div>`
              };
            }

            // On mobile month view: show first name + icon
            if (isMobileView) {
              const mFirstName = displayName.split(' ')[0] || '';
              return { html: `<div style="display:flex;align-items:center;gap:2px;width:100%;padding:0 2px;overflow:hidden;line-height:1.2;"><i class="bi ${iconClass}" style="font-size:9px;flex-shrink:0;"></i><span style="font-size:9px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${mFirstName}</span></div>` };
            }

            // Desktop timeGrid (week/day): top-left aligned name / surname / time range
            if (view === 'timeGridWeek' || view === 'timeGridDay') {
              const nameParts = displayName.split(' ');
              const firstName = nameParts[0] || '';
              const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
              return {
                html: `<div style="display:flex;flex-direction:column;align-items:flex-start;justify-content:flex-start;width:100%;height:100%;padding:3px 5px;gap:1px;overflow:hidden;line-height:1.25;">
                  <span style="font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;">${firstName}</span>
                  ${lastName ? `<span style="font-size:11px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;opacity:0.85;">${lastName}</span>` : ''}
                  ${timeText ? `<span style="font-size:10px;font-weight:500;opacity:0.6;white-space:nowrap;">${timeText}</span>` : ''}
                </div>`
              };
            }

            // Month view: detect laptop vs large desktop
            const isMonthView = view === 'dayGridMonth';
            const isLaptop = window.innerWidth <= 1366;

            if (isMonthView && isLaptop) {
              // LAPTOP: single line — icon + name left, time right (LimeBooking style)
              return {
                html: `<div style="display:flex;align-items:center;gap:3px;font-size:11px;line-height:1.3;white-space:nowrap;overflow:hidden;">
                  <i class="bi ${iconClass}" style="font-size:10px;flex-shrink:0;"></i>
                  <span style="font-weight:500;overflow:hidden;text-overflow:ellipsis;flex:1;">${displayName}</span>
                  ${timeText ? `<span style="opacity:0.65;font-size:10px;flex-shrink:0;margin-left:auto;">${timeText}</span>` : ''}
                </div>`
              };
            }

            if (isMonthView) {
              // DESKTOP: single line — icon + name left, time right (LimeBooking style)
              return {
                html: `<div style="display:flex;align-items:center;gap:4px;font-size:12px;line-height:1.4;white-space:nowrap;overflow:hidden;">
                  <i class="bi ${iconClass}" style="font-size:11px;flex-shrink:0;"></i>
                  <span style="font-weight:500;overflow:hidden;text-overflow:ellipsis;flex:1;">${displayName}</span>
                  ${timeText ? `<span style="opacity:0.55;font-size:11px;flex-shrink:0;margin-left:auto;">${timeText}</span>` : ''}
                </div>`
              };
            }

            // Fallback: list/other views
            return {
              html: `<div style="display:flex;align-items:center;gap:4px;padding:2px 4px;font-size:12px;overflow:hidden;">
                <i class="bi ${iconClass}" style="font-size:11px;flex-shrink:0;"></i>
                <span style="font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;">${displayName}</span>
                ${timeText ? `<span style="font-size:10px;opacity:0.6;white-space:nowrap;flex-shrink:0;">${timeText}</span>` : ''}
              </div>`
            };
          } catch (e) {
            return undefined;
          }
        },
        
        eventDidMount: (info) => {
          // Size update on event mount removed — _sizeMonthView handles sizing
          try {
            const isBooking = info.event.extendedProps?.isBooking || info.event.extendedProps?.tab === 'customer' || info.event.extendedProps?.customer;
            const type = info.event.extendedProps?.type || info.event.type || 'unknown';
            
            if (!info.el) return;
            
            // LimeBooking-style color schemes: light fill + left border accent
            const colorSchemes = {
              booking: { bg: '#e8f4fd', border: '#3498db', text: '#333' },           // Blue - Customer booking
              working_hours: { bg: '#e8f8ef', border: '#27ae60', text: '#333' },     // Green - Working hours
              vacation: { bg: '#fef9e7', border: '#f1c40f', text: '#333' },          // Yellow - Vacation
              break: { bg: '#f4ecf7', border: '#8e44ad', text: '#333' },             // Purple - Break
              lunch: { bg: '#fef0e4', border: '#e67e22', text: '#333' },             // Orange - Lunch
              sick_leave: { bg: '#fdeded', border: '#e74c3c', text: '#333' },        // Red - Sick leave
              day_off: { bg: '#f0f0f0', border: '#95a5a6', text: '#555' }           // Gray - Day off
            };
            
            // Select color scheme
            let scheme = colorSchemes.working_hours; // Default
            if (isBooking) {
              scheme = colorSchemes.booking;
            } else if (colorSchemes[type]) {
              scheme = colorSchemes[type];
            }
            
            // Flat LimeBooking style: left border accent only
            info.el.style.backgroundColor = scheme.bg;
            info.el.style.border = 'none';
            info.el.style.borderLeft = '3px solid ' + scheme.border;
            info.el.style.borderRadius = '3px';
            info.el.style.color = scheme.text;
            info.el.style.overflow = 'hidden';
            info.el.style.fontWeight = '400';
            info.el.style.boxShadow = 'none';
            info.el.style.transition = 'background 0.15s ease';

            // List view (mobile agenda): slightly larger padding, full-width pill
            if (info.view && info.view.type && info.view.type.startsWith('list')) {
              info.el.style.setProperty('border-radius', '6px', 'important');
              info.el.style.setProperty('padding', '4px 8px', 'important');
              info.el.style.setProperty('margin', '0', 'important');
              info.el.style.setProperty('font-size', '13px', 'important');
              info.el.style.setProperty('border-left-width', '4px', 'important');
            }

            // Month view: normalize sizing
            if (info.view && info.view.type === 'dayGridMonth') {
              info.el.style.padding = '3px 6px';
              info.el.style.margin = '1px 3px';
              info.el.style.lineHeight = '1.4';
              info.el.style.fontSize = '12px';
              info.el.style.display = 'block';
              // Hide FC's default dot element if present
              var dot = info.el.querySelector('.fc-daygrid-event-dot');
              if (dot) dot.style.display = 'none';
              // Normalize the harness (parent) sizing
              var harness = info.el.closest('.fc-daygrid-event-harness');
              if (harness && !harness.classList.contains('fc-daygrid-event-harness-abs')) {
                harness.style.marginBottom = '1px';
              }
            }
            
          } catch (err) {}
        },

        // Hook fired after the events array is applied to the view
        eventsSet: (events) => {
          try {
            const timed = events.filter(e => !e.allDay).length;
            const allDay = events.length - timed;
            // If there are timed events but no timeGrid DOM presence, escalate
            const timegrid = document.querySelector('.fc-timegrid');
            const timegridEventEls = document.querySelectorAll('.fc-timegrid .fc-event');
            if (timed > 0 && timegrid && timegridEventEls.length === 0) {
              // Remediation disabled: do not attempt automatic remakes or repairs from eventsSet
              // This avoids any automatic DOM manipulation or forced re-initialization.
            }
          } catch (err) {}
        },

        eventDrop: async (dropInfo) => {
          
          try {
            // CRITICAL: Reload fresh data from storage to avoid using stale copies
            let currentData = scheduleData;
            if (typeof StorageManager !== 'undefined' && StorageManager.load) {
              try {
                currentData = await StorageManager.load('schedule');
              } catch (e) {}
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
              
              
              // Remove ALL duplicates with same ID, worker, date, and time combination
              const cleanedEvents = currentData.events.filter((evt, idx) => {
                // Keep if it's the current index (the one we just updated)
                if (idx === eventIndex) return true;
                // Remove if same ID
                if (evt.id === dropInfo.event.id) {
                  return false;
                }
                // Remove if same worker + client + time (different ID but same slot)
                if (evt.workerName === workerName && 
                    evt.clientName === clientName && 
                    evt.start === originalStart && 
                    evt.end === originalEnd) {
                  return false;
                }
                return true;
              });
              
              currentData.events = cleanedEvents;
              
              // Update the global scheduleData
              scheduleData = currentData;
              
              // Save to storage
              await StorageManager.save('schedule', currentData);
              
              // Force calendar to refetch from storage
              setTimeout(() => {
                if (calendar && typeof calendar.refetchEvents === 'function') {
                  calendar.refetchEvents();
                }
              }, 300);
            } else {
              dropInfo.revert();
            }
          } catch (error) {
            dropInfo.revert();
          }
        },

        eventResize: async (resizeInfo) => {
          
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
              
              
              // Save to storage
              await StorageManager.save('schedule', scheduleData);
              
              // Force calendar to refetch events after a brief delay
              setTimeout(() => {
                if (calendar && typeof calendar.refetchEvents === 'function') {
                  calendar.refetchEvents();
                }
              }, 300);
            } else {
              resizeInfo.revert();
            }
          } catch (error) {
            resizeInfo.revert();
          }
        },

        datesSet: (arg) => {

          // On mobile: clear any inline backgroundColor that may have been set by a previous
          // select/scroll event – this prevents stale blue cell highlights from persisting
          if (_isMobile) {
            containerElement.querySelectorAll('[data-date]').forEach(cell => {
              cell.style.backgroundColor = '';
            });
          }

          // Helper: strip lingering month-view inline styles so FC can manage timeGrid natively.
          // Only removes what _lockMonthRowHeights / _sizeMonthView explicitly set.
          // Does NOT touch position/top/bottom/left/right — FC needs those natively.
          function _cleanMonthStyles() {
            // Remove forced row heights set by _lockMonthRowHeights
            containerElement.querySelectorAll('.fc-daygrid-body tbody tr').forEach(tr => {
              tr.style.removeProperty('height');
              tr.style.removeProperty('min-height');
              tr.style.removeProperty('max-height');
            });
            // Remove forced overflow on day-events containers
            containerElement.querySelectorAll('.fc-daygrid-day-events').forEach(el => {
              el.style.removeProperty('overflow');
            });
            // Remove forced overflow hidden on header scrollers (set by _sizeMonthView)
            containerElement.querySelectorAll('.fc-scrollgrid-section-header .fc-scroller').forEach(el => {
              el.style.removeProperty('overflow');
            });
          }

          // Update view-specific classes so styles can be scoped (dayGrid vs timeGrid)
          try {
            const v = arg && arg.view && arg.view.type ? arg.view.type : '';
            if (containerElement) {
              containerElement.classList.toggle('view-timegrid-week', v === 'timeGridWeek');
              containerElement.classList.toggle('view-timegrid-day', v === 'timeGridDay');
              containerElement.classList.toggle('view-daygrid', v === 'dayGridMonth');
            }
          } catch (e) { /* ignore */ }

          // Month view shows all 7 days; week/day views hide non-working days
          try {
            const _vhd = arg && arg.view && arg.view.type ? arg.view.type : '';
            if (calendar && typeof calendar.setOption === 'function') {
              const _targetHidden = _vhd === 'dayGridMonth' ? [] : weekHiddenDays;
              const _curHidden = (calendar.getOption && calendar.getOption('hiddenDays')) || [];
              const _changed = _targetHidden.length !== _curHidden.length ||
                _targetHidden.some((d, i) => d !== _curHidden[i]);
              if (_changed) calendar.setOption('hiddenDays', _targetHidden);
            }
          } catch(_) {}

          // Dynamic height: viewport-based for all views
          const _argViewType = arg && arg.view && arg.view.type ? arg.view.type : '';
          try {
            var _h = _computeCalHeight();
            containerElement.style.height = _h + 'px';
            if (_argViewType === 'dayGridMonth') {
              _sizeMonthView();
            } else {
              // For timeGrid views: clean month styles and let FC handle layout
              _cleanMonthStyles();
              if (calendar && typeof calendar.setOption === 'function') {
                calendar.setOption('expandRows', false);
                calendar.setOption('height', _h);
              }
              if (calendar && typeof calendar.updateSize === 'function') {
                calendar.updateSize();
              }
            }
          } catch (e) { /* ignore */ }

          // After view renders, apply viewport-based height to month view
          setTimeout(() => {
            if (_argViewType === 'dayGridMonth') {
              _sizeMonthView();
            }
            if (calendar && calendar.updateSize) {
              calendar.updateSize();
            }
          }, 150);
        },

        // Strip view-scoped classes and expandRows BEFORE the next view renders.
        // Without this, month CSS (.view-daygrid height: var(--month-row-h) !important)
        // bleeds into the timeGrid's all-day row during the brief window between
        // new DOM creation and datesSet firing.
        viewWillUnmount: () => {
          if (containerElement) {
            containerElement.classList.remove('view-daygrid', 'view-timegrid-week', 'view-timegrid-day');
          }
          if (calendar && typeof calendar.setOption === 'function') {
            calendar.setOption('expandRows', false);
          }
        },

        viewDidMount: (arg) => {
          setTimeout(() => {
            if (calendar.updateSize) {
              calendar.updateSize();
            }
            
            // MONTH VIEW: Fix cell heights to prevent expansion - runs after view fully mounted
            const isMonthView = arg && arg.view && arg.view.type === 'dayGridMonth';
            if (isMonthView) {
              setTimeout(_sizeMonthView, 50);
            }
          }, 350);
        },

        // Styling
        nowIndicator: true,
        eventDisplay: 'block',
        // Make overlapping events display side-by-side in timeGrid views
        slotEventOverlap: false,
        // all-day slot on - multi-day events span in the compact all-day row, clickable
        allDaySlot: true
      });


      // SMART CELL SELECTION SYSTEM
      // Shows real-time highlighting when dragging to select empty cells
      // Detects if clicking on an event vs empty cell to avoid interfering with appointment dragging
      let isDraggingCells = false;
      let cellSelectionStartDate = null;
      let cellSelectionEndDate = null; // Track the current end date during drag
      let dragElement = null; // Track which element started the drag
      let highlightRefreshRAF = null; // Track requestAnimationFrame for continuous reapplication
      
      const applyHighlights = (startDate, endDate) => {
        if (!startDate || !endDate) return;
        
        const actualStart = startDate < endDate ? startDate : endDate;
        const actualEnd = startDate < endDate ? endDate : startDate;
        
        const allCells = document.querySelectorAll('[data-date]');
        allCells.forEach(cell => {
          const cellDate = cell.getAttribute('data-date');
          if (cellDate >= actualStart && cellDate <= actualEnd) {
            // Apply inline styles to ensure they stick through DOM re-renders
            cell.style.backgroundColor = 'rgba(10, 132, 255, 0.24)';
            cell.style.boxShadow = 'inset 0 0 0 1px rgba(255, 255, 255, 0.65), 0 8px 18px rgba(10, 132, 255, 0.24)';
            cell.style.borderRadius = '10px';
            cell.style.position = 'relative';
            cell.style.zIndex = '10';
            cell.classList.add('calendar-cell-selected');
          } else {
            // Clear only if not in range
            cell.style.backgroundColor = '';
            cell.style.outline = '';
            cell.style.outlineOffset = '';
            cell.style.boxShadow = '';
            cell.style.borderRadius = '';
            cell.style.position = '';
            cell.style.zIndex = '';
            cell.classList.remove('calendar-cell-selected');
          }
        });
      };
      
      const clearHighlights = () => {
        document.querySelectorAll('[data-date]').forEach(cell => {
          // Clear both class and inline styles
          cell.classList.remove('calendar-cell-selected');
          cell.style.backgroundColor = '';
          cell.style.outline = '';
          cell.style.outlineOffset = '';
          cell.style.boxShadow = '';
          cell.style.borderRadius = '';
          cell.style.position = '';
          cell.style.zIndex = '';
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
        // Disable entire drag-select on mobile – FAB (+) is the only add trigger
        if (_isMobile) return;

        isDraggingCells = false;
        window._isDraggingCustomCells = false;
        
        // Only handle events in the calendar
        if (!e.target.closest('#scheduleCalendar')) {
          return;
        }

        // In timeGrid (week / day) views the user drags hour/minute slots – let FullCalendar
        // handle the native timed selection entirely; our custom day-cell drag must not intercept.
        if (e.target.closest('.fc-timegrid-body') || e.target.closest('.fc-timegrid-slot') ||
            e.target.closest('.fc-timegrid-col') || e.target.closest('.fc-timegrid-col-events')) {
          return;
        }
        
        // Check if clicking on an event - if so, let FullCalendar/drag system handle it
        if (e.target.closest('.fc-event') || e.target.closest('.fc-daygrid-event')) {
          return;
        }
        
        // Check if clicking on a popover (more events popup) - if so, let FullCalendar handle it
        if (e.target.closest('.fc-popover') || e.target.closest('.fc-more-popover')) {
          return;
        }
        
        // Check if clicking on a more-link ("+x more") - if so, let FullCalendar handle it
        if (e.target.closest('.fc-daygrid-more-link') || e.target.closest('.fc-more-link')) {
          return;
        }
        
        // Check if clicking on a day cell or day header (empty area)
        const dayCell = findDayCell(e.target);
        if (dayCell) {
          isDraggingCells = true;
          window._isDraggingCustomCells = true;
          cellSelectionStartDate = dayCell.getAttribute('data-date');
          cellSelectionEndDate = cellSelectionStartDate;
          dragElement = dayCell;
          clearHighlights();
          
          // Set initial highlight on the start cell using inline styles + class
          dayCell.style.backgroundColor = 'rgba(10, 132, 255, 0.24)';
          dayCell.style.boxShadow = 'inset 0 0 0 1px rgba(255, 255, 255, 0.65), 0 8px 18px rgba(10, 132, 255, 0.24)';
          dayCell.style.borderRadius = '10px';
          dayCell.style.position = 'relative';
          dayCell.style.zIndex = '10';
          dayCell.classList.add('calendar-cell-selected');
          
          // Capture pointer on the element to ensure we get all move events
          if (dayCell.setPointerCapture && e.pointerId) {
            dayCell.setPointerCapture(e.pointerId);
          }
        } else {
        }
      });
      
      // Real-time highlighting as user drags across cells
      // Uses mousemove for responsive feedback
      document.addEventListener('mousemove', (e) => {
        if (!isDraggingCells || !cellSelectionStartDate) return;
        
        // Stop event propagation to prevent FullCalendar from processing it
        e.stopPropagation();
        
        const currentCell = getCellAtCursorPosition(e.clientX, e.clientY);
        if (!currentCell) {
          return;
        }
        
        const currentDate = currentCell.getAttribute('data-date');
        if (!currentDate) {
          return;
        }
        
        // Store the current end date for continuous reapplication
        cellSelectionEndDate = currentDate;
        
        // Apply highlights immediately
        applyHighlights(cellSelectionStartDate, cellSelectionEndDate);
        
        // Cancel any existing animation frame
        if (highlightRefreshRAF) cancelAnimationFrame(highlightRefreshRAF);
        
        // Use requestAnimationFrame for smooth 60fps reapplication
        const continuousHighlight = () => {
          if (isDraggingCells && cellSelectionStartDate && cellSelectionEndDate) {
            applyHighlights(cellSelectionStartDate, cellSelectionEndDate);
            highlightRefreshRAF = requestAnimationFrame(continuousHighlight);
          }
        };
        highlightRefreshRAF = requestAnimationFrame(continuousHighlight);
      }, true); // Use capture phase to intercept before FullCalendar
      
      // End drag selection
      document.addEventListener('pointerup', (e) => {
        // Disable entire drag-select on mobile
        if (_isMobile) return;

        const hadCustomSelection = !!(cellSelectionStartDate && cellSelectionEndDate);
        const selectionStart = cellSelectionStartDate;
        const selectionEnd = cellSelectionEndDate || cellSelectionStartDate;

        // Cancel the continuous highlight animation
        if (highlightRefreshRAF) {
          cancelAnimationFrame(highlightRefreshRAF);
          highlightRefreshRAF = null;
        }
        
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
        cellSelectionEndDate = null;
        dragElement = null;

        if (hadCustomSelection && selectionStart && selectionEnd) {
          const startStr = selectionStart < selectionEnd ? selectionStart : selectionEnd;
          const endStr = selectionStart < selectionEnd ? selectionEnd : selectionStart;


          const selectInfoLike = {
            startStr,
            endStr,
            allDay: true,
            __inclusiveEnd: true
          };

          const hasAdminModal = document.getElementById('eventModal');
          const addModal = document.getElementById('addEventModal');

          // Set skip-flags synchronously so FC's select/dateClick (which fire
          // before our pointerup in the same tick) are blocked.
          window._skipNextFcSelect = true;
          window._skipNextDateClick = true;

          // Defer the actual modal open so it runs AFTER all of FC's synchronous
          // callbacks (select, dateClick) have fired, ensuring our correct
          // start+end dates are the final values written to the form.
          setTimeout(() => {
            if (hasAdminModal) {
              CalendarEngine.openEventModal(null, selectInfoLike, calendar, scheduleData);
            } else if (addModal && typeof window.openAddEventModal === 'function') {
              const startDateOnly = String(startStr).split('T')[0];
              const endDateOnly = String(endStr).split('T')[0];
              window.openAddEventModal(startDateOnly, endDateOnly);
            }
          }, 0);
        }
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
      
      try {
        const renderResult = calendar.render();
        // Expose calendar globally for debug helpers
        try { window.calendar = calendar; } catch (err) { /* ignore */ }

        // Watch the toolbar for height changes (buttons wrap on first render, then unwrap).
        // Re-equalize rows the moment the toolbar settles to its final height.
        try {
          if (typeof ResizeObserver !== 'undefined') {
            const _toolbar = containerElement.querySelector('.fc-header-toolbar');
            if (_toolbar) {
              let _lastToolbarH = 0;
              const _toolbarRO = new ResizeObserver(() => {
                const h = _toolbar.offsetHeight;
                if (h !== _lastToolbarH && h > 0) {
                  _lastToolbarH = h;
                  if (calendar && calendar.view && calendar.view.type === 'dayGridMonth') {
                    _sizeMonthView();
                  }
                }
              });
              _toolbarRO.observe(_toolbar);
            }
          }
        } catch(_) {}

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
              return res;
            } catch (e) {  return null; }
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
        // Defer sizing – run a few attempts with increasing delays to allow FullCalendar DOM to settle
        (function robustSizing() {
          const delays = [50, 150, 350, 700];
          const maxAttempts = delays.length;

          function applySizing(avail) {
            try {
              // Only apply pixel sizing for timegrid views; month view must stay height:auto
              const currentViewType = (calendar && calendar.view && calendar.view.type) ? calendar.view.type : '';
              const isTimegrid = currentViewType === 'timeGridDay';

              const toolbar = containerElement.querySelector('.fc-toolbar');
              const headerRow = containerElement.querySelector('.fc-col-header');
              const fcRoot = containerElement.querySelector('.fc');
              const viewHarness = containerElement.querySelector('.fc-view-harness');
              const timegrid = containerElement.querySelector('.fc-timegrid');
              const scrollBodies = containerElement.querySelectorAll('.fc-scrollgrid-section-body');

              if (!isTimegrid) {
                if (currentViewType === 'dayGridMonth') {
                  // Month view: delegate to viewport-based height with row equalization
                  _sizeMonthView();
                  return;
                }
                // Week / list views: clear any stale pixel heights and let FC size naturally
                if (fcRoot) { fcRoot.style.height = ''; fcRoot.style.minHeight = ''; fcRoot.style.overflow = ''; }
                if (viewHarness) { viewHarness.style.height = ''; viewHarness.style.minHeight = ''; }
                return;
              }

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
            } catch (err) {}
          }

          function attempt(n) {
            try {
              // Week view is handled entirely by MutationObserver – no sizing attempts needed
              const curView = calendar && calendar.view && calendar.view.type ? calendar.view.type : '';
              if (curView === 'timeGridWeek') return;

              const toolbar = containerElement.querySelector('.fc-toolbar');
              const headerRow = containerElement.querySelector('.fc-col-header');
              const toolbarH = toolbar ? Math.ceil(toolbar.getBoundingClientRect().height) : 0;
              const headerH = headerRow ? Math.ceil(headerRow.getBoundingClientRect().height) : 0;
              const avail = Math.max(520, containerElement.clientHeight - toolbarH - headerH - 8);

              applySizing(avail);

              // Check for collapsed sections
              const collapsed = Array.from(containerElement.querySelectorAll('.fc-scrollgrid-section-body')).filter(b => b.getBoundingClientRect().height < 6);
              const timegrid = containerElement.querySelector('.fc-timegrid');
              const timegridCollapsed = timegrid && timegrid.getBoundingClientRect().height < 6;


              if (collapsed.length === 0 && !timegridCollapsed) {
                return;
              }

              if (n + 1 < maxAttempts) {
                const delay = delays[n + 1];
                setTimeout(() => attempt(n + 1), delay);
              } else {
                // Sizing attempts exhausted. No automatic DOM fallbacks will be applied here to avoid unexpected layout changes.
                // The caller/view may opt to handle layout issues explicitly. (No-op)
              }
            } catch (err) {}
          }

          // Run first attempt after a short delay
          setTimeout(() => attempt(0), delays[0]);
        })();

        // Week view sizing is handled entirely by CSS !important rules in calendar.css.
        // No MutationObserver needed - CSS !important beats FC's regular inline styles.

        // Safely process day cells (may not exist immediately after render).
        (function handleDayCells() {
          function processDayCell(dayCell) {
            const eventsContainer = dayCell.querySelector('.fc-daygrid-day-events');
            if (eventsContainer) {
              const allEventEls = Array.from(eventsContainer.querySelectorAll('.fc-daygrid-event'));
              if (allEventEls.length > 3) {
                const dateEl = dayCell.querySelector('.fc-daygrid-day-number');
                const dayNum = dateEl ? dateEl.textContent : '?';

                let timedCount = 0;
                allEventEls.forEach((el) => {
                  const text = el.textContent;
                  const hasTime = /\d{2}:\d{2}/.test(text);

                  if (hasTime) {
                    timedCount++;
                    if (timedCount > 3) {
                      el.style.display = 'none';
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
                  }
                } catch (err) {}
              }, 250);
              return;
            }

            Array.from(dayCells).forEach(processDayCell);
          } catch (err) {}
        })();

      } catch (renderError) {
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

      function relayoutIfVisible() {
        if (!calendar || !containerElement) return;
        var isVisible = containerElement.offsetParent !== null && getComputedStyle(containerElement).display !== 'none';
        if (!isVisible) return;

        var currentViewType = (calendar && calendar.view && calendar.view.type) ? calendar.view.type : '';
        if (currentViewType === 'dayGridMonth') {
          _sizeMonthView();
        } else {
          var h = _computeCalHeight();
          containerElement.style.height = h + 'px';
          calendar.setOption('height', h);
          calendar.updateSize();
        }
      }
      
      // Add window resize handler for responsive resizing
      let resizeTimeout;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(relayoutIfVisible, 200);
      });

      // When the page/tab becomes visible again, recalc layout in case FC was hidden before.
      document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
          setTimeout(relayoutIfVisible, 80);
          setTimeout(relayoutIfVisible, 260);
        }
      });

      // If container style/class changes (display none/block), relayout once visible.
      try {
        if (typeof MutationObserver !== 'undefined') {
          var _visObserver = new MutationObserver(function() {
            setTimeout(relayoutIfVisible, 40);
          });
          _visObserver.observe(containerElement, { attributes: true, attributeFilter: ['style', 'class'] });
        }
      } catch (_) {}

      return calendar;
    } catch (error) {
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
      
      // Auto-fill start and end times from selected date range
      if (selectInfo?.startStr) {
        try {
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

          const selectedStartDate = String(selectInfo.startStr).split('T')[0];
          let selectedEndDate = selectInfo.endStr ? String(selectInfo.endStr).split('T')[0] : selectedStartDate;

          const endIsInclusive = !!selectInfo.__inclusiveEnd;
          if (selectInfo.endStr && !endIsInclusive) {
            selectedEndDate = shiftDateString(selectedEndDate, -1);
          }

          const startDate = new Date(`${selectedStartDate}T09:00:00`);
          const endDate = new Date(`${selectedEndDate}T17:00:00`);
          
          // Convert to datetime-local format (local time) using helper
          const startStr = fmtLocal(startDate);
          const endStr = fmtLocal(endDate);


          startInput.value = startStr;
          endInput.value = endStr;
        } catch (err) {
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


      if (!start || !end) {
        alert('Vnesite datum in Čas početka in konca');
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
          } catch (updateErr) {}

          // Persist update to storage/DB
          try {
            if (typeof window.saveScheduleData === 'function') {
              await window.saveScheduleData();
            } else {
              try { localStorage.setItem('schedule', JSON.stringify(scheduleData)); } catch (e) {}
            }
          } catch (saveErr) {}
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
          scheduleData.events.push(newEvent);
          
          // Format event for FullCalendar before adding
          const formattedEvent = CalendarEngine.formatCalendarEvent(newEvent);

          // Persist creation to storage/DB first so we treat scheduleData as canonical
          try {
            if (typeof window.saveScheduleData === 'function') {
              await window.saveScheduleData();
            } else {
              try { localStorage.setItem('schedule', JSON.stringify(scheduleData)); } catch (e) {}
            }
          } catch (saveErr) {}

          // Refresh calendar from canonical schedule to avoid duplicates
          if (typeof loadAppointmentsToCalendarNow === 'function') {
            try { await loadAppointmentsToCalendarNow(); } catch (e) {}
          } else if (calendar) {
            // Fallback: add the single formatted event
            try { calendar.addEvent(formattedEvent); } catch (e) {}
          }
        } catch (err) {}
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
        modal.style.display = 'none';
        return;
      }

      alert(`???  DELETING (calendar-engine): ${eventId}`);

      // STEP 1: Mark as deleted FIRST
      if (typeof window.markEventDeleted === 'function') {
        window.markEventDeleted(eventId);
        if (typeof window.isEventDeleted === 'function') {
        }
      } else {
      }

      // STEP 2: Remove from memory
      scheduleData.events = scheduleData.events.filter(ev => ev.id !== eventId);

      // STEP 3: Save to localStorage
      try {
        const saved = JSON.stringify(scheduleData);
        localStorage.setItem('schedule', saved);
      } catch (e) {}

      // STEP 4: Remove from DOM
      try {
        if (event && typeof event.remove === 'function') {
          event.remove();
        }
      } catch (err) {}

      // STEP 5: Remove all calendar instances
      if (calendar) {
        try {
          calendar.getEvents().forEach(ev => {
            if (ev.id === eventId) ev.remove();
          });
        } catch (err) {}
      }

      modal.style.display = 'none';

      // STEP 6: Reload deletion tracker
      if (typeof window.loadDeletedEventIds === 'function') {
        window.loadDeletedEventIds();
      }

      // STEP 7: Refetch calendar
      if (calendar && typeof calendar.refetchEvents === 'function') {
        try {
          await Promise.resolve(calendar.refetchEvents());
        } catch (err) {}
      }

      // STEP 8: Sync to Firebase in background
      if (typeof StorageManager !== 'undefined' && StorageManager.save) {
        StorageManager.save('schedule', scheduleData).then(result => {
        }).catch(err => {
        });
      }

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

    const typeIcons = {
      'working_hours': 'bi-briefcase',
      'break': 'bi-cup-hot',
      'lunch': 'bi-cup-hot',
      'vacation': 'bi-palmtree',
      'sick_leave': 'bi-bandaid',
      'day_off': 'bi-calendar-x'
    };

    const typeColors = {
      'working_hours': '#27ae60',
      'break': '#8e44ad',
      'lunch': '#d35400',
      'vacation': '#f39c12',
      'sick_leave': '#e74c3c',
      'day_off': '#95a5a6'
    };

    const eventsHTML = scheduleData.events.map(event => {
      const startDate = new Date(event.start);
      const endDate = new Date(event.end);
      const icon = typeIcons[event.type] || 'bi-calendar';
      const color = typeColors[event.type] || '#95a5a6';
      const startStr = startDate.toLocaleDateString('sl-SI', { weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit' });
      const startTime = startDate.toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit' });
      const endTime = endDate.toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit' });

      return `
        <div style="display: flex; gap: 12px; padding: 12px; background: white; border-radius: 6px; border-left: 4px solid ${color}; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <div style="font-size: 20px; min-width: 30px; text-align: center; color: ${color};"><i class="bi ${icon}"></i></div>
          <div style="flex: 1; min-width: 0;">
            <div style="font-weight: 600; color: #2c3e50; word-break: break-word;">${event.title}</div>
            <div style="font-size: 12px; color: #7f8c8d; margin-top: 4px;">
              <i class="bi bi-calendar3" style="margin-right: 4px;"></i>${startStr} | <i class="bi bi-clock" style="margin-right: 4px;"></i>${startTime} - ${endTime}
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
    alert('?? Molim postavi vrijeme početka i kraja rada!');
    return;
  }
  
  if (startTime >= endTime) {
    alert('?? Vrijeme početka mora biti prije vremena kraja rada!');
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
  });
  
}

// Helper za debug output
function debugLog(msg) {
  const timestamp = new Date().toLocaleTimeString();
  const fullMsg = `[${timestamp}] ${msg}`;
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
  debugLog('?? Loading bookings from StorageManager schedule');
  try {
    if (window.calendar) {
      // Simply refetch events - the events callback will load fresh data
      window.calendar.refetchEvents();
      debugLog(`? Calendar events refetched`);
    }
  } catch (error) {
    debugLog(`? loadAppointmentsToCalendarNow error: ${error.message}`);
  }
}

// Create daily working hours events
async function createWorkingHoursEvents(startTime, endTime) {
  try {
    const schedule = await StorageManager.load('schedule');
    
    // Remove existing "Delo" events
    schedule.events = schedule.events.filter(e => e.type !== 'working_hours' || e.title !== '?? Delo');
    
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
        title: 'Delovni čas',
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
      try { await loadAppointmentsToCalendarNow(); } catch (e) {}
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
  } catch (error) {}
}

// Export CalendarEngine to window so it can be accessed globally
window.CalendarEngine = CalendarEngine;
