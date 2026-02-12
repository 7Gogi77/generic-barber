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
            console.warn('[warn] Skipping event due to format error:', event?.id || event?.title);
          } else {
            events.push(formattedEvent);
          }
        } catch (err) {
          console.warn('[warn] formatCalendarEvent threw for event:', event?.id || event?.title, err);
        }
      }

      // Weekly recurring events
      if (event.recurring === 'weekly' && event.daysOfWeek) {
        // Recurrence expansion starts at the later of today or the event's start date (if provided)
        let startFrom = new Date(today);
        if (event.start) {
          try {
            const eventStartDate = new Date((String(event.start)).split('T')[0] + 'T00:00:00');
            if (!Number.isNaN(eventStartDate.getTime()) && eventStartDate > startFrom) startFrom = eventStartDate;
          } catch (_) {
            // ignore parsing errors
          }
        }

        let current = new Date(startFrom);

        while (current <= endDate) {
          if (event.daysOfWeek.includes(current.getDay())) {
            const recurrenceEvent = { ...event };
            const timeStr = (typeof event.start === 'string' && event.start.includes('T')) ? event.start.split('T')[1] : null;
            const endTimeStr = (typeof event.end === 'string' && event.end.includes('T')) ? event.end.split('T')[1] : null;

            const startTimeUse = timeStr || '09:00';
            const endTimeUse = endTimeStr || '17:00';

            recurrenceEvent.start = current.toISOString().split('T')[0] + 'T' + startTimeUse;
            recurrenceEvent.end = current.toISOString().split('T')[0] + 'T' + endTimeUse;

            try {
              const formattedEvent = this.formatCalendarEvent(recurrenceEvent);
              if (!formattedEvent) {
                console.warn('[warn] Skipping recurring event due to format error:', recurrenceEvent?.id || recurrenceEvent?.title);
              } else {
                events.push(formattedEvent);
              }
            } catch (err) {
              console.warn('[warn] formatCalendarEvent threw for recurring event:', recurrenceEvent?.id || recurrenceEvent?.title, err);
            }
          }

          current.setDate(current.getDate() + 1);
        }
      }
    });

    // Deduplicate events with tolerance for small time shifts (prefer id equality,
    // but prefer local-origin events and non-generic titles when times collide)
    const unique = [];
    const timeToleranceMs = 10 * 60 * 1000; // 10 minutes

    const isTimesClose = (aStart, aEnd, bStart, bEnd) => {
      try {
        const as = new Date(aStart).getTime();
        const bs = new Date(bStart).getTime();
        const ae = new Date(aEnd).getTime();
        const be = new Date(bEnd).getTime();
        return Number.isFinite(as) && Number.isFinite(bs) && Number.isFinite(ae) && Number.isFinite(be) && Math.abs(as - bs) <= timeToleranceMs && Math.abs(ae - be) <= timeToleranceMs;
      } catch (_) {
        return false;
      }
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
      const cust = (e.extendedProps && e.extendedProps.customer) ? String(e.extendedProps.customer).trim() : (e.title ? String(e.title).replace(/^\S+\s/, '').trim() : '');

      // Find an index of a conflicting event (times close + same/empty customer)
      let conflictIdx = -1;
      for (let i = 0; i < unique.length; i++) {
        const u = unique[i];
        if (u.id && e.id && u.id === e.id) { conflictIdx = i; break; }
        const uCust = (u.extendedProps && u.extendedProps.customer) ? String(u.extendedProps.customer).trim() : (u.title ? String(u.title).replace(/^\S+\s/, '').trim() : '');
        if (isTimesClose(e.start, e.end, u.start, u.end) && ((cust && uCust && cust === uCust) || (!cust && !uCust))) { conflictIdx = i; break; }
      }

      if (conflictIdx !== -1) {
        const u = unique[conflictIdx];
        // same id -> skip
        if (u.id && e.id && u.id === e.id) {
          return; // skip this incoming event
        }

        // Decide which to keep
        const keepExisting = prefer(u, e);
        if (!keepExisting) {
          unique[conflictIdx] = e; // prefer incoming
          return; // replaced existing, skip further processing
        }

        return; // keep existing, skip incoming
      }

      unique.push(e);
    });

    return unique;
  },

  /**
   * Format single event for FullCalendar
   */
  formatCalendarEvent(event) {
    const typeConfig = (typeof ScheduleRules !== 'undefined' && ScheduleRules.TYPE_CONFIG) ? ScheduleRules.TYPE_CONFIG[event.type] : {};

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
    if (typeof event.start === 'string' && /^\d{4}-\d{2}-\d{2}T\d{1,2}$/.test(event.start)) {
      event.start = event.start + ':00';
    }
    if (typeof event.end === 'string' && /^\d{4}-\d{2}-\d{2}T\d{1,2}$/.test(event.end)) {
      event.end = event.end + ':00';
    }

    // Normalize start/end to Date objects with sensible fallbacks
    let startDate;
    let endDate;

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
      }
    } catch (err) {
      // Fallback to attempt gentle parsing; do not throw
      startDate = new Date(event.start || Date.now());
      endDate = new Date(event.end || event.start || Date.now());
    }

    // If dates are invalid (NaN), try common fallback strategies
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      // Try using admin-style fields when present: startDate/startTime and endDate/endTime
      try {
        const maybeStart = (event.startDate && event.startTime) ? (String(event.startDate) + 'T' + String(event.startTime)) : null;
        const maybeEnd = (event.endDate && event.endTime) ? (String(event.endDate) + 'T' + String(event.endTime)) : null;
        if (maybeStart) startDate = new Date(maybeStart);
        if (maybeEnd) endDate = new Date(maybeEnd);
      } catch (_) {
        // ignore
      }

      // Final check; if still invalid, skip this event safely
      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        return null;
      }
    }

    const durationMs = endDate - startDate;
    const isMultiDay = Number.isFinite(durationMs) && durationMs > (24 * 60 * 60 * 1000);

    // More robust all-day detection
    let isAllDay = false;
    if (!hasStartTime && !hasEndTime) {
      isAllDay = true;
    } else if (startDate.getHours() === 0 && startDate.getMinutes() === 0 && endDate.getHours() === 0 && endDate.getMinutes() === 0 && durationMs >= (24 * 60 * 60 * 1000)) {
      isAllDay = true;
    }

    // Decide display mode for blocking types: render blocking events visibly by default
    const blockingBackgroundTypes = new Set([]);
    const isBlockingType = event.rules?.isBlocking || typeConfig?.isBlocking;
    const displayMode = (isBlockingType && blockingBackgroundTypes.has(event.type)) ? 'background' : 'auto';

    // Booking events should render the customer name (no icon prefix)
    const isBooking = event.extendedProps?.isBooking || false;
    const customerName = event.extendedProps?.customer || null;
    const titleText = isBooking ? (customerName || event.title || 'Rezervacija') : ((typeConfig?.icon || 'event') + ' ' + (event.title || event.type));

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
          origin: event.extendedProps?.origin || null,
          adminKey: event.extendedProps?.adminKey || null,
          worker: event.extendedProps?.worker || null,
          createdAt: event.extendedProps?.createdAt || event.createdAt || null,
          lastModified: event.extendedProps?.lastModified || null,
          isBooking: isBooking,
          customer: customerName || event.extendedProps?.customerName || null,
          email: event.extendedProps?.email || null,
          phone: event.extendedProps?.phone || null,
          services: event.extendedProps?.services || null,
          price: typeof event.extendedProps?.price !== 'undefined' ? event.extendedProps.price : null,
          duration: event.extendedProps?.duration || null,
          notes: event.extendedProps?.notes || ''
        },
        display: displayMode,
        editable: true,
        durationEditable: true,
        classNames: [
          'schedule-event',
          `event-type-${event.type}`,
          (event.rules?.isBlocking || typeConfig?.isBlocking) ? 'event-blocking' : 'event-normal',
          isMultiDay ? 'event-multiday' : 'event-single'
        ]
      };
    }

    // Use ISO date-only strings for all-day events
    const startIso = startDate.toISOString().split('T')[0];
    const endIso = endDate.toISOString().split('T')[0];

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
        origin: event.extendedProps?.origin || null,
        adminKey: event.extendedProps?.adminKey || null,
        worker: event.extendedProps?.worker || null,
        createdAt: event.extendedProps?.createdAt || event.createdAt || null,
        lastModified: event.extendedProps?.lastModified || null,
        isBooking: isBooking,
        customer: customerName || event.extendedProps?.customerName || null,
        email: event.extendedProps?.email || null,
        phone: event.extendedProps?.phone || null,
        services: event.extendedProps?.services || null,
        price: typeof event.extendedProps?.price !== 'undefined' ? event.extendedProps.price : null,
        duration: event.extendedProps?.duration || null,
        notes: event.extendedProps?.notes || ''
      },
      display: displayMode,
      editable: true,
      durationEditable: true,
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
   * Initialize calendar instance
   */
  initializeCalendar(container, scheduleData) {
    if (typeof FullCalendar === 'undefined') {
      throw new Error('FullCalendar not loaded');
    }
    if (!container) {
      throw new Error('Calendar container missing');
    }

    this.currentScheduleData = scheduleData || { events: [] };

    const calendar = new FullCalendar.Calendar(container, {
      initialView: 'timeGridWeek',
      height: '100%',
      nowIndicator: true,
      slotMinTime: '06:00:00',
      slotMaxTime: '22:00:00',
      allDaySlot: true,
      expandRows: true,
      editable: true,
      selectable: true,
      dayMaxEvents: true,
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'timeGridWeek,timeGridDay,dayGridMonth,listWeek'
      },
      slotDuration: '00:30:00',
      slotLabelInterval: '01:00',
      eventTimeFormat: {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      },
      eventDidMount: (info) => {
        // Set a helpful title attribute for hover
        try {
          if (info.event && info.event.title && info.el) {
            info.el.setAttribute('title', info.event.title);
          }
        } catch (_) {
          // ignore
        }
      }
    });

    this.calendar = calendar;
    calendar.render();

    return calendar;
  }
};

if (typeof window !== 'undefined') {
  window.CalendarEngine = CalendarEngine;
}
