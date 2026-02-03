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
        const formattedEvent = this.formatCalendarEvent(event);
        console.log('📌 Adding single event:', formattedEvent);
        events.push(formattedEvent);
      }

      // Weekly recurring events
      if (event.recurring === 'weekly' && event.daysOfWeek) {
        let current = new Date(today);

        while (current <= endDate) {
          if (event.daysOfWeek.includes(current.getDay())) {
            const recurrenceEvent = { ...event };
            const timeStr = (typeof event.start === 'string' && event.start.includes('T')) ? event.start.split('T')[1] : null;
            const endTimeStr = (typeof event.end === 'string' && event.end.includes('T')) ? event.end.split('T')[1] : null;

            const startTimeUse = timeStr || '09:00';
            const endTimeUse = endTimeStr || '17:00';

            recurrenceEvent.start = current.toISOString().split('T')[0] + 'T' + startTimeUse;
            recurrenceEvent.end = current.toISOString().split('T')[0] + 'T' + endTimeUse;

            const formattedEvent = this.formatCalendarEvent(recurrenceEvent);
            console.log('🔁 Adding recurring event:', formattedEvent);
            events.push(formattedEvent);
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

    // Deduplicate events by stable key (prefer id, otherwise normalized start|end|customer)
    const seen = new Set();
    const unique = [];
    events.forEach(e => {
      const cust = (e.extendedProps && e.extendedProps.customer) ? String(e.extendedProps.customer).trim() : (e.title ? String(e.title).replace(/^\S+\s/, '').trim() : '');
      // Normalize start/end to minute granularity so ISO string differences (seconds) don't prevent dedupe
      let sNorm = e.start;
      let eNorm = e.end;
      try {
        sNorm = new Date(e.start).toISOString().slice(0,16);
      } catch (_) { sNorm = String(e.start || ''); }
      try {
        eNorm = new Date(e.end).toISOString().slice(0,16);
      } catch (_) { eNorm = String(e.end || ''); }

      const key = e.id || `${sNorm}|${eNorm}|${cust}`;
      if (seen.has(key)) {
        console.log('⏭️ Skipping duplicate event:', key);
        return;
      }
      seen.add(key);
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
      startDate = new Date(event.start || Date.now());
      endDate = new Date(event.end || event.start || Date.now());
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
        color: typeConfig?.color || '#95a5a6',
        backgroundColor: typeConfig?.backgroundColor || 'rgba(149, 165, 166, 0.15)',
        borderColor: typeConfig?.borderColor || '#7f8c8d',
        textColor: '#2c3e50',
        extendedProps: {
          type: event.type,
          eventId: event.id,
          isBlocking: event.rules?.isBlocking || false,
          isSubtractive: event.rules?.isSubtractive || false,
          priority: event.rules?.conflictPriority || 0,
          isMultiDay: isMultiDay,
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
        // Blocking events (vacation, sick leave, day off) show as background
        display: event.rules?.isBlocking ? 'background' : 'auto',
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
      color: typeConfig?.color || '#95a5a6',
      backgroundColor: typeConfig?.backgroundColor || 'rgba(149, 165, 166, 0.15)',
      borderColor: typeConfig?.borderColor || '#7f8c8d',
      textColor: '#2c3e50',
      extendedProps: {
        type: event.type,
        eventId: event.id,
        isBlocking: event.rules?.isBlocking || false,
        isSubtractive: event.rules?.isSubtractive || false,
        priority: event.rules?.conflictPriority || 0,
        isMultiDay: isMultiDay,
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
      // Blocking events (vacation, sick leave, day off) show as background
      display: event.rules?.isBlocking ? 'background' : 'auto',
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
      
      // Group events by their parent row/day
      const eventsByDay = new Map();
      
      allEvents.forEach((eventEl, idx) => {
        try {
          // Find the parent row (which contains all events for that day)
          let parent = eventEl.parentElement;
          
          // Go up until we find a unique container for this day
          while (parent && parent.classList && !parent.classList.contains('fc-daygrid-day-frame')) {
            parent = parent.parentElement;
          }
          
          if (!parent) {
            parent = eventEl.parentElement; // fallback
          }
          
          const key = parent ? parent.getAttribute('data-datekey') || String(Math.random()) : String(idx);
          
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
            dayEvents[i].style.display = 'none !important';
            dayEvents[i].style.visibility = 'hidden !important';
          }
          
          // Add more link
          const hiddenCount = dayEvents.length - maxEvents;
          const moreDiv = document.createElement('div');
          moreDiv.className = 'fc-daygrid-day-more';
          moreDiv.style.cssText = 'padding: 2px 4px; font-size: 11px; color: #3498db; font-weight: 600;';
          moreDiv.textContent = `+${hiddenCount} više`;
          
          const lastVisible = dayEvents[maxEvents - 1];
          if (lastVisible && lastVisible.parentElement) {
            lastVisible.parentElement.appendChild(moreDiv);
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
      const slotMinutes = (window.SITE_CONFIG && window.SITE_CONFIG.booking && window.SITE_CONFIG.booking.slotDuration) ? window.SITE_CONFIG.booking.slotDuration : 15;
      const slotDurationStr = `00:${('0' + slotMinutes).slice(-2)}:00`;

      const calendar = new FullCalendar.Calendar(containerElement, {
        initialView: options.initialView || 'dayGridMonth',
        headerToolbar: {
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
        },
        locale: 'sl',
        firstDay: 1,
        nowIndicator: true,
        dayMaxEvents: 3,
        moreLinkClick: 'popover',
        // Business hours (visual only)
        businessHours: {
          daysOfWeek: [1,2,3,4,5],
          startTime: (window.SITE_CONFIG && window.SITE_CONFIG.booking && window.SITE_CONFIG.booking.businessHours) ? (('0' + window.SITE_CONFIG.booking.businessHours.start).slice(-2) + ':00') : '09:00',
          endTime: (window.SITE_CONFIG && window.SITE_CONFIG.booking && window.SITE_CONFIG.booking.businessHours) ? (('0' + window.SITE_CONFIG.booking.businessHours.end).slice(-2) + ':00') : '17:00'
        },
        // TimeGrid options
        slotMinTime: (window.SITE_CONFIG && window.SITE_CONFIG.booking && window.SITE_CONFIG.booking.businessHours) ? (('0' + window.SITE_CONFIG.booking.businessHours.start).slice(-2) + ':00:00') : '06:00:00',
        slotMaxTime: (window.SITE_CONFIG && window.SITE_CONFIG.booking && window.SITE_CONFIG.booking.businessHours) ? (('0' + window.SITE_CONFIG.booking.businessHours.end).slice(-2) + ':00:00') : '22:00:00',
        slotDuration: slotDurationStr,
        slotLabelInterval: { hours: 1 },
        slotLabelFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
        allDaySlot: true,
        views: {
          dayGridMonth: { type: 'dayGridMonth' },
          timeGridWeek: { type: 'timeGrid' },
          timeGridDay: { type: 'timeGrid' }
        },
        height: calcHeight,
        contentHeight: 'auto',

        // Load events
        events: async (info, successCallback, failureCallback) => {
          try {
            const events = await CalendarEngine.generateCalendarEvents(scheduleData);
            successCallback(events);
          } catch (err) { failureCallback(err); }
        },

        // Basic sizing hooks so FullCalendar can recompute after view changes
        datesSet: (dateInfo) => {
          try {
            if (calendar && typeof calendar.updateSize === 'function') calendar.updateSize();
            // Add view-specific classes to container to scope styles
            try {
              const v = dateInfo && dateInfo.view && dateInfo.view.type ? dateInfo.view.type : '';
              if (containerElement) {
                containerElement.classList.toggle('view-timegrid', v.startsWith('timeGrid'));
                containerElement.classList.toggle('view-daygrid', v === 'dayGridMonth');
              }
            } catch (e) { /* ignore */ }
          } catch (e) { console.warn('⚠ datesSet failed', e); }
        },
        viewDidMount: (arg) => {
          try {
            if (calendar && typeof calendar.updateSize === 'function') calendar.updateSize();
            try {
              const v = arg && arg.view && arg.view.type ? arg.view.type : '';
              if (containerElement) {
                containerElement.classList.toggle('view-timegrid', v.startsWith('timeGrid'));
                containerElement.classList.toggle('view-daygrid', v === 'dayGridMonth');
              }
            } catch (e) { /* ignore */ }
          } catch (e) { console.warn('⚠ viewDidMount failed', e); }
        },

        // Interactions
        selectable: true,
        selectOverlap: true,
        editable: true,
        eventDurationEditable: true,

        // Event handling - NOTE: These are overridden by poslovni-panel.html
        // Only used in admin-panel.html - check if modal exists before calling
        select: (selectInfo) => {
          console.log('📅 Date selected:', selectInfo.startStr, '→', selectInfo.endStr);
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
                const ed = new Date(selectInfo.endStr);
                // subtract 1 day
                ed.setDate(ed.getDate() - 1);
                endStr = ed.toISOString().split('T')[0];
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

            // Style booking events
            if (info.event.extendedProps?.isBooking || info.event.id?.startsWith('apt_')) {
              if (info.el) {
                info.el.style.backgroundColor = 'rgba(52, 152, 219, 0.2)';
                info.el.style.borderColor = '#3498db';
                info.el.style.borderWidth = '1px';
                info.el.style.color = '#2c3e50';
              }
            }
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
              const currentView = calendar && calendar.view && calendar.view.type ? calendar.view.type : null;
              if (currentView !== 'timeGridWeek') {
                console.warn('eventsSet: timed events present but skipping remediation because current view is not timeGridWeek:', currentView);
              } else {
                console.warn('eventsSet detected timed events but NO event nodes in timeGrid (week view) - scheduling a sanity recheck');
                setTimeout(() => {
                  try {
                    const timegridEventEls2 = document.querySelectorAll('.fc-timegrid .fc-event');
                    if (timegridEventEls2.length === 0 && typeof CalendarEngine.remakeTimeGridViews === 'function') {
                      console.warn('eventsSet: still no event nodes, invoking remakeTimeGridViews (week-only)');
                      CalendarEngine.remakeTimeGridViews('timeGridWeek', window.scheduleData).catch(e=>console.warn('remake failed from eventsSet', e));
                    }
                  } catch (e) { console.warn('eventsSet recheck failed', e); }
                }, 220);
              }
            }
          } catch (err) { console.warn('eventsSet hook failed', err); }
        },
        
        eventContent: (arg) => {
          // Custom rendering for booking events - show customer name and time
          if (arg.event.extendedProps?.isBooking || arg.event.id?.startsWith('apt_')) {
            console.log('📝 Rendering booking content:', arg.event.title);
            const customerName = arg.event.extendedProps?.customer || arg.event.title || 'Rezervacija';
            const startTime = arg.event.start ? new Date(arg.event.start).toLocaleTimeString('sl-SI', {hour: '2-digit', minute: '2-digit'}) : '';
            return {
              html: `<div style="padding: 2px; font-size: 12px; font-weight: bold;">${customerName}</div><div style="padding: 2px; font-size: 10px;">${startTime}</div>`
            };
          }
          
          // Custom rendering for multi-day events
          if (arg.event.extendedProps?.isMultiDay && arg.event.allDay) {
            return {
              html: `<div style="width: 100%; padding: 4px 6px; white-space: normal; overflow: visible;">${arg.event.title}</div>`
            };
          }
          
          // Default rendering for schedule events - show title with time
          if (arg.event.title) {
            const startTime = arg.event.start ? new Date(arg.event.start).toLocaleTimeString('sl-SI', {hour: '2-digit', minute: '2-digit'}) : '';
            const title = arg.event.title.length > 15 ? arg.event.title.substring(0, 15) + '...' : arg.event.title;
            return {
              html: `<div style="padding: 1px 2px; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${title}</div>`
            };
          }
          
          return false; // Use default rendering
        },

        eventDrop: async (dropInfo) => {
          console.log('📅 Event dropped:', dropInfo.event.title);
          const event = scheduleData.events.find(e => e.id === dropInfo.event.id);
          if (event) {
            event.start = dropInfo.event.startStr;
            event.end = dropInfo.event.endStr;
            await StorageManager.save('schedule', scheduleData);
          }
        },

        eventResize: async (resizeInfo) => {
          console.log('📅 Event resized:', resizeInfo.event.title);
          const event = scheduleData.events.find(e => e.id === resizeInfo.event.id);
          if (event) {
            event.start = resizeInfo.event.startStr;
            event.end = resizeInfo.event.endStr;
            await StorageManager.save('schedule', scheduleData);
          }
        },

        datesSet: (arg) => {
          console.log('📅 Dates set');
          
          // After view renders, limit timed events to 3 per day
          setTimeout(() => {
            if (arg.view.type === 'dayGridMonth') {
              console.log('🔍 Limiting events to 3 per day...');
              
              // Get all day cell containers
              const dayCells = document.querySelectorAll('.fc-daygrid-day-cell');
              console.log('Found', dayCells.length, 'day cells');
              
              dayCells.forEach((dayCell, index) => {
                const eventsContainer = dayCell.querySelector('.fc-daygrid-day-events');
                if (eventsContainer) {
                  const allEventEls = Array.from(eventsContainer.querySelectorAll('.fc-daygrid-event'));
                  
                  if (allEventEls.length > 0) {
                    const dateEl = dayCell.querySelector('.fc-daygrid-day-number');
                    const dayNum = dateEl ? dateEl.textContent : 'unknown';
                    console.log(`%c📅 FEB ${dayNum}: Found ${allEventEls.length} events`, 'color: blue; font-weight: bold');
                    
                    let timedCount = 0;
                    allEventEls.forEach((el, i) => {
                      const text = el.textContent;
                      const hasTime = /\d{2}:\d{2}/.test(text);
                      
                      if (hasTime) {
                        timedCount++;
                        if (timedCount > 3) {
                          el.style.display = 'none';
                          console.log(`%c  ❌ HIDDEN: "${text.substring(0, 40)}" (timed event #${timedCount})`, 'color: red');
                        } else {
                          console.log(`%c  ✅ KEPT: "${text.substring(0, 40)}" (timed event #${timedCount})`, 'color: green');
                        }
                      } else {
                        console.log(`%c  ✅ KEPT: "${text.substring(0, 40)}" (all-day event)`, 'color: green');
                      }
                    });
                  }
                }
              });
              
        // NOW FORCE ROWS TO STRETCH - USE PIXEL HEIGHTS BASED ON CONTAINER SIZE
              const daygridBody = document.querySelector('.fc-daygrid-body');
              if (daygridBody) {
                const rows = daygridBody.querySelectorAll('.fc-daygrid-row');
                if (rows.length > 0) {
                  const bodyHeight = daygridBody.offsetHeight;
                  const rowHeight = bodyHeight / rows.length;
                  
                  console.log(`datesSet: daygrid-body height=${bodyHeight}px, setting each row to ${rowHeight}px`);
                  
                  // Set each row to equal pixel height
                  rows.forEach((row, i) => {
                    row.style.height = rowHeight + 'px';
                    row.style.minHeight = rowHeight + 'px';
                    row.style.maxHeight = rowHeight + 'px';
                    row.style.overflow = 'visible';
                    
                    // Also ensure day cells stretch within their row
                    const cells = row.querySelectorAll('.fc-daygrid-day-cell');
                    cells.forEach(cell => {
                      cell.style.height = '100%';
                      cell.style.minHeight = '100%';
                    });
                  });
                  
                  console.log(`✅ All ${rows.length} rows set to ${rowHeight}px`);
                }
              }
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
                  if (scrollBodies && scrollBodies.length) { scrollBodies.forEach(b => { b.style.height = avail + 'px'; b.style.minHeight = avail + 'px'; b.style.overflowX = 'hidden'; b.style.overflowY = 'auto'; }); }

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
            
            // STRETCH ROWS EQUALLY - runs after view fully mounted
            const daygridBody = document.querySelector('.fc-daygrid-body');
            if (daygridBody) {
              const rows = daygridBody.querySelectorAll('.fc-daygrid-row');
              if (rows.length > 0) {
                const bodyHeight = daygridBody.offsetHeight;
                const rowHeight = bodyHeight / rows.length;
                
                console.log(`%cVIEW MOUNTED: daygrid-body height=${bodyHeight}px, setting each row to ${rowHeight}px`, 'color: purple; font-weight: bold');
                
                rows.forEach((row, i) => {
                  row.style.height = rowHeight + 'px';
                  row.style.minHeight = rowHeight + 'px';
                  row.style.maxHeight = rowHeight + 'px';
                  row.style.overflow = 'visible';
                  
                  const cells = row.querySelectorAll('.fc-daygrid-day-cell');
                  cells.forEach(cell => {
                    cell.style.height = '100%';
                    cell.style.minHeight = '100%';
                  });
                });
                
                console.log(`✅ All ${rows.length} rows set to ${rowHeight}px height`);
              }
            }

            // TIMEGRID SANITY CHECK - only apply to timeGridWeek (do not attempt fallbacks for Day view)
            try {
              const v = arg && arg.view && arg.view.type ? arg.view.type : '';
              if (v === 'timeGridWeek') {
                setTimeout(async () => {
                  try {
                    const timedEvents = (calendar && typeof calendar.getEvents === 'function') ? calendar.getEvents().filter(e => !e.allDay) : [];
                    const timegridEventEls = containerElement.querySelectorAll('.fc-timegrid .fc-event');
                    const slots = containerElement.querySelectorAll('.fc-timegrid .fc-timegrid-slot');
                    console.log('viewDidMount sanity (week-only):', { view: v, timedEvents: timedEvents.length, timegridEventEls: timegridEventEls.length, slots: slots.length });

                    // If there are timed events but nothing rendered in the timeGrid, it's likely FullCalendar DOM failed to create time slot or event nodes
                    if (timedEvents.length > 0 && timegridEventEls.length === 0) {
                      console.warn('⚠ viewDidMount sanity failed: timed events present but no event elements in timeGrid — attempting full remake (week-only)');
                      if (typeof CalendarEngine.remakeTimeGridViews === 'function') {
                        try { await CalendarEngine.remakeTimeGridViews(v, scheduleData); } catch (remErr) { console.warn('remakeTimeGridViews failed', remErr); }
                      } else {
                        console.warn('remakeTimeGridViews not available');
                      }
                      return;
                    }

                    // If there are no slots at all (collapsed DOM), try forcing a view re-render to rebuild DOM
                    if (slots.length === 0) {
                      console.warn('⚠ viewDidMount sanity: no timeGrid slots found — forcing view re-render (week-only)');
                      try { if (calendar && typeof calendar.changeView === 'function') calendar.changeView(v); } catch (err) { console.warn('Failed to changeView for sanity check', err); }
                    }
                  } catch (err) { console.warn('viewDidMount sanity check failed', err); }
                }, 220);
              }
            } catch (err) { /* ignore */ }
          }, 350);
        },

        // Styling
        nowIndicator: true,
        eventDisplay: 'block',
        allDaySlot: true,
        height: window._calendarHeight || 600,
        contentHeight: 'parent'
      });

      console.log('✅ Calendar object created:', calendar);
      console.log('Calendar constructor type:', typeof calendar);
      console.log('Calendar is FullCalendar.Calendar:', calendar instanceof FullCalendar.Calendar);
      console.log('Calendar methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(calendar)).slice(0, 10));

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
        // Apply initial view class to container
        try {
          const initView = calendar && calendar.view && calendar.view.type ? calendar.view.type : null;
          if (initView && containerElement) {
            containerElement.classList.toggle('view-timegrid', initView.startsWith('timeGrid'));
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
              if (scrollBodies && scrollBodies.length) { scrollBodies.forEach(b => { b.style.height = avail + 'px'; b.style.minHeight = avail + 'px'; b.style.overflowX = 'hidden'; b.style.overflowY = 'auto'; }); }

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
      
      // Force container to have proper height and width after rendering
      // Use flexbox to fill viewport
      containerElement.style.width = '100%';
      containerElement.style.maxWidth = '100%';
      containerElement.style.minWidth = '100%';
      containerElement.style.padding = '0';
      containerElement.style.height = '100%';
      containerElement.style.boxSizing = 'border-box';
      containerElement.style.visibility = 'visible';
      containerElement.style.display = 'flex';
      containerElement.style.flexDirection = 'column';
      
      // CRITICAL: Trigger resize event so FullCalendar recalculates widths
      console.log('📅 Immediately calling updateSize...');
      if (calendar.updateSize) {
        calendar.updateSize();
      }
      
      setTimeout(() => {
        console.log('📅 Triggering window resize event');
        window.dispatchEvent(new Event('resize'));
        if (calendar.updateSize) {
          calendar.updateSize();
        }
      }, 50);
      
      setTimeout(() => {
        console.log('📅 Second updateSize call');
        if (calendar.updateSize) {
          calendar.updateSize();
        }
        
        // DEBUG: Check what's actually in the container
        console.log('🔍 Full container HTML structure:');
        console.log(containerElement.innerHTML.substring(0, 1000));
        
        console.log('🔍 Looking for FC elements:');
        console.log('  .fc:', containerElement.querySelector('.fc') ? '✅' : '❌');
        console.log('  .fc-daygrid:', containerElement.querySelector('.fc-daygrid') ? '✅' : '❌');
        console.log('  .fc-daygrid-view:', containerElement.querySelector('.fc-daygrid-view') ? '✅' : '❌');
        console.log('  .fc-scrollgrid:', containerElement.querySelector('.fc-scrollgrid') ? '✅' : '❌');
        
        // Check all-day section
        const allDaySection = containerElement.querySelector('.fc-daygrid-all-day-section');
        if (allDaySection) {
          const allDayStyle = window.getComputedStyle(allDaySection);
          console.log('✅ All-day section FOUND');
          console.log('All-day section styles:', {
            display: allDayStyle.display,
            height: allDayStyle.height,
            minHeight: allDayStyle.minHeight,
            overflow: allDayStyle.overflow,
            visibility: allDayStyle.visibility,
            opacity: allDayStyle.opacity,
            position: allDayStyle.position
          });
          console.log('All-day section HTML:', allDaySection.innerHTML.substring(0, 500));
        } else {
          console.log('❌ All-day section NOT FOUND in DOM');
          
          // List all available elements
          const allSections = containerElement.querySelectorAll('[class*="all-day"]');
          console.log('Elements with "all-day" in class:', allSections.length);
          allSections.forEach((el, i) => {
            console.log(`  [${i}]`, el.className);
          });
          
          // Check what scrollgrid sections exist
          const sections = containerElement.querySelectorAll('.fc-scrollgrid-section');
          console.log('Total scrollgrid sections:', sections.length);
          sections.forEach((section, i) => {
            console.log(`  Section ${i}:`, section.className, 'HTML:', section.innerHTML.substring(0, 100));
          });
        }
        
        // Re-apply responsive heights after updateSize
        const fcView = containerElement.querySelector('.fc');
        if (fcView) {
          fcView.style.height = window._calendarHeight || '700px';
          const fcRoot = containerElement.querySelector('.fc-root');
          if (fcRoot) fcRoot.style.height = window._calendarHeight || '700px';
          const fcViewHarness = containerElement.querySelector('.fc-view-harness');
          if (fcViewHarness) fcViewHarness.style.height = window._calendarHeight || '700px';
          console.log('Reapplied heights after updateSize');
        }
      }, 150);
      
      // Ensure the fc view has proper dimensions
      // Get values from window object (avoid redeclaring)
      let calendarHeightValue = window._calendarHeight || '700px';
      let minCalendarHeightValue = window._minCalendarHeight || '500px';
      const fcView = containerElement.querySelector('.fc');
      if (fcView) {
        fcView.style.width = '100%';
        fcView.style.minHeight = minCalendarHeightValue;
        fcView.style.height = calendarHeightValue;
        fcView.style.visibility = 'visible';
        fcView.style.overflow = 'visible';
        fcView.style.display = 'flex';
        fcView.style.flexDirection = 'column';
        console.log('✅ FC view sized and visible');
        
        // Force all FC children
        const fcRoot = containerElement.querySelector('.fc-root');
        if (fcRoot) {
          fcRoot.style.width = '100%';
          fcRoot.style.height = calendarHeightValue;
          fcRoot.style.display = 'flex';
          fcRoot.style.flexDirection = 'column';
        }
        
        const fcViewHarness = containerElement.querySelector('.fc-view-harness');
        if (fcViewHarness) {
          fcViewHarness.style.width = '100%';
          fcViewHarness.style.height = calendarHeightValue;
          fcViewHarness.style.flex = '1';
        }
        
        const fcDayGrid = containerElement.querySelector('.fc-daygrid');
        if (fcDayGrid) {
          fcDayGrid.style.width = '100%';
          fcDayGrid.style.height = '100%';
        }
      } else {
        console.warn('⚠️ FC view not found in container');
      }
      
      // Also size the fc-scroller and fc-daygrid elements
      const fcScrollers = containerElement.querySelectorAll('.fc-scroller');
      fcScrollers.forEach(scroller => {
        scroller.style.width = '100%';
        // For all-day section, use visible to show events; for time grid, use auto (let FullCalendar decide)
        if (scroller.closest('.fc-daygrid-all-day-section')) {
          scroller.style.overflow = 'visible'; // Allow all-day events to display
        } else {
          scroller.style.overflowX = 'hidden'; scroller.style.overflowY = 'auto'; // Time grid scrolls vertically only
        }
        scroller.style.display = 'block';
      });
      
      // Force daygrid table to display properly
      const fcTable = containerElement.querySelector('.fc-scrollgrid');
      if (fcTable) {
        fcTable.style.width = '100%';
        fcTable.style.display = 'table';
        fcTable.style.tableLayout = 'auto';
        fcTable.style.borderCollapse = 'collapse';
        console.log('✅ FC table forced to display:table');
      }
      
      // Force header toolbar to display
      const fcHeader = containerElement.querySelector('.fc-header-toolbar');
      if (fcHeader) {
        fcHeader.style.display = 'flex';
        fcHeader.style.width = '100%';
        console.log('✅ FC header toolbar visible');
      }
      
      // Force view harness
      const fcViewHarness = containerElement.querySelector('.fc-view-harness');
      if (fcViewHarness) {
        fcViewHarness.style.display = 'flex';
        fcViewHarness.style.width = '100%';
        fcViewHarness.style.flex = '1';
        console.log('✅ FC view harness visible');
      }
      
      // Force sync table widths - this is critical!
      const fcSyncTables = containerElement.querySelectorAll('.fc-scrollgrid-sync-table');
      fcSyncTables.forEach(table => {
        table.style.width = '100%';
        table.style.tableLayout = 'fixed';
        console.log('✅ Sync table width fixed');
      });
      
      // Fix col header table
      const fcColHeader = containerElement.querySelector('.fc-col-header');
      if (fcColHeader) {
        fcColHeader.style.width = '100%';
        console.log('✅ Col header width fixed');
      };
      
      // Force a refresh of the view with proper timing
      setTimeout(() => {
        console.log('📅 Refreshing calendar view after render');
        try {
          calendar.refetchEvents();
        } catch (err) {
          console.error('Error refetching events:', err);
        }
      }, 150);
      
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
    try {
      // Throttle repeated remakes to once every 4 seconds
      const now = Date.now();
      this._lastRemakeAt = this._lastRemakeAt || 0;
      if (now - this._lastRemakeAt < 4000) {
        console.warn('⚠ remakeTimeGridViews called too frequently — skipping this call');
        return this.calendar || null;
      }
      this._lastRemakeAt = now;

      console.log('🔁 Remaking Day/Week views (preferredView=', preferredView, ')');
      const schedule = scheduleDataParam || (typeof window !== 'undefined' ? window.scheduleData : null);

      // Destroy existing calendar if present
      try {
        if (this.calendar && typeof this.calendar.destroy === 'function') {
          console.log('🔁 Destroying existing calendar instance');
          this.calendar.destroy();
        }
      } catch (err) { console.warn('⚠ Error destroying calendar', err); }

      // Clear container DOM to ensure a fresh render
      if (this.containerElement) {
        try {
          this.containerElement.innerHTML = '';
        } catch (err) { console.warn('⚠ Failed to clear containerElement innerHTML', err); }
      }

      // Re-initialize calendar with timeGridWeek as initial view (or preferredView passed)
      const container = this.containerElement || document.getElementById('scheduleCalendar');
      if (!container) throw new Error('Calendar container not found');

      const newCal = this.initializeCalendar(container, schedule || (window.scheduleData || {}), { initialView: preferredView });
      if (!newCal) throw new Error('Failed to initialize new calendar');

      // Store and expose
      this.calendar = newCal;
      try { window.calendar = newCal; } catch (e) { /* ignore */ }

      // Cycle Week/Day views briefly to force FullCalendar to build both DOMs
      const views = ['timeGridWeek', 'timeGridDay'];
      let delay = 120;
      for (const v of views) {
        try {
          console.log(`🔁 Switching to view ${v} to warm DOM`);
          newCal.changeView(v);
          await new Promise(r => setTimeout(r, delay));
          delay = Math.min(400, delay * 2);
        } catch (err) { console.warn('⚠ changeView failed for', v, err); }
      }

      // Return to preferred view
      try { newCal.changeView(preferredView); } catch (err) { /* ignore */ }

      // Final size update
      if (newCal && typeof newCal.updateSize === 'function') newCal.updateSize();

      console.log('✅ remakeTimeGridViews completed');
      return newCal;
    } catch (err) {
      console.error('❌ remakeTimeGridViews failed', err);
      throw err;
    }
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
      if (type === (event?.extendedProps?.type || selectInfo ? 'working_hours' : typeInput.value)) {
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

    // Set form values
    if (event) {
      // Editing existing event
      titleInput.value = event.title || '';
      typeInput.value = event.extendedProps?.type || 'working_hours';
      startInput.value = event.start;
      endInput.value = event.end || event.start;
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
          
          // Convert to datetime-local format (YYYY-MM-DDTHH:mm)
          const startStr = startDate.toISOString().slice(0, 16);
          const endStr = endDate.toISOString().slice(0, 16);
          
          console.log('Formatted start:', startStr);
          console.log('Formatted end:', endStr);
          
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

          // Update in calendar
          event.setProp('title', title);
          event.setProp('backgroundColor', typeColors[type]);
          event.setExtendedProp('type', type);
          event.setStart(start);
          event.setEnd(end);
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
          calendar.addEvent(formattedEvent);
          console.log('📌 Event added to calendar, total events:', scheduleData.events.length);
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

      // Remove from storage
      const eventId = event.id;
      scheduleData.events = scheduleData.events.filter(e => e.id !== eventId);
      event.remove();

      await StorageManager.save('schedule', scheduleData);

      // Update events list
      CalendarEngine.updateEventsList(scheduleData);

      modal.style.display = 'none';
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
    const schedule = await StorageManager.load('schedule');
    debugLog(`✓ Schedule loaded, events: ${schedule.events ? schedule.events.length : 0}`);

    if (window.calendar) {
      const newEvents = await CalendarEngine.generateCalendarEvents(schedule);
      window.calendar.removeAllEvents();
      window.calendar.addEventSource(newEvents);
      debugLog(`✅ Calendar refreshed with ${newEvents.length} events from schedule`);
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
      const dateStr = date.toISOString().split('T')[0];
      
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
    
    // Update calendar if it exists
    if (window.calendar) {
      // Clear existing "Delo" events from calendar
      window.calendar.getEvents().forEach(event => {
        if (event.extendedProps?.isWorkingHours) {
          event.remove();
        }
      });
      
      // Add new events to calendar
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
