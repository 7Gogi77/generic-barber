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

    scheduleData.events.forEach((event) => {
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
            const timeStr = event.start.split('T')[1];
            const endTimeStr = event.end.split('T')[1];

            recurrenceEvent.start =
              current.toISOString().split('T')[0] + 'T' + timeStr;
            recurrenceEvent.end =
              current.toISOString().split('T')[0] + 'T' + endTimeStr;

            const formattedEvent = this.formatCalendarEvent(recurrenceEvent);
            console.log('🔁 Adding recurring event:', formattedEvent);
            events.push(formattedEvent);
          }

          current.setDate(current.getDate() + 1);
        }
      }
    });

    console.log('✅ Total formatted events:', events.length);
    return events;
  },

  /**
   * Format single event for FullCalendar
   */
  formatCalendarEvent(event) {
    const typeConfig = ScheduleRules.TYPE_CONFIG[event.type];
    
    // Parse dates
    const startDate = new Date(event.start);
    const endDate = new Date(event.end);
    const durationMs = endDate - startDate;
    const isMultiDay = durationMs > (24 * 60 * 60 * 1000); // More than 1 day
    
    console.log(`🔍 Formatting event "${event.title}":`, {
      originalStart: event.start,
      originalEnd: event.end,
      isMultiDay: isMultiDay,
      durationDays: Math.floor(durationMs / (24 * 60 * 60 * 1000)),
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });
    
    // For multi-day events, make sure end date is exclusive (next day at 00:00)
    let displayEnd = event.end;
    let allDay = false;
    
    if (isMultiDay) {
      allDay = true;
      
      // For allDay events in FullCalendar, the end date needs to be exclusive
      // (one day after the last day you want to show)
      // The user inputs the last day they want, so we add 1 day and set to 00:00
      
      // Parse the end date string
      const endParts = event.end.split('T');
      const endDateStr = endParts[0]; // "2026-02-14"
      
      // If end already ends with T00:00, it's already exclusive
      if (event.end.includes('T00:00')) {
        displayEnd = event.end;
      } else {
        // User set it with a time (e.g., 17:00), don't add another day
        // Just use the date as-is at 00:00
        displayEnd = endDateStr + 'T00:00:00';
      }
      
      console.log(`📅 Multi-day event:`, {
        from: event.start,
        to: displayEnd,
        originalEnd: event.end
      });
    }

    return {
      id: event.id,
      title:
        (typeConfig?.icon || '📅') + ' ' + (event.title || event.type),
      start: event.start,
      end: displayEnd,
      allDay: allDay,
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
        isBooking: event.extendedProps?.isBooking || false,
        customer: event.extendedProps?.customer || event.extendedProps?.customerName || null,
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
      
      // Calculate responsive height based on screen size - stored on window for global access
      let calendarHeight = '100%';
      let minCalendarHeight = '100%';
      // Always use 100% to fill viewport - no fixed heights
      
      // Store on window object so it can be accessed in other functions
      window._calendarHeight = calendarHeight;
      window._minCalendarHeight = minCalendarHeight;
      
      console.log('Using calendar height:', calendarHeight);
      
      // Set container dimensions - CRITICAL for first load
      containerElement.style.padding = '0';
      containerElement.style.margin = '0';
      containerElement.style.boxSizing = 'border-box';
      containerElement.style.display = 'block';
      containerElement.style.width = '100%';
      containerElement.style.maxWidth = '100%';
      containerElement.style.minWidth = '100%';
      containerElement.style.minHeight = minCalendarHeight;
      containerElement.style.height = calendarHeight;
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
        containerElement.parentElement.style.height = '100%';
        containerElement.parentElement.style.display = 'flex';
        containerElement.parentElement.style.flexDirection = 'column';
      }

      // Allow container to fill available space
      containerElement.style.flex = '1';
      containerElement.style.width = '100%';
      containerElement.style.height = 'auto';
      containerElement.style.minHeight = '100%';
      containerElement.style.overflow = 'auto';

      const calendar = new FullCalendar.Calendar(containerElement, {
        // Core settings
        initialView: options.initialView || 'dayGridMonth',
        height: '100%',
        contentHeight: 'parent',
        headerToolbar: {
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
        },

        // Locale
        locale: 'sl',
        firstDay: 1, // Monday

        // Max events per day (month view)
        dayMaxEvents: 3,
        moreLinkClick: 'popover',

        // Business hours overlay
        businessHours: {
          daysOfWeek: [1, 2, 3, 4, 5],
          startTime: '09:00',
          endTime: '17:00'
        },

        // Events
        events: async (info, successCallback, failureCallback) => {
          try {
            console.log('📅 Loading events...');
            const events = await CalendarEngine.generateCalendarEvents(scheduleData);
            console.log('📅 Loaded', events.length, 'schedule events');
            // Bookings are now stored in scheduleData.events and will be
            // converted by generateCalendarEvents. No legacy localStorage
            // appointment parsing is required here.
            
            console.log('📊 Total events being passed to FullCalendar:', events.length);
            events.forEach((e, i) => {
              console.log(`Event ${i}:`, {
                id: e.id,
                title: e.title,
                start: e.start,
                end: e.end,
                isBooking: e.extendedProps?.isBooking
              });
            });
            console.log('✅ Calling successCallback with', events.length, 'events');
            successCallback(events);
          } catch (error) {
            console.error('❌ Failed to load events:', error);
            failureCallback(error);
          }
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
          // Style booking events
          if (info.event.extendedProps?.isBooking || info.event.id?.startsWith('apt_')) {
            if (info.el) {
              info.el.style.backgroundColor = 'rgba(52, 152, 219, 0.2)';
              info.el.style.borderColor = '#3498db';
              info.el.style.borderWidth = '1px';
              info.el.style.color = '#2c3e50';
            }
          }
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
          }, 350);
        },

        // Styling
        nowIndicator: true,
        eventDisplay: 'block',
        height: calendarHeight,
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
        console.log('Container HTML after render:', containerElement.innerHTML.substring(0, 200));
        
        // IMMEDIATELY after render, limit events to 3 per day
        console.log('%c🔥 LIMITING EVENTS TO 3 PER DAY 🔥', 'color: red; font-size: 16px; font-weight: bold');
        const dayCells = containerElement.querySelectorAll('.fc-daygrid-day-cell');
        console.log(`Found ${dayCells.length} day cells`);
        
        dayCells.forEach((dayCell) => {
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
        });

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
          scroller.style.overflow = 'auto'; // Time grid can use auto/scroll
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
