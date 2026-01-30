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
        notes: event.extendedProps?.notes || '',
        priority: event.rules?.conflictPriority || 0,
        isMultiDay: isMultiDay
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
      let calendarHeight = '700px';
      let minCalendarHeight = '500px';
      if (window.innerWidth < 768) {
        // Mobile: use viewport height minus nav and padding
        calendarHeight = (window.innerHeight - 200) + 'px';
        minCalendarHeight = '400px';
      } else if (window.innerWidth < 1024) {
        // Tablet
        calendarHeight = '600px';
        minCalendarHeight = '500px';
      }
      
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
      }

      // Set container max height BEFORE initialization
      containerElement.style.maxHeight = '550px';
      containerElement.style.overflow = 'auto';

      const calendar = new FullCalendar.Calendar(containerElement, {
        // Core settings
        initialView: options.initialView || 'dayGridMonth',
        height: 'auto',
        contentHeight: 670,
        headerToolbar: {
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
        },

        // Locale
        locale: 'sl',
        firstDay: 1, // Monday

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
            console.log('📅 Loaded', events.length, 'events');
            console.log('📊 Events being passed to FullCalendar:', events);
            events.forEach((e, i) => {
              console.log(`Event ${i}:`, {
                id: e.id,
                title: e.title,
                start: e.start,
                end: e.end,
                backgroundColor: e.backgroundColor,
                borderColor: e.borderColor
              });
            });
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

        // Event handling
        select: (selectInfo) => {
          console.log('📅 Date selected:', selectInfo.startStr);
          CalendarEngine.openEventModal(null, selectInfo, calendar, scheduleData);
        },
        
        eventClick: (clickInfo) => {
          console.log('📅 Event clicked:', clickInfo.event.title);
          CalendarEngine.openEventModal(clickInfo.event, null, calendar, scheduleData);
        },
        
        eventDidMount: (info) => {
          console.log('🎨 Event mounted:', {
            title: info.event.title,
            id: info.event.id,
            start: info.event.startStr,
            end: info.event.endStr,
            allDay: info.event.allDay,
            view: info.view.type,
            element: info.el
          });
          
          // IMPORTANT: For booking events, manually set visible colors
          // FullCalendar's inline styles override CSS, so we must force them here
          if (info.event.extendedProps?.isBooking || info.event.id?.startsWith('apt_')) {
            console.log('🎨 Styling booking event:', info.event.id, 'Title:', info.event.title);
            if (info.el) {
              // Use normal event styling, not special blue
              info.el.style.backgroundColor = 'rgba(52, 152, 219, 0.2)';
              info.el.style.borderColor = '#3498db';
              info.el.style.borderWidth = '1px';
              info.el.style.color = '#2c3e50';
              info.el.style.overflow = 'visible';
              info.el.style.whiteSpace = 'normal';
              info.el.style.minHeight = 'auto';
              info.el.style.height = 'auto';
              info.el.style.padding = '4px';
              info.el.style.opacity = '1';
              
              // Find and style text content - normal styling
              const allElements = info.el.querySelectorAll('*');
              allElements.forEach(el => {
                if (el.textContent && el.textContent.trim().length > 0) {
                  el.style.color = '#2c3e50';
                  el.style.fontWeight = '500';
                  el.style.fontSize = '13px';
                  el.style.opacity = '1';
                  el.style.textShadow = 'none';
                  el.style.display = 'block';
                  el.style.overflow = 'visible';
                  el.style.whiteSpace = 'normal';
                }
              });
              
              console.log('✅ Booking event styled normally, HTML:', info.el.innerHTML.substring(0, 200));
            }
          }
          
          // Check the HTML structure
          if (info.el) {
            console.log('📍 Event HTML:', info.el.outerHTML.substring(0, 300));
            const style = window.getComputedStyle(info.el);
            console.log('📍 Event computed style:', {
              display: style.display,
              position: style.position,
              width: style.width,
              height: style.height,
              top: style.top,
              left: style.left,
              visibility: style.visibility,
              opacity: style.opacity,
              backgroundColor: style.backgroundColor,
              overflow: style.overflow,
              lineHeight: style.lineHeight,
              minHeight: style.minHeight
            });
            
            // Check parent styles
            const parent = info.el.parentElement;
            const parentStyle = window.getComputedStyle(parent);
            console.log('📍 Parent element:', {
              class: parent.className,
              display: parentStyle.display,
              height: parentStyle.height,
              overflow: parentStyle.overflow,
              visibility: parentStyle.visibility
            });
          }
        },
        
        eventContent: (arg) => {
          // Custom rendering for booking events - show with time
          if (arg.event.extendedProps?.isBooking || arg.event.id?.startsWith('apt_')) {
            console.log('📝 Rendering booking content:', arg.event.title);
            const startTime = arg.event.start ? new Date(arg.event.start).toLocaleTimeString('sl-SI', {hour: '2-digit', minute: '2-digit'}) : '';
            const endTime = arg.event.end ? new Date(arg.event.end).toLocaleTimeString('sl-SI', {hour: '2-digit', minute: '2-digit'}) : '';
            return {
              html: `<div style="padding: 2px; font-size: 12px;">${startTime}${endTime ? ' - ' + endTime : ''}</div>`
            };
          }
          
          // Custom rendering for multi-day events
          if (arg.event.extendedProps?.isMultiDay && arg.event.allDay) {
            return {
              html: `<div style="width: 100%; padding: 4px 6px; white-space: normal; overflow: visible;">${arg.event.title}</div>`
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
          console.log('📅 Dates set - forcing updateSize to maintain height constraint');
          // Force calendar to respect container height limits
          setTimeout(() => {
            if (calendar.updateSize) {
              calendar.updateSize();
            }
            // Ensure container stays constrained
            containerElement.style.maxHeight = '700px';
            containerElement.style.height = '700px';
            containerElement.style.overflow = 'auto';
            containerElement.style.overflowY = 'auto';
            containerElement.style.overflowX = 'clip';
          }, 50);
        },

        viewDidMount: (arg) => {
          console.log('📅 View mounted - applying initial size constraints');
          // On first render, immediately constrain the height
          setTimeout(() => {
            containerElement.style.height = '700px';
            containerElement.style.maxHeight = '700px';
            containerElement.style.overflow = 'auto';
            containerElement.style.overflowY = 'auto';
            containerElement.style.overflowX = 'clip';
            if (calendar.updateSize) {
              calendar.updateSize();
            }
          }, 10);
        },

        // Styling
        nowIndicator: true,
        eventDisplay: 'block',
        height: calendarHeight,
        contentHeight: 'auto'
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
      } catch (renderError) {
        console.error('❌ Error calling calendar.render():', renderError);
        console.error('Error stack:', renderError.stack);
        throw renderError;
      }
      
      // Force container to have proper height and width after rendering
      // Use the responsive heights calculated at initialization
      containerElement.style.width = '100%';
      containerElement.style.maxWidth = '100%';
      containerElement.style.minWidth = '100%';
      containerElement.style.padding = '0';
      containerElement.style.minHeight = window._minCalendarHeight || '500px';
      containerElement.style.height = window._calendarHeight || '700px';
      containerElement.style.boxSizing = 'border-box';
      containerElement.style.visibility = 'visible';
      containerElement.style.overflow = 'visible';
      containerElement.style.display = 'block';
      
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
          
          // Recalculate responsive height
          let newCalendarHeight = '700px';
          let newMinCalendarHeight = '500px';
          if (window.innerWidth < 768) {
            newCalendarHeight = (window.innerHeight - 200) + 'px';
            newMinCalendarHeight = '400px';
          } else if (window.innerWidth < 1024) {
            newCalendarHeight = '600px';
            newMinCalendarHeight = '500px';
          }
          
          // Store new heights
          window._calendarHeight = newCalendarHeight;
          window._minCalendarHeight = newMinCalendarHeight;
          
          // Apply to container
          containerElement.style.minHeight = newMinCalendarHeight;
          containerElement.style.height = newCalendarHeight;
          
          // Apply to FC elements
          const fcView = containerElement.querySelector('.fc');
          if (fcView) {
            fcView.style.height = newCalendarHeight;
            const fcRoot = containerElement.querySelector('.fc-root');
            if (fcRoot) fcRoot.style.height = newCalendarHeight;
            const fcViewHarness = containerElement.querySelector('.fc-view-harness');
            if (fcViewHarness) fcViewHarness.style.height = newCalendarHeight;
          }
          
          // Update calendar size
          if (calendar.updateSize) {
            calendar.updateSize();
          }
          
          console.log('✅ Calendar resized to:', newCalendarHeight);
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
  debugLog('🚀🚀🚀 FUNKCIJA STARTALA 🚀🚀🚀');
  try {
    const appointmentsJSON = localStorage.getItem('appointments');
    debugLog(`📦 localStorage.appointments: ${appointmentsJSON ? appointmentsJSON.substring(0, 100) + '...' : 'PRAZNO'}`);
    
    if (!appointmentsJSON) {
      debugLog('❌ Nema rezervacija za učitavanje (appointments je prazno)');
      return;
    }
    
    const appointments = JSON.parse(appointmentsJSON);
    debugLog(`✓ Parsirao sam JSON: ${appointments.length} termina`);
    
    if (!Array.isArray(appointments) || appointments.length === 0) {
      debugLog('❌ Nema rezervacija - niz je prazan');
      return;
    }
    
    debugLog(`📌 Pronađeno ${appointments.length} rezervacija`);
    appointments.forEach((apt, i) => {
      debugLog(`  [${i}] ${apt.fullName} - ${apt.date} ${apt.time}`);
    });
    
    // Load existing schedule using proper StorageManager method
    const schedule = await StorageManager.load('schedule');
    debugLog(`✓ Učitao sam schedule, trenutno ${schedule.events.length} eventov`);
    
    // Remove old booking events
    const oldCount = schedule.events.length;
    schedule.events = schedule.events.filter(e => !e.id?.startsWith('apt_'));
    debugLog(`✓ Uklonio sam ${oldCount - schedule.events.length} starih termin-eventov`);
    
    // Convert appointments to calendar events
      const appointmentEvents = appointments.map(apt => {
      const startDateTime = apt.date + 'T' + apt.time;
      const startDate = new Date(`${apt.date}T${apt.time}`);
      const endDate = new Date(startDate.getTime() + apt.totalDuration * 60000);
      const endDateTime = endDate.toISOString().slice(0, 16);
      
      return {
        id: 'apt_' + apt.id,
        // Single-line title (FullCalendar may not render newlines reliably)
        title: `🕒 ${apt.fullName} (${apt.totalDuration}min)`,
        type: 'booking',
        start: startDateTime,
        end: endDateTime,
        allDay: false,
        // Don't set inline colors - let CSS handle it via classNames
        display: 'auto',
        editable: false,
        classNames: ['schedule-event', 'event-type-booking', 'event-normal'],
        extendedProps: {
          isBooking: true,
          customer: apt.fullName,
          email: apt.email,
          phone: apt.phone,
          services: apt.services,
          duration: apt.totalDuration,
          price: apt.totalPrice
        }
      };
    });
    
    debugLog(`✓ Konvertovao sam ${appointmentEvents.length} termina u event-e`);
    appointmentEvents.forEach((evt, i) => {
      debugLog(`  [${i}] ${evt.title} - ${evt.start} do ${evt.end}`);
    });
    
    // Add appointment events to schedule
    schedule.events.push(...appointmentEvents);
    debugLog(`✓ Dodao sam u schedule, sad ima ${schedule.events.length} eventov`);
    
    // Save updated schedule using proper StorageManager method
    await StorageManager.save('schedule', schedule);
    debugLog('✓ Sprema schedule u storage');
    
    // IMPORTANT: Don't manually add to calendar with addEvent() 
    // The calendar will re-render from storage and pick them up automatically
    // This prevents duplicates!
    debugLog('✓ Kalendar će se automatski osvežiti sa novim terminima');
    
    // Refresh calendar to pick up newly saved bookings from storage
    if (window.calendar) {
      debugLog('🔄 Osvežavam kalendar...');
      window.calendar.refetchEvents();
      debugLog('✓ Kalendar osvežen');
    }
    
    debugLog(`✅ GOTOVO - Učitano ${appointments.length} rezervacij(a)`);
  } catch (error) {
    debugLog(`❌ GREŠKA: ${error.message}`);
    debugLog(`Stack: ${error.stack}`);
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
